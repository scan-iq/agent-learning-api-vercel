# E2B Code Execution Integration for IRIS

## Overview

IRIS now supports executing TypeScript code in isolated E2B sandboxes with full access to IRIS MCP server tools. This enables dashboard users to write and execute code that leverages pattern discovery, reflexion, consensus, and other IRIS features.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    IRIS Dashboard                     │
│                                                              │
│  User writes TypeScript code                                │
│  ↓                                                           │
│  POST /api/iris/execute                                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTPS + API Key
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   IRIS API Server                     │
│                                                              │
│  ┌──────────────────────────────────────────────┐          │
│  │        IrisCodeExecutor (lib/e2b-executor)   │          │
│  │                                               │          │
│  │  1. Create E2B sandbox                       │          │
│  │  2. Install dependencies                     │          │
│  │  3. Mount IRIS wrapper module                │          │
│  │  4. Execute user code                        │          │
│  │  5. Capture and format results               │          │
│  └──────────────────────────────────────────────┘          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ Sandbox API
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                      E2B Sandbox (Node.js)                  │
│                                                              │
│  User Code:                                                 │
│  ┌──────────────────────────────────────────────┐          │
│  │  import { iris } from './iris-prime';        │          │
│  │                                               │          │
│  │  const patterns = await iris.discoverPatterns│          │
│  │  const prompt = await iris.getPrompt(...)    │          │
│  │  await iris.logEvent(...)                    │          │
│  └───────────────────┬──────────────────────────┘          │
│                      │                                       │
│                      │ MCP Protocol                         │
│                      ↓                                       │
│  ┌──────────────────────────────────────────────┐          │
│  │      IRIS MCP Server Wrapper           │          │
│  │  (Runs inside sandbox, calls MCP server)     │          │
│  │                                               │          │
│  │  - Pattern Discovery Tools                   │          │
│  │  - Reflexion Tools                           │          │
│  │  - Consensus Tools                           │          │
│  │  - Telemetry Tools                           │          │
│  │  - Prompt Registry Tools                     │          │
│  │  - Lineage Tracking Tools                    │          │
│  └───────────────────┬──────────────────────────┘          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ MCP Protocol (stdio)
                             ↓
┌─────────────────────────────────────────────────────────────┐
│              @foxruv/agent-learning-core MCP                │
│                                                              │
│  Supabase Integration:                                      │
│  - Patterns table                                           │
│  - Reflexions table                                         │
│  - Consensus table                                          │
│  - Telemetry table                                          │
│  - Prompt registry                                          │
│  - Lineage tracking                                         │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST /api/iris/execute

Execute TypeScript code in an E2B sandbox with IRIS access.

**Request:**

```typescript
{
  "code": string,              // TypeScript code to execute (max 100KB)
  "projectId"?: string,        // Optional: Override project ID
  "sessionId"?: string,        // Optional: Session identifier
  "context"?: object,          // Optional: Custom context variables
  "sandboxId"?: string        // Optional: Reuse existing sandbox
}
```

**Response:**

```typescript
{
  "success": boolean,
  "result": {
    "success": boolean,
    "output": string,          // Formatted output
    "error"?: {
      "message": string,
      "stack"?: string,
      "name": string
    },
    "executionTime": number,   // Milliseconds
    "logs": string[],
    "metadata": {
      "sandboxId"?: string,
      "projectId"?: string,
      "sessionId"?: string,
      "timestamp": string
    }
  },
  "sandboxId"?: string,
  "timestamp": string
}
```

**Example:**

```bash
curl -X POST https://api.iris-prime.com/api/iris/execute \
  -H "Authorization: Bearer sk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "code": "import { iris } from \"./iris-prime\";\n\nconst patterns = await iris.discoverPatterns({ minSupport: 0.3 });\nconsole.log(\"Found\", patterns.length, \"patterns\");"
  }'
```

### GET /api/iris/sandbox

Get status of a sandbox.

**Query Parameters:**
- `sandboxId` (required): Sandbox ID to check

**Response:**

```typescript
{
  "sandboxId": string,
  "active": boolean,
  "totalActive": number,
  "timestamp": string
}
```

