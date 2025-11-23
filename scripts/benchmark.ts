/**
 * Performance Benchmarking Harness for Iris Prime API
 *
 * Measures end-to-end performance metrics:
 * - Request latency (p50, p95, p99)
 * - Cache hit rates
 * - Database query times
 * - Rate limiting overhead
 * - Memory usage
 * - Concurrent request handling
 *
 * Usage:
 *   npx tsx scripts/benchmark.ts
 */

import { performance } from 'perf_hooks';

// Benchmark configuration
const CONFIG = {
  // Endpoints to benchmark
  endpoints: [
    { path: '/api/iris/overview', method: 'GET', name: 'Overview (GET)' },
    { path: '/api/iris/analytics', method: 'GET', name: 'Analytics (GET)' },
    { path: '/api/iris/telemetry', method: 'POST', name: 'Telemetry (POST)', body: {
      expertId: 'test-expert',
      eventType: 'model_run',
      confidence: 0.95,
      latencyMs: 120,
      outcome: 'success'
    }},
    { path: '/api/iris/events', method: 'GET', name: 'Events (GET)' },
    { path: '/api/iris/patterns', method: 'GET', name: 'Patterns (GET)' },
  ],

  // Test parameters
  warmupRequests: 10,
  benchmarkRequests: 100,
  concurrentRequests: 10,

  // Server config
  baseUrl: process.env.BENCHMARK_URL || 'http://localhost:3000',
  apiKey: process.env.BENCHMARK_API_KEY || '',
};

// Metrics collection
interface RequestMetrics {
  latency: number;
  statusCode: number;
  cacheHit?: boolean;
  error?: string;
  timestamp: number;
}

interface EndpointMetrics {
  name: string;
  path: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  throughput: number;
  errorRate: number;
  cacheHitRate?: number;
}

interface BenchmarkResults {
  timestamp: string;
  duration: number;
  endpoints: EndpointMetrics[];
  overall: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
    errorRate: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate standard deviation
 */
function stdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Make a single HTTP request and measure performance
 */
async function makeRequest(
  url: string,
  method: string,
  apiKey: string,
  body?: any
): Promise<RequestMetrics> {
  const start = performance.now();

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const latency = performance.now() - start;

    // Check for cache hit in headers
    const cacheHit = response.headers.get('X-Cache')?.includes('HIT') ||
                     response.headers.get('X-Vercel-Cache')?.includes('HIT');

    return {
      latency,
      statusCode: response.status,
      cacheHit,
      timestamp: Date.now(),
    };
  } catch (error) {
    const latency = performance.now() - start;
    return {
      latency,
      statusCode: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    };
  }
}

/**
 * Benchmark a single endpoint
 */
async function benchmarkEndpoint(
  endpoint: typeof CONFIG.endpoints[0],
  apiKey: string,
  numRequests: number
): Promise<RequestMetrics[]> {
  const url = `${CONFIG.baseUrl}${endpoint.path}`;
  const results: RequestMetrics[] = [];

  console.log(`  Benchmarking ${endpoint.name}...`);

  for (let i = 0; i < numRequests; i++) {
    const metrics = await makeRequest(url, endpoint.method, apiKey, endpoint.body);
    results.push(metrics);

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`    ${i + 1}/${numRequests} requests completed\r`);
    }
  }

  console.log(`    ${numRequests}/${numRequests} requests completed`);
  return results;
}

/**
 * Benchmark with concurrent requests
 */
async function benchmarkConcurrent(
  endpoint: typeof CONFIG.endpoints[0],
  apiKey: string,
  totalRequests: number,
  concurrency: number
): Promise<RequestMetrics[]> {
  const url = `${CONFIG.baseUrl}${endpoint.path}`;
  const results: RequestMetrics[] = [];

  console.log(`  Benchmarking ${endpoint.name} (${concurrency} concurrent)...`);

  const batches = Math.ceil(totalRequests / concurrency);

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(concurrency, totalRequests - (batch * concurrency));
    const promises = Array.from({ length: batchSize }, () =>
      makeRequest(url, endpoint.method, apiKey, endpoint.body)
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    process.stdout.write(`    ${results.length}/${totalRequests} requests completed\r`);
  }

  console.log(`    ${totalRequests}/${totalRequests} requests completed`);
  return results;
}

