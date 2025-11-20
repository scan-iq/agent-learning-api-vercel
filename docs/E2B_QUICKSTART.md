# E2B Code Execution - Quick Start Guide

Get started with IRIS code execution in E2B sandboxes in 5 minutes.

## Prerequisites

- Node.js 18+
- IRIS API key
- E2B API key (get from https://e2b.dev)

## 1. Setup Environment

```bash
# Create .env file
cat > .env << EOF
E2B_API_KEY=your_e2b_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
EOF
```

## 2. Install Dependencies

```bash
npm install @e2b/code-interpreter @modelcontextprotocol/sdk
```

## 3. Basic Usage

### Simple Code Execution

```typescript
import { getExecutor } from '@iris-prime/api';

const executor = getExecutor({
  apiKey: process.env.E2B_API_KEY,
});

const result = await executor.executeCode(`
  console.log('Hello from IRIS!');
  return { success: true };
`);

console.log(result.output);
```

### Using IRIS Tools

```typescript
const code = `
import { iris } from './iris-prime';

// Discover patterns
const patterns = await iris.discoverPatterns({
  minSupport: 0.3,
  minConfidence: 0.7
});

console.log('Found', patterns.length, 'patterns');

// Cleanup
await iris.close();
`;

const result = await executor.executeCode(code, {
  projectId: 'my-project',
});
```

## 4. API Endpoint Usage

### POST /api/iris/execute

```bash
curl -X POST https://api.iris-prime.com/api/iris/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "import { iris } from \"./iris-prime\";\n\nconst patterns = await iris.discoverPatterns();\nconsole.log(patterns);",
    "projectId": "my-project"
  }'
```

### Response

```json
{
  "success": true,
  "result": {
    "success": true,
    "output": "Found 5 patterns\n[pattern details...]",
    "executionTime": 1250,
    "logs": ["Starting...", "Complete!"],
    "metadata": {
      "sandboxId": "sb_abc123",
      "projectId": "my-project",
      "timestamp": "2025-11-17T12:00:00Z"
    }
  },
  "sandboxId": "sb_abc123",
  "timestamp": "2025-11-17T12:00:00Z"
}
```

## 5. Common Use Cases

### Pattern Discovery

```typescript
const result = await executor.executeCode(`
  import { iris } from './iris-prime';

  const patterns = await iris.discoverPatterns({
    minSupport: 0.4,
    minConfidence: 0.8,
    maxPatterns: 10
  });

  console.log('Discovered patterns:', patterns);
  await iris.close();
`);
```

### Reflexion & Self-Improvement

```typescript
const result = await executor.executeCode(`
  import { iris } from './iris-prime';

  const evaluation = await iris.evaluateOutput(
    "What is 2+2?",
    "4",
    "correct"
  );

  console.log('Evaluation:', evaluation);
  await iris.close();
`);
```

### Multi-Agent Consensus

```typescript
const result = await executor.executeCode(`
  import { iris, sessionId } from './iris-prime';

  const consensusId = sessionId || 'consensus-001';
  const agents = ['agent-1', 'agent-2', 'agent-3'];

  for (const agent of agents) {
    await iris.submitVote(consensusId, agent, 'approve');
  }

  console.log('Consensus achieved');
  await iris.close();
`);
```

## 6. Advanced Features

### Sandbox Reuse (Faster Execution)

```typescript
// First execution - creates sandbox
const result1 = await executor.executeCode(code1, {
  sandboxId: 'my-session',
});

// Subsequent executions - reuse sandbox (10x faster)
const result2 = await executor.executeCode(code2, {
  sandboxId: 'my-session',
});

// Cleanup when done
await executor.closeSandbox('my-session');
```

### Custom Context

```typescript
const result = await executor.executeCode(`
  import { context } from './iris-prime';

  console.log('User ID:', context.userId);
  console.log('Environment:', context.environment);
`, {
  context: {
    userId: 'user-123',
    environment: 'production',
  },
});
```

### Error Handling

```typescript
const result = await executor.executeCode(code);

if (!result.success) {
  console.error('Execution failed:', result.error?.message);
  console.error('Stack trace:', result.error?.stack);
}
```

## 7. Complete Example

```typescript
import { getExecutor } from '@iris-prime/api';

async function runWorkflow() {
  const executor = getExecutor();

  const workflowCode = `
    import { iris, projectId, sessionId } from './iris-prime';

    console.log('Project:', projectId);
    console.log('Session:', sessionId);

    // Step 1: Discover patterns
    const patterns = await iris.discoverPatterns({
      minSupport: 0.3,
    });
    console.log('Patterns found:', patterns.length);

    // Step 2: Evaluate results
    await iris.evaluateOutput(
      'pattern-analysis',
      JSON.stringify(patterns),
      'correct'
    );

    // Step 3: Log telemetry
    await iris.logEvent('workflow_completed', {
      patternsFound: patterns.length,
      duration: Date.now(),
    });

    // Step 4: Record metrics
    await iris.recordMetric('patterns_discovered', patterns.length);

    // Cleanup
    await iris.close();

    return {
      success: true,
      patterns: patterns.length,
    };
  `;

  const result = await executor.executeCode(workflowCode, {
    projectId: 'my-project',
    sessionId: 'workflow-' + Date.now(),
    context: {
      userId: 'user-123',
      environment: 'production',
    },
  });

  console.log('Workflow result:', result.output);
  return result;
}

runWorkflow();
```

## 8. Testing

Run the test suite:

```bash
# Set environment variables
export E2B_API_KEY=your_key
export IRIS_API_KEY=your_key

# Run tests
npx tsx examples/test-e2b-execution.ts
```

## 9. Monitoring

### Check Sandbox Status

```bash
curl https://api.iris-prime.com/api/iris/sandbox?sandboxId=sb_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Close Sandbox

```bash
curl -X DELETE "https://api.iris-prime.com/api/iris/sandbox?sandboxId=sb_abc123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Close All Sandboxes

```bash
curl -X DELETE "https://api.iris-prime.com/api/iris/sandbox?all=true" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 10. Best Practices

1. **Always cleanup**: Call `await iris.close()` at the end of your code
2. **Reuse sandboxes**: For multiple executions, use `sandboxId`
3. **Handle errors**: Check `result.success` before using output
4. **Set timeouts**: Use appropriate timeout values for long operations
5. **Monitor usage**: Track execution time and resource usage

## 11. Troubleshooting

**"E2B_API_KEY is required"**
- Set `E2B_API_KEY` in environment variables

**"Execution timeout"**
- Increase timeout in executor config
- Optimize code for faster execution

**"Module not found"**
- MCP SDK is pre-installed
- Other packages need manual installation

**"Rate limit exceeded"**
- Wait for rate limit window to reset
- Upgrade API tier for higher limits

## Next Steps

- Read full documentation: [E2B_INTEGRATION.md](./E2B_INTEGRATION.md)
- Explore examples: [e2b-execution-examples.ts](../examples/e2b-execution-examples.ts)
- API Reference: [API_REFERENCE.md](./API_REFERENCE.md)

## Support

- GitHub Issues: https://github.com/iris-prime/api/issues
- Email: support@iris-prime.com
- Discord: https://discord.gg/iris-prime