### DELETE /api/iris/sandbox

Close sandbox(es).

**Query Parameters:**
- `sandboxId`: Close specific sandbox
- `all=true`: Close all sandboxes

**Response:**

```typescript
{
  "message": string,
  "timestamp": string
}
```

## Available IRIS Tools in Sandbox

When executing code in the sandbox, import IRIS tools from `./iris-prime`:

```typescript
import { iris, projectId, sessionId, context } from './iris-prime';
```

### Pattern Discovery

```typescript
const patterns = await iris.discoverPatterns({
  minSupport?: number,      // Default: 0.3
  minConfidence?: number,   // Default: 0.7
  maxPatterns?: number      // Default: 10
});
```

### Reflexion & Evaluation

```typescript
const evaluation = await iris.evaluateOutput(
  input: string,
  output: string,
  verdict: 'correct' | 'incorrect' | 'partial'
);
```

### Consensus Voting

```typescript
await iris.submitVote(
  consensusId: string,
  agentId: string,
  vote: 'approve' | 'reject' | 'abstain'
);
```

### Telemetry Logging

```typescript
await iris.logEvent(
  event: string,
  metadata?: Record<string, any>
);
```

### Prompt Registry

```typescript
// Save a prompt template
await iris.savePrompt(
  name: string,
  template: string,
  variables?: string[]
);

// Retrieve a prompt
const prompt = await iris.getPrompt(name: string);
```

### Lineage Tracking

```typescript
await iris.trackLineage(
  signature: string,
  input: any,
  output: any
);
```

### Global Metrics

```typescript
await iris.recordMetric(
  metric: string,
  value: number,
  tags?: Record<string, string>
);
```

### Cleanup

```typescript
// Always cleanup when done
await iris.close();
```

## Usage Examples

### Example 1: Pattern Discovery

```typescript
import { iris, projectId } from './iris-prime';

async function analyzePatterns() {
  console.log('Analyzing patterns for project:', projectId);

  const patterns = await iris.discoverPatterns({
    minSupport: 0.4,
    minConfidence: 0.8,
    maxPatterns: 20
  });

  console.log('Found', patterns.length, 'patterns');

  // Log discovery as telemetry
  await iris.logEvent('pattern_discovery_completed', {
    patternsFound: patterns.length
  });

  await iris.close();
  return patterns;
}

await analyzePatterns();
```

### Example 2: Multi-Agent Workflow

```typescript
import { iris, sessionId } from './iris-prime';

async function multiAgentWorkflow() {
  // Step 1: Each agent evaluates
  const agents = ['analyst', 'validator', 'optimizer'];
  const evaluations = [];

  for (const agent of agents) {
    const result = await iris.evaluateOutput(
      'input-data',
      'processed-data',
      'correct'
    );
    evaluations.push({ agent, result });
  }

  // Step 2: Consensus voting
  const consensusId = sessionId || 'consensus-' + Date.now();
  for (const agent of agents) {
    await iris.submitVote(consensusId, agent, 'approve');
  }

  // Step 3: Track complete workflow
  await iris.trackLineage('multi-agent-workflow', {
    agents,
    evaluations
  }, {
    consensusId,
    approved: true
  });

  await iris.close();
  console.log('Workflow completed!');
}

await multiAgentWorkflow();
```

### Example 3: Prompt Evolution

```typescript
import { iris } from './iris-prime';

async function evolvePrompts() {
  // Create base prompt
  await iris.savePrompt(
    'analysis-v1',
    'Analyze {data} for {aspect}',
    ['data', 'aspect']
  );

  // Test and evaluate
  const evaluation = await iris.evaluateOutput(
    'test-data',
    'test-output',
    'partial'
  );

  if (evaluation.verdict !== 'correct') {
    // Create improved version
    await iris.savePrompt(
      'analysis-v2',
      'Deeply analyze {data} with focus on {aspect} and {context}',
      ['data', 'aspect', 'context']
    );
  }

  // Track evolution
  await iris.trackLineage('prompt-evolution', {
    version: 'v1'
  }, {
    version: 'v2',
    improvement: 'Added context parameter'
  });

  await iris.close();
}

await evolvePrompts();
```