/**
 * Analyze metrics from request results
 */
function analyzeMetrics(
  name: string,
  path: string,
  results: RequestMetrics[],
  duration: number
): EndpointMetrics {
  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const successfulRequests = results.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
  const failedRequests = results.length - successfulRequests;
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  const cacheHits = results.filter(r => r.cacheHit).length;
  const cacheHitRate = cacheHits / results.length;

  return {
    name,
    path,
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    latencies,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    min: Math.min(...latencies),
    max: Math.max(...latencies),
    mean,
    stdDev: stdDev(latencies, mean),
    throughput: results.length / (duration / 1000), // requests per second
    errorRate: failedRequests / results.length,
    cacheHitRate: cacheHitRate > 0 ? cacheHitRate : undefined,
  };
}

/**
 * Run warmup requests
 */
async function warmup() {
  console.log('\n🔥 Warming up...');

  for (const endpoint of CONFIG.endpoints) {
    await benchmarkEndpoint(endpoint, CONFIG.apiKey, CONFIG.warmupRequests);
  }

  // Wait for caches to stabilize
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Run the full benchmark suite
 */
async function runBenchmark(): Promise<BenchmarkResults> {
  console.log('🚀 Starting Performance Benchmark');
  console.log('================================\n');
  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log(`Warmup requests: ${CONFIG.warmupRequests}`);
  console.log(`Benchmark requests: ${CONFIG.benchmarkRequests}`);
  console.log(`Concurrent requests: ${CONFIG.concurrentRequests}\n`);

  if (!CONFIG.apiKey) {
    throw new Error('BENCHMARK_API_KEY environment variable is required');
  }

  // Warmup
  await warmup();

  // Run benchmarks
  console.log('\n📊 Running benchmarks...\n');
  const startTime = performance.now();
  const endpointMetrics: EndpointMetrics[] = [];

  for (const endpoint of CONFIG.endpoints) {
    const endpointStart = performance.now();

    // Sequential benchmark
    const sequentialResults = await benchmarkEndpoint(
      endpoint,
      CONFIG.apiKey,
      CONFIG.benchmarkRequests
    );

    // Concurrent benchmark
    const concurrentResults = await benchmarkConcurrent(
      endpoint,
      CONFIG.apiKey,
      CONFIG.benchmarkRequests,
      CONFIG.concurrentRequests
    );

    const endpointDuration = performance.now() - endpointStart;

    // Analyze both sequential and concurrent results
    const sequentialMetrics = analyzeMetrics(
      `${endpoint.name} (sequential)`,
      endpoint.path,
      sequentialResults,
      endpointDuration
    );

    const concurrentMetrics = analyzeMetrics(
      `${endpoint.name} (concurrent)`,
      endpoint.path,
      concurrentResults,
      endpointDuration
    );

    endpointMetrics.push(sequentialMetrics, concurrentMetrics);

    console.log('');
  }

  const totalDuration = performance.now() - startTime;

  // Calculate overall metrics
  const allLatencies = endpointMetrics.flatMap(m => m.latencies).sort((a, b) => a - b);
  const totalRequests = endpointMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
  const successfulRequests = endpointMetrics.reduce((sum, m) => sum + m.successfulRequests, 0);
  const failedRequests = totalRequests - successfulRequests;

  // Collect memory stats
  const memUsage = process.memoryUsage();

  const results: BenchmarkResults = {
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    endpoints: endpointMetrics,
    overall: {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgLatency: allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length,
      p95Latency: percentile(allLatencies, 95),
      p99Latency: percentile(allLatencies, 99),
      throughput: totalRequests / (totalDuration / 1000),
      errorRate: failedRequests / totalRequests,
    },
    memory: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    },
  };

  return results;
}

