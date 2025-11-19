/**
 * E2B Code Execution Examples for IRIS Prime
 *
 * Demonstrates how to use the E2B integration for executing
 * IRIS Prime code in sandboxes.
 */

// Example 1: Simple pattern discovery
const patternDiscoveryExample = `
import { iris, projectId, sessionId } from './iris-prime';

async function discoverUserPatterns() {
  console.log('Discovering patterns for project:', projectId);

  const patterns = await iris.discoverPatterns({
    minSupport: 0.3,
    minConfidence: 0.7,
    maxPatterns: 10
  });

  console.log('Found patterns:', patterns);
  return patterns;
}

await discoverUserPatterns();
`;

// Example 2: Reflexion and self-improvement
const reflexionExample = `
import { iris } from './iris-prime';

async function evaluateResponse() {
  const input = "What is the capital of France?";
  const output = "Paris";

  const evaluation = await iris.evaluateOutput(input, output, 'correct');

  console.log('Evaluation result:', evaluation);

  // Log the evaluation as telemetry
  await iris.logEvent('reflexion_evaluated', {
    verdict: 'correct',
    confidence: 0.95
  });

  return evaluation;
}

await evaluateResponse();
`;

// Example 3: Multi-agent consensus
const consensusExample = `
import { iris, sessionId } from './iris-prime';

async function multiAgentDecision() {
  const consensusId = sessionId || 'consensus-' + Date.now();
  const agents = ['agent-1', 'agent-2', 'agent-3'];

  // Each agent submits their vote
  for (const agentId of agents) {
    const vote = Math.random() > 0.5 ? 'approve' : 'reject';
    await iris.submitVote(consensusId, agentId, vote);
    console.log(\`\${agentId} voted: \${vote}\`);
  }

  console.log('Consensus voting complete for:', consensusId);
}

await multiAgentDecision();
`;

// Example 4: Prompt registry and lineage tracking
const promptLineageExample = `
import { iris } from './iris-prime';

async function trackPromptEvolution() {
  // Save a prompt template
  const promptName = 'code-review-prompt';
  const template = 'Review the following code for {language}: {code}';

  await iris.savePrompt(promptName, template, ['language', 'code']);
  console.log('Prompt saved:', promptName);

  // Retrieve and use the prompt
  const prompt = await iris.getPrompt(promptName);
  console.log('Retrieved prompt:', prompt);

  // Track lineage of prompt usage
  await iris.trackLineage(
    'code-review',
    { language: 'TypeScript', code: 'const x = 1;' },
    { review: 'Looks good', score: 0.9 }
  );

  console.log('Lineage tracked');
}

await trackPromptEvolution();
`;

// Example 5: Global metrics and telemetry
const metricsExample = `
import { iris, context } from './iris-prime';

async function recordSystemMetrics() {
  // Record various metrics
  await iris.recordMetric('execution_time', 150, {
    operation: 'pattern_discovery'
  });

  await iris.recordMetric('memory_usage', 256, {
    unit: 'mb'
  });

  await iris.recordMetric('api_calls', 10, {
    endpoint: 'patterns'
  });

  // Log complex telemetry event
  await iris.logEvent('workflow_completed', {
    workflowId: context.workflowId || 'unknown',
    duration: 2500,
    steps: 5,
    success: true
  });

  console.log('Metrics recorded successfully');
}

await recordSystemMetrics();
`;

// Example 6: Complete workflow combining multiple features
const completeWorkflowExample = `
import { iris, projectId, sessionId, context } from './iris-prime';

async function completeWorkflow() {
  console.log('Starting IRIS Prime workflow');
  console.log('Project:', projectId);
  console.log('Session:', sessionId);

  // Step 1: Discover patterns from historical data
  const patterns = await iris.discoverPatterns({
    minSupport: 0.4,
    minConfidence: 0.8
  });
  console.log('1. Patterns discovered:', patterns.length);

  // Step 2: Use a prompt template
  await iris.savePrompt(
    'analysis-prompt',
    'Analyze {data} with focus on {aspect}',
    ['data', 'aspect']
  );
  const prompt = await iris.getPrompt('analysis-prompt');
  console.log('2. Prompt template ready');

  // Step 3: Execute analysis and evaluate
  const analysisResult = {
    data: patterns,
    insights: ['Pattern A occurs frequently', 'Pattern B is emerging']
  };

  await iris.evaluateOutput(
    JSON.stringify(patterns),
    JSON.stringify(analysisResult),
    'correct'
  );
  console.log('3. Analysis evaluated');

  // Step 4: Multi-agent consensus on findings
  const consensusId = 'workflow-' + Date.now();
  for (let i = 1; i <= 3; i++) {
    await iris.submitVote(consensusId, \`agent-\${i}\`, 'approve');
  }
  console.log('4. Consensus achieved');

  // Step 5: Track complete lineage
  await iris.trackLineage(
    'pattern-analysis-workflow',
    { patterns, prompt },
    { result: analysisResult, consensus: consensusId }
  );
  console.log('5. Lineage tracked');

  // Step 6: Record final metrics
  await iris.recordMetric('workflow_success', 1, {
    workflowType: 'pattern-analysis',
    patternsFound: patterns.length
  });

  await iris.logEvent('workflow_completed', {
    consensusId,
    patternsAnalyzed: patterns.length,
    success: true
  });

  console.log('Workflow completed successfully!');

  // Cleanup
  await iris.close();

  return {
    success: true,
    patterns: patterns.length,
    consensusId
  };
}

await completeWorkflow();
`;

// Export examples for use in tests
export const examples = {
  patternDiscovery: patternDiscoveryExample,
  reflexion: reflexionExample,
  consensus: consensusExample,
  promptLineage: promptLineageExample,
  metrics: metricsExample,
  completeWorkflow: completeWorkflowExample,
};

// Example API usage
export async function executeExample(apiKey: string, exampleCode: string) {
  const response = await fetch('https://api.iris-prime.com/api/iris/execute', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: exampleCode,
      context: {
        workflowId: 'example-workflow',
        environment: 'development',
      },
    }),
  });

  const result = await response.json();
  return result;
}