## Environment Setup

### Prerequisites

1. **E2B API Key**: Get from https://e2b.dev
2. **IRIS API Key**: From project dashboard
3. **Supabase Credentials**: Already configured in IRIS

### Environment Variables

```bash
# E2B Configuration
E2B_API_KEY=your_e2b_api_key

# IRIS Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### Installation

```bash
cd iris-prime-api
npm install @e2b/code-interpreter
npm install @modelcontextprotocol/sdk
```

## Security Considerations

### Sandboxing

- All code runs in isolated E2B containers
- No access to host filesystem or network (except MCP)
- Resource limits enforced (CPU, memory, timeout)

### Authentication

- API key required for all requests
- Project-level isolation
- Rate limiting: 100 requests/minute

### Code Validation

- Max code size: 100KB
- Timeout: 5 minutes per execution
- Memory limit: 2GB per sandbox

### Best Practices

1. **Always cleanup**: Call `await iris.close()` at the end
2. **Handle errors**: Wrap code in try/catch
3. **Limit iterations**: Avoid infinite loops
4. **Reuse sandboxes**: Use `sandboxId` for session persistence
5. **Monitor metrics**: Track execution time and resource usage

## Performance Tips

### Sandbox Reuse

For multiple sequential executions, reuse sandboxes:

```typescript
// First execution - creates sandbox
const result1 = await fetch('/api/iris/execute', {
  method: 'POST',
  body: JSON.stringify({ code: 'console.log("First")' })
});
const { sandboxId } = await result1.json();

// Subsequent executions - reuse sandbox (faster)
const result2 = await fetch('/api/iris/execute', {
  method: 'POST',
  body: JSON.stringify({
    code: 'console.log("Second")',
    sandboxId // Reuse existing sandbox
  })
});

// Cleanup when done
await fetch(`/api/iris/sandbox?sandboxId=${sandboxId}`, {
  method: 'DELETE'
});
```

### Batch Operations

Execute multiple operations in single request:

```typescript
const code = `
import { iris } from './iris-prime';

// Multiple operations in one execution
const [patterns, prompt, evaluation] = await Promise.all([
  iris.discoverPatterns({ minSupport: 0.3 }),
  iris.getPrompt('my-template'),
  iris.evaluateOutput('input', 'output', 'correct')
]);

await iris.close();
return { patterns, prompt, evaluation };
`;
```

## Monitoring & Debugging

### Execution Logs

All console output is captured and returned:

```typescript
const result = await execute({
  code: `
    console.log('Starting...');
    console.error('Warning: high memory usage');
    console.log('Complete!');
  `
});

// result.logs contains all console output
```

### Error Handling

Errors include stack traces and context:

```typescript
{
  "success": false,
  "result": {
    "error": {
      "message": "Cannot find module './missing'",
      "stack": "Error: Cannot find module...\n  at ...",
      "name": "ModuleNotFoundError"
    }
  }
}
```

### Metrics

Track execution metrics:

```typescript
{
  "executionTime": 1523,  // milliseconds
  "metadata": {
    "timestamp": "2025-11-17T12:00:00Z",
    "sandboxId": "sb_abc123"
  }
}
```

## Troubleshooting

### Common Issues

**Timeout errors:**
- Reduce computation complexity
- Use batching for multiple operations
- Increase timeout in sandbox config

**Memory errors:**
- Reduce data size
- Process in chunks
- Use streaming where possible

**Module not found:**
- MCP SDK is pre-installed
- Other packages need manual installation
- Use standard Node.js modules

### Support

- Documentation: `/docs/E2B_INTEGRATION.md`
- API Reference: `/docs/API_REFERENCE.md`
- Examples: `/examples/e2b-execution-examples.ts`

## Future Enhancements

- [ ] Python code execution support
- [ ] Streaming execution results
- [ ] Persistent file storage in sandboxes
- [ ] Custom package installation
- [ ] GPU-accelerated execution
- [ ] Multi-language support (Go, Rust, etc.)

---

**Version**: 1.0.0
**Last Updated**: 2025-11-17
**Maintainer**: IRIS Team