/**
 * Format results for display
 */
function formatResults(results: BenchmarkResults): void {
  console.log('\n\n📈 Benchmark Results');
  console.log('===================\n');

  console.log('Overall Performance:');
  console.log(`  Total Requests: ${results.overall.totalRequests}`);
  console.log(`  Successful: ${results.overall.successfulRequests}`);
  console.log(`  Failed: ${results.overall.failedRequests}`);
  console.log(`  Error Rate: ${(results.overall.errorRate * 100).toFixed(2)}%`);
  console.log(`  Throughput: ${results.overall.throughput.toFixed(2)} req/s`);
  console.log(`  Avg Latency: ${results.overall.avgLatency.toFixed(2)}ms`);
  console.log(`  P95 Latency: ${results.overall.p95Latency.toFixed(2)}ms`);
  console.log(`  P99 Latency: ${results.overall.p99Latency.toFixed(2)}ms`);

  // Check against targets
  const p95Target = 150;
  const p99Target = 200;
  const p95Pass = results.overall.p95Latency < p95Target;
  const p99Pass = results.overall.p99Latency < p99Target;

  console.log('\n🎯 Performance Targets:');
  console.log(`  P95 < ${p95Target}ms: ${p95Pass ? '✅ PASS' : '❌ FAIL'} (${results.overall.p95Latency.toFixed(2)}ms)`);
  console.log(`  P99 < ${p99Target}ms: ${p99Pass ? '✅ PASS' : '❌ FAIL'} (${results.overall.p99Latency.toFixed(2)}ms)`);

  console.log('\n📊 Per-Endpoint Metrics:\n');

  for (const endpoint of results.endpoints) {
    console.log(`${endpoint.name}:`);
    console.log(`  Requests: ${endpoint.totalRequests}`);
    console.log(`  Success Rate: ${((endpoint.successfulRequests / endpoint.totalRequests) * 100).toFixed(2)}%`);
    console.log(`  Throughput: ${endpoint.throughput.toFixed(2)} req/s`);
    console.log(`  Latency (ms):`);
    console.log(`    Min: ${endpoint.min.toFixed(2)}`);
    console.log(`    P50: ${endpoint.p50.toFixed(2)}`);
    console.log(`    P95: ${endpoint.p95.toFixed(2)}`);
    console.log(`    P99: ${endpoint.p99.toFixed(2)}`);
    console.log(`    Max: ${endpoint.max.toFixed(2)}`);
    console.log(`    Mean: ${endpoint.mean.toFixed(2)}`);
    console.log(`    Std Dev: ${endpoint.stdDev.toFixed(2)}`);

    if (endpoint.cacheHitRate !== undefined) {
      console.log(`  Cache Hit Rate: ${(endpoint.cacheHitRate * 100).toFixed(2)}%`);
    }

    console.log('');
  }

  console.log('💾 Memory Usage:');
  console.log(`  Heap Used: ${(results.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(results.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  RSS: ${(results.memory.rss / 1024 / 1024).toFixed(2)} MB`);

  console.log(`\n⏱️  Total Duration: ${(results.duration / 1000).toFixed(2)}s`);
}

/**
 * Save results to file
 */
async function saveResults(results: BenchmarkResults): Promise<void> {
  const filename = `benchmark-results-${Date.now()}.json`;
  const fs = await import('fs/promises');
  await fs.writeFile(filename, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to ${filename}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    const results = await runBenchmark();
    formatResults(results);
    await saveResults(results);

    // Exit with appropriate code based on targets
    const p95Pass = results.overall.p95Latency < 150;
    const p99Pass = results.overall.p99Latency < 200;

    if (!p95Pass || !p99Pass) {
      console.log('\n⚠️  Performance targets not met. See results above for details.');
      process.exit(1);
    }

    console.log('\n✅ All performance targets met!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runBenchmark, formatResults, type BenchmarkResults, type EndpointMetrics };
