/**
 * Optimization API Examples
 *
 * This file demonstrates how to use the Optimization Runs API endpoints.
 * Run these examples against your deployed API or local development server.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.IRIS_API_KEY || 'sk_live_your_api_key_here';

// Helper function for API requests
async function apiRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`\n${method} ${url}`);
  const startTime = Date.now();

  const response = await fetch(url, options);
  const data = await response.json();

  const latency = Date.now() - startTime;
  console.log(`Status: ${response.status}`);
  console.log(`Latency: ${latency}ms`);
  console.log(`X-Response-Time: ${response.headers.get('X-Response-Time')}`);
  console.log(`X-RateLimit-Remaining: ${response.headers.get('X-RateLimit-Remaining')}`);

  if (!response.ok) {
    console.error('Error:', data);
    throw new Error(`API error: ${response.status}`);
  }

  return data;
}

// Example 1: Create a new optimization run
async function example1_CreateRun() {
  console.log('\n=== Example 1: Create Optimization Run ===');

  const runData = {
    run_name: 'Bayesian Optimization - Learning Rate',
    optimizer_type: 'bayesian',
    config: {
      max_iterations: 100,
      initial_points: 5,
      acquisition_function: 'ei',
      kappa: 2.576,
    },
    search_space: {
      learning_rate: {
        type: 'float',
        min: 0.0001,
        max: 0.1,
        log: true,
      },
      batch_size: {
        type: 'int',
        min: 16,
        max: 128,
        step: 16,
      },
    },
    metadata: {
      model: 'resnet50',
      dataset: 'imagenet',
      framework: 'pytorch',
    },
  };

  const result = await apiRequest('/api/iris/optimization/runs', 'POST', runData);
  console.log('Created run:', result.run.id);

  return result.run.id;
}

// Example 2: Add iterations to a run
async function example2_AddIterations(runId: string) {
  console.log('\n=== Example 2: Add Iterations ===');

  const iterations = [
    { learning_rate: 0.001, batch_size: 32, score: 0.75 },
    { learning_rate: 0.01, batch_size: 64, score: 0.82 },
    { learning_rate: 0.0001, batch_size: 16, score: 0.68 },
    { learning_rate: 0.005, batch_size: 48, score: 0.87 },
    { learning_rate: 0.002, batch_size: 32, score: 0.91 },
  ];

  for (let i = 0; i < iterations.length; i++) {
    const iter = iterations[i];

    const iterationData = {
      iteration_number: i + 1,
      params: {
        learning_rate: iter.learning_rate,
        batch_size: iter.batch_size,
      },
      score: iter.score,
      metrics: {
        accuracy: iter.score,
        loss: 1 - iter.score,
        f1_score: iter.score * 0.95,
      },
      duration_ms: Math.floor(Math.random() * 5000) + 2000,
      metadata: {
        gpu_usage: `${Math.floor(Math.random() * 30) + 70}%`,
        memory_mb: Math.floor(Math.random() * 2048) + 2048,
      },
    };

    await apiRequest(
      `/api/iris/optimization/runs/${runId}/iterations`,
      'POST',
      iterationData
    );

    console.log(`Added iteration ${i + 1}`);

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Example 3: Get run details with iterations
async function example3_GetRun(runId: string) {
  console.log('\n=== Example 3: Get Run Details ===');

  const result = await apiRequest(`/api/iris/optimization/runs/${runId}`, 'GET');

  console.log('Run:', {
    id: result.run.id,
    name: result.run.run_name,
    status: result.run.status,
    iterations: result.iterations.length,
  });

  console.log('Stats:', result.stats);

  return result;
}

// Example 4: Update run to completed
async function example4_CompleteRun(runId: string) {
  console.log('\n=== Example 4: Complete Run ===');

  const updateData = {
    status: 'completed',
    final_score: 0.91,
    best_params: {
      learning_rate: 0.002,
      batch_size: 32,
    },
    duration_ms: 125000,
    completed_at: new Date().toISOString(),
  };

  const result = await apiRequest(
    `/api/iris/optimization/runs/${runId}`,
    'PATCH',
    updateData
  );

  console.log('Updated run:', result.run.status);
}

// Example 5: List runs with filtering
async function example5_ListRuns() {
  console.log('\n=== Example 5: List Runs ===');

  // List completed runs, sorted by score
  const result = await apiRequest(
    '/api/iris/optimization/runs?status=completed&order_by=final_score&limit=10',
    'GET'
  );

  console.log(`Found ${result.pagination.total} runs`);
  console.log('Top runs:');

  result.runs.slice(0, 5).forEach((run: any, i: number) => {
    console.log(`  ${i + 1}. ${run.run_name || run.id} - Score: ${run.final_score}`);
  });
}

// Example 6: Get aggregated statistics
async function example6_GetStats() {
  console.log('\n=== Example 6: Get Statistics ===');

  const result = await apiRequest('/api/iris/optimization/stats', 'GET');

  console.log('Overall Statistics:');
  console.log(`  Total Runs: ${result.statistics.totalRuns}`);
  console.log(`  Success Rate: ${result.statistics.successRate}%`);
  console.log(`  Avg Improvement: ${result.statistics.averageImprovement}`);
  console.log(`  Avg Duration: ${result.statistics.averageDuration}ms`);

  console.log('\nBy Status:');
  Object.entries(result.byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\nBy Optimizer Type:');
  result.byOptimizerType.forEach((opt: any) => {
    console.log(`  ${opt.optimizerType}: ${opt.count} runs, ${opt.successRate}% success rate`);
  });
}

// Example 7: Performance test
async function example7_PerformanceTest() {
  console.log('\n=== Example 7: Performance Test ===');

  const iterations = 10;
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    await apiRequest('/api/iris/optimization/runs?limit=10', 'GET');
    const latency = Date.now() - startTime;
    latencies.push(latency);

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(iterations * 0.5)];
  const p95 = latencies[Math.floor(iterations * 0.95)];
  const p99 = latencies[Math.floor(iterations * 0.99)];
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log('Performance Metrics:');
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  p50: ${p50}ms`);
  console.log(`  p95: ${p95}ms`);
  console.log(`  p99: ${p99}ms`);
  console.log(`  Target: p99 < 200ms - ${p99 < 200 ? '✅ PASS' : '❌ FAIL'}`);
}

// Example 8: Test caching with ETag
async function example8_TestCaching(runId: string) {
  console.log('\n=== Example 8: Test Caching ===');

  // First request
  const url = `${API_BASE_URL}/api/iris/optimization/runs/${runId}`;
  const response1 = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  const etag = response1.headers.get('ETag');
  console.log('First request - ETag:', etag);

  // Second request with If-None-Match
  const response2 = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'If-None-Match': etag || '',
    },
  });

  console.log('Second request - Status:', response2.status);
  console.log('Cache hit:', response2.status === 304 ? '✅ YES' : '❌ NO');
}

// Main execution
async function main() {
  console.log('=== Optimization API Examples ===');
  console.log(`API Base URL: ${API_BASE_URL}`);

  try {
    // Run examples sequentially
    const runId = await example1_CreateRun();
    await example2_AddIterations(runId);
    await example3_GetRun(runId);
    await example4_CompleteRun(runId);
    await example5_ListRuns();
    await example6_GetStats();
    await example7_PerformanceTest();
    await example8_TestCaching(runId);

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  example1_CreateRun,
  example2_AddIterations,
  example3_GetRun,
  example4_CompleteRun,
  example5_ListRuns,
  example6_GetStats,
  example7_PerformanceTest,
  example8_TestCaching,
};
