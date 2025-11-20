/**
 * Test script for E2B code execution integration
 *
 * Run with: npx tsx examples/test-e2b-execution.ts
 */

import { getExecutor } from '../lib/e2b-executor';
import { examples } from './e2b-execution-examples';

async function testBasicExecution() {
  console.log('\n=== Test 1: Basic Code Execution ===\n');

  const executor = getExecutor({
    apiKey: process.env.E2B_API_KEY,
  });

  const simpleCode = `
    console.log('Hello from E2B sandbox!');
    console.log('Node version:', process.version);
    return { success: true, message: 'Test passed' };
  `;

  const result = await executor.executeCode(simpleCode, {
    projectId: 'test-project',
  });

  console.log('Success:', result.success);
  console.log('Output:', result.output);
  console.log('Execution time:', result.executionTime, 'ms');
}

async function testIrisPatternDiscovery() {
  console.log('\n=== Test 2: IRIS Pattern Discovery ===\n');

  const executor = getExecutor();

  const result = await executor.executeCode(examples.patternDiscovery, {
    projectId: 'test-project',
    sessionId: 'test-session-' + Date.now(),
  });

  console.log('Success:', result.success);
  if (result.success) {
    console.log('Output:', result.output);
  } else {
    console.error('Error:', result.error);
  }
  console.log('Execution time:', result.executionTime, 'ms');
}

async function testIrisReflexion() {
  console.log('\n=== Test 3: IRIS Reflexion ===\n');

  const executor = getExecutor();

  const result = await executor.executeCode(examples.reflexion, {
    projectId: 'test-project',
    sessionId: 'test-session-' + Date.now(),
  });

  console.log('Success:', result.success);
  console.log('Output:', result.output);
  console.log('Execution time:', result.executionTime, 'ms');
}

async function testIrisConsensus() {
  console.log('\n=== Test 4: IRIS Multi-Agent Consensus ===\n');

  const executor = getExecutor();

  const result = await executor.executeCode(examples.consensus, {
    projectId: 'test-project',
    sessionId: 'consensus-' + Date.now(),
  });

  console.log('Success:', result.success);
  console.log('Output:', result.output);
  console.log('Execution time:', result.executionTime, 'ms');
}

async function testSandboxReuse() {
  console.log('\n=== Test 5: Sandbox Reuse ===\n');

  const executor = getExecutor();

  // First execution - creates sandbox
  console.log('First execution (cold start)...');
  const result1 = await executor.executeCode(
    'console.log("First execution")',
    {
      projectId: 'test-project',
      sandboxId: 'test-reuse',
    }
  );
  console.log('First execution time:', result1.executionTime, 'ms');

  // Second execution - reuses sandbox
  console.log('\nSecond execution (warm start)...');
  const result2 = await executor.executeCode(
    'console.log("Second execution")',
    {
      projectId: 'test-project',
      sandboxId: 'test-reuse',
    }
  );
  console.log('Second execution time:', result2.executionTime, 'ms');

  // Cleanup
  await executor.closeSandbox('test-reuse');
  console.log('Sandbox closed');
}

async function testErrorHandling() {
  console.log('\n=== Test 6: Error Handling ===\n');

  const executor = getExecutor();

  const errorCode = `
    throw new Error('Intentional test error');
  `;

  const result = await executor.executeCode(errorCode, {
    projectId: 'test-project',
  });

  console.log('Success:', result.success);
  console.log('Error captured:', !!result.error);
  if (result.error) {
    console.log('Error message:', result.error.message);
    console.log('Error name:', result.error.name);
  }
}

async function testCompleteWorkflow() {
  console.log('\n=== Test 7: Complete IRIS Workflow ===\n');

  const executor = getExecutor();

  const result = await executor.executeCode(examples.completeWorkflow, {
    projectId: 'test-project',
    sessionId: 'workflow-' + Date.now(),
    context: {
      environment: 'testing',
      testRun: true,
    },
  });

  console.log('Success:', result.success);
  console.log('Output:', result.output);
  console.log('Execution time:', result.executionTime, 'ms');
}

async function testApiEndpoint() {
  console.log('\n=== Test 8: API Endpoint ===\n');

  const apiKey = process.env.IRIS_API_KEY;
  if (!apiKey) {
    console.log('Skipping - IRIS_API_KEY not set');
    return;
  }

  const apiUrl = process.env.IRIS_API_URL || 'http://localhost:3000';

  const response = await fetch(`${apiUrl}/api/iris/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: 'console.log("Hello from API!"); return { test: true };',
      projectId: 'test-project',
    }),
  });

  const result = await response.json();
  console.log('API Response:', JSON.stringify(result, null, 2));
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   IRIS E2B Integration Test Suite           ║');
  console.log('╚════════════════════════════════════════════════════╝');

  const tests = [
    testBasicExecution,
    testIrisPatternDiscovery,
    testIrisReflexion,
    testIrisConsensus,
    testSandboxReuse,
    testErrorHandling,
    testCompleteWorkflow,
    testApiEndpoint,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
      console.log('✅ Test passed\n');
    } catch (error) {
      failed++;
      console.error('❌ Test failed:', error);
      console.error('');
    }
  }

  console.log('╔════════════════════════════════════════════════════╗');
  console.log(`║   Test Results: ${passed} passed, ${failed} failed             ║`);
  console.log('╚════════════════════════════════════════════════════╝');

  // Cleanup
  const executor = getExecutor();
  await executor.closeAll();
  console.log('\nAll sandboxes closed');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
