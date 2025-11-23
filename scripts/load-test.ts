/**
 * Load Testing Script for Iris Prime API
 *
 * Simulates realistic traffic patterns with:
 * - Gradual ramp-up of concurrent users
 * - Mix of read and write operations
 * - Realistic think time between requests
 * - Error tracking and reporting
 *
 * Usage:
 *   npx tsx scripts/load-test.ts [scenario]
 *
 * Scenarios:
 *   smoke   - 1 VU for 30s (sanity check)
 *   load    - 10-50 VUs for 5m (typical load)
 *   stress  - 50-200 VUs for 10m (stress test)
 *   spike   - Sudden spike to 500 VUs (spike test)
 */

import { performance } from 'perf_hooks';

// Load test configuration
interface LoadTestConfig {
  name: string;
  description: string;
  stages: LoadStage[];
  thinkTime: {
    min: number; // ms
    max: number; // ms
  };
}

interface LoadStage {
  duration: number; // seconds
  target: number; // concurrent virtual users
}

interface VirtualUser {
  id: number;
  requestCount: number;
  errorCount: number;
  totalLatency: number;
  active: boolean;
}

interface LoadTestResults {
  scenario: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  errors: Record<string, number>;
  statusCodes: Record<number, number>;
}

// Test scenarios
const SCENARIOS: Record<string, LoadTestConfig> = {
  smoke: {
    name: 'Smoke Test',
    description: 'Minimal load to verify system works',
    stages: [
      { duration: 30, target: 1 },
    ],
    thinkTime: { min: 1000, max: 2000 },
  },
  load: {
    name: 'Load Test',
    description: 'Typical production load',
    stages: [
      { duration: 60, target: 10 },  // Ramp up to 10 users
      { duration: 180, target: 30 }, // Maintain 30 users
      { duration: 120, target: 50 }, // Increase to 50 users
      { duration: 60, target: 0 },   // Ramp down
    ],
    thinkTime: { min: 500, max: 2000 },
  },
  stress: {
    name: 'Stress Test',
    description: 'Push system to limits',
    stages: [
      { duration: 60, target: 50 },   // Ramp up to 50
      { duration: 180, target: 100 }, // Maintain 100
      { duration: 180, target: 150 }, // Increase to 150
      { duration: 180, target: 200 }, // Push to 200
      { duration: 60, target: 0 },    // Ramp down
    ],
    thinkTime: { min: 100, max: 500 },
  },
  spike: {
    name: 'Spike Test',
    description: 'Sudden traffic spike',
    stages: [
      { duration: 60, target: 10 },   // Normal load
      { duration: 30, target: 500 },  // Sudden spike!
      { duration: 60, target: 10 },   // Back to normal
      { duration: 30, target: 0 },    // Ramp down
    ],
    thinkTime: { min: 100, max: 500 },
  },
};

// API endpoints to test (weighted by typical usage)
const ENDPOINTS = [
  { path: '/api/iris/overview', method: 'GET', weight: 30 },
  { path: '/api/iris/analytics', method: 'GET', weight: 20 },
  { path: '/api/iris/events', method: 'GET', weight: 15 },
  { path: '/api/iris/patterns', method: 'GET', weight: 10 },
  { path: '/api/iris/reflexion', method: 'GET', weight: 10 },
  {
    path: '/api/iris/telemetry',
    method: 'POST',
    weight: 15,
    body: {
      expertId: 'load-test-expert',
      eventType: 'model_run',
      confidence: 0.95,
      latencyMs: 120,
      outcome: 'success',
    },
  },
];

// Configuration
const CONFIG = {
  baseUrl: process.env.LOAD_TEST_URL || 'http://localhost:3000',
  apiKey: process.env.LOAD_TEST_API_KEY || '',
  timeout: 30000, // 30s timeout
};

/**
 * Select a random endpoint based on weights
 */
function selectEndpoint(): typeof ENDPOINTS[0] {
  const totalWeight = ENDPOINTS.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;

  for (const endpoint of ENDPOINTS) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }

  return ENDPOINTS[0];
}

/**
 * Random sleep based on think time
 */
function sleep(min: number, max: number): Promise<void> {
  const duration = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, duration));
}

/**
 * Make a single HTTP request
 */
async function makeRequest(endpoint: typeof ENDPOINTS[0], apiKey: string): Promise<{
  latency: number;
  statusCode: number;
  error?: string;
}> {
  const url = `${CONFIG.baseUrl}${endpoint.path}`;
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const latency = performance.now() - start;

    return {
      latency,
      statusCode: response.status,
    };
  } catch (error) {
    const latency = performance.now() - start;
    return {
      latency,
      statusCode: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Virtual user behavior
 */
async function runVirtualUser(
  vu: VirtualUser,
  config: LoadTestConfig,
  apiKey: string,
  results: {
    latencies: number[];
    errors: Map<string, number>;
    statusCodes: Map<number, number>;
  }
): Promise<void> {
  while (vu.active) {
    // Select random endpoint
    const endpoint = selectEndpoint();

    // Make request
    const result = await makeRequest(endpoint, apiKey);

    // Track metrics
    vu.requestCount++;
    vu.totalLatency += result.latency;
    results.latencies.push(result.latency);

    // Track status codes
    results.statusCodes.set(
      result.statusCode,
      (results.statusCodes.get(result.statusCode) || 0) + 1
    );

    // Track errors
    if (result.statusCode >= 400 || result.error) {
      vu.errorCount++;
      const errorKey = result.error || `HTTP ${result.statusCode}`;
      results.errors.set(errorKey, (results.errors.get(errorKey) || 0) + 1);
    }

    // Think time
    if (vu.active) {
      await sleep(config.thinkTime.min, config.thinkTime.max);
    }
  }
}

/**
 * Run a load test scenario
 */
async function runLoadTest(scenario: LoadTestConfig): Promise<LoadTestResults> {
  console.log(`\n🚀 Starting ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  console.log(`   Base URL: ${CONFIG.baseUrl}\n`);

  if (!CONFIG.apiKey) {
    throw new Error('LOAD_TEST_API_KEY environment variable is required');
  }

  const virtualUsers = new Map<number, VirtualUser>();
  const results = {
    latencies: [] as number[],
    errors: new Map<string, number>(),
    statusCodes: new Map<number, number>(),
  };

  let nextUserId = 1;
  const startTime = performance.now();

  // Process each stage
  for (let stageIdx = 0; stageIdx < scenario.stages.length; stageIdx++) {
    const stage = scenario.stages[stageIdx];
    const currentVUs = virtualUsers.size;

    console.log(`\n📊 Stage ${stageIdx + 1}/${scenario.stages.length}:`);
    console.log(`   Duration: ${stage.duration}s`);
    console.log(`   Target VUs: ${stage.target} (current: ${currentVUs})`);

    const startVUs = currentVUs;
    const targetVUs = stage.target;
    const stageStartTime = Date.now();
    const stageDuration = stage.duration * 1000;

    // Gradually adjust VU count during stage
    const adjustmentInterval = setInterval(() => {
      const elapsed = Date.now() - stageStartTime;
      const progress = Math.min(elapsed / stageDuration, 1);
      const currentTarget = Math.round(startVUs + (targetVUs - startVUs) * progress);

      // Add VUs if below target
      while (virtualUsers.size < currentTarget) {
        const vu: VirtualUser = {
          id: nextUserId++,
          requestCount: 0,
          errorCount: 0,
          totalLatency: 0,
          active: true,
        };

        virtualUsers.set(vu.id, vu);

        // Start VU in background
        runVirtualUser(vu, scenario, CONFIG.apiKey, results).catch(err => {
          console.error(`VU ${vu.id} error:`, err);
        });
      }

      // Remove VUs if above target
      while (virtualUsers.size > currentTarget) {
        const [firstId, firstVU] = virtualUsers.entries().next().value;
        firstVU.active = false;
        virtualUsers.delete(firstId);
      }

      // Progress update
      const totalRequests = results.latencies.length;
      const activeVUs = Array.from(virtualUsers.values()).filter(vu => vu.active).length;

      process.stdout.write(
        `   VUs: ${activeVUs}/${currentTarget} | ` +
        `Requests: ${totalRequests} | ` +
        `Errors: ${results.errors.size} | ` +
        `Elapsed: ${Math.floor(elapsed / 1000)}s/${stage.duration}s\r`
      );
    }, 500);

    // Wait for stage to complete
    await new Promise(resolve => setTimeout(resolve, stageDuration));

    clearInterval(adjustmentInterval);
    console.log(''); // New line after progress
  }

  // Stop all VUs
  for (const vu of virtualUsers.values()) {
    vu.active = false;
  }

  // Wait for VUs to finish their current requests
  await new Promise(resolve => setTimeout(resolve, 5000));

  const totalDuration = performance.now() - startTime;

  // Calculate final metrics
  const sortedLatencies = results.latencies.sort((a, b) => a - b);
  const totalRequests = results.latencies.length;
  const successfulRequests = totalRequests - Array.from(results.errors.values()).reduce((a, b) => a + b, 0);
  const failedRequests = totalRequests - successfulRequests;

  const p95Index = Math.ceil(0.95 * sortedLatencies.length) - 1;
  const p99Index = Math.ceil(0.99 * sortedLatencies.length) - 1;

  const finalResults: LoadTestResults = {
    scenario: scenario.name,
    duration: totalDuration,
    totalRequests,
    successfulRequests,
    failedRequests,
    requestsPerSecond: totalRequests / (totalDuration / 1000),
    avgLatency: sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length,
    p95Latency: sortedLatencies[p95Index] || 0,
    p99Latency: sortedLatencies[p99Index] || 0,
    errorRate: failedRequests / totalRequests,
    errors: Object.fromEntries(results.errors),
    statusCodes: Object.fromEntries(results.statusCodes),
  };

  return finalResults;
}

/**
 * Format and display results
 */
function displayResults(results: LoadTestResults): void {
  console.log('\n\n📈 Load Test Results');
  console.log('===================\n');

  console.log(`Scenario: ${results.scenario}`);
  console.log(`Duration: ${(results.duration / 1000).toFixed(2)}s\n`);

  console.log('Request Statistics:');
  console.log(`  Total Requests: ${results.totalRequests}`);
  console.log(`  Successful: ${results.successfulRequests}`);
  console.log(`  Failed: ${results.failedRequests}`);
  console.log(`  Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);
  console.log(`  Throughput: ${results.requestsPerSecond.toFixed(2)} req/s\n`);

  console.log('Latency Statistics (ms):');
  console.log(`  Average: ${results.avgLatency.toFixed(2)}`);
  console.log(`  P95: ${results.p95Latency.toFixed(2)}`);
  console.log(`  P99: ${results.p99Latency.toFixed(2)}\n`);

  // Performance assessment
  const p95Target = 150;
  const p99Target = 200;
  const p95Pass = results.p95Latency < p95Target;
  const p99Pass = results.p99Latency < p99Target;

  console.log('🎯 Performance Assessment:');
  console.log(`  P95 < ${p95Target}ms: ${p95Pass ? '✅ PASS' : '❌ FAIL'} (${results.p95Latency.toFixed(2)}ms)`);
  console.log(`  P99 < ${p99Target}ms: ${p99Pass ? '✅ PASS' : '❌ FAIL'} (${results.p99Latency.toFixed(2)}ms)`);

  if (results.errorRate > 0.01) {
    console.log(`  Error Rate < 1%: ❌ FAIL (${(results.errorRate * 100).toFixed(2)}%)`);
  } else {
    console.log(`  Error Rate < 1%: ✅ PASS (${(results.errorRate * 100).toFixed(2)}%)`);
  }

  console.log('\nHTTP Status Codes:');
  for (const [code, count] of Object.entries(results.statusCodes).sort(([a], [b]) => parseInt(a) - parseInt(b))) {
    console.log(`  ${code}: ${count}`);
  }

  if (Object.keys(results.errors).length > 0) {
    console.log('\nErrors:');
    for (const [error, count] of Object.entries(results.errors)) {
      console.log(`  ${error}: ${count}`);
    }
  }
}

/**
 * Save results to file
 */
async function saveResults(results: LoadTestResults): Promise<void> {
  const filename = `load-test-${results.scenario.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
  const fs = await import('fs/promises');
  await fs.writeFile(filename, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to ${filename}`);
}

/**
 * Main execution
 */
async function main() {
  const scenarioName = process.argv[2] || 'smoke';
  const scenario = SCENARIOS[scenarioName];

  if (!scenario) {
    console.error(`Unknown scenario: ${scenarioName}`);
    console.error(`Available scenarios: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(1);
  }

  try {
    const results = await runLoadTest(scenario);
    displayResults(results);
    await saveResults(results);

    // Exit with appropriate code
    const p95Pass = results.p95Latency < 150;
    const p99Pass = results.p99Latency < 200;
    const errorRatePass = results.errorRate < 0.01;

    if (!p95Pass || !p99Pass || !errorRatePass) {
      console.log('\n⚠️  Performance targets not met. See results above.');
      process.exit(1);
    }

    console.log('\n✅ All performance targets met!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Load test failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runLoadTest, SCENARIOS, type LoadTestResults };
