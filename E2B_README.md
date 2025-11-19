# IRIS Prime E2B Code Execution

Execute TypeScript code in isolated E2B sandboxes with full access to IRIS Prime MCP tools.

## 🚀 Quick Start

```typescript
import { getExecutor } from '@iris-prime/api';

const executor = getExecutor();

const result = await executor.executeCode(`
  import { iris } from './iris-prime';

  const patterns = await iris.discoverPatterns({
    minSupport: 0.3,
    minConfidence: 0.7
  });

  console.log('Found', patterns.length, 'patterns');
  await iris.close();
`);

console.log(result.output);
```

## 📦 Installation

```bash
npm install @e2b/code-interpreter @modelcontextprotocol/sdk
```

## 🔑 Environment Setup

```bash
export E2B_API_KEY=your_e2b_api_key
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_KEY=your_service_key
```

## 🎯 Features

- ✅ **Isolated Execution**: Code runs in secure E2B sandboxes
- ✅ **IRIS Prime Tools**: Full MCP server access
- ✅ **Pattern Discovery**: Analyze and discover patterns
- ✅ **Reflexion**: Self-improvement and evaluation
- ✅ **Consensus**: Multi-agent decision making
- ✅ **Telemetry**: Event logging and tracking
- ✅ **Metrics**: Performance monitoring
- ✅ **Lineage**: Track execution history

## 📚 Documentation

- **Quick Start**: [docs/E2B_QUICKSTART.md](docs/E2B_QUICKSTART.md)
- **Full Guide**: [docs/E2B_INTEGRATION.md](docs/E2B_INTEGRATION.md)
- **Implementation**: [docs/E2B_IMPLEMENTATION_SUMMARY.md](docs/E2B_IMPLEMENTATION_SUMMARY.md)

## 🧪 Testing

```bash
npx tsx examples/test-e2b-execution.ts
```

## 🔌 API Endpoints

### Execute Code

```bash
curl -X POST https://api.iris-prime.com/api/iris/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "import { iris } from \"./iris-prime\";\n\nconst patterns = await iris.discoverPatterns();\nconsole.log(patterns);"
  }'
```

### Manage Sandboxes

```bash
# Get status
curl https://api.iris-prime.com/api/iris/sandbox?sandboxId=xxx \
  -H "Authorization: Bearer YOUR_API_KEY"

# Close sandbox
curl -X DELETE https://api.iris-prime.com/api/iris/sandbox?sandboxId=xxx \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 💡 Examples

### Pattern Discovery

```typescript
const result = await executor.executeCode(`
  import { iris } from './iris-prime';

  const patterns = await iris.discoverPatterns({
    minSupport: 0.4,
    minConfidence: 0.8,
    maxPatterns: 10
  });

  console.log('Patterns:', patterns);
  await iris.close();
`);
```

### Reflexion & Evaluation

```typescript
const result = await executor.executeCode(`
  import { iris } from './iris-prime';

  await iris.evaluateOutput(
    'What is 2+2?',
    '4',
    'correct'
  );

  console.log('Evaluation complete');
  await iris.close();
`);
```

### Multi-Agent Consensus

```typescript
const result = await executor.executeCode(`
  import { iris, sessionId } from './iris-prime';

  const consensusId = sessionId;
  const agents = ['agent-1', 'agent-2', 'agent-3'];

  for (const agent of agents) {
    await iris.submitVote(consensusId, agent, 'approve');
  }

  console.log('Consensus achieved');
  await iris.close();
`);
```

## 🛠️ Available IRIS Tools

```typescript
import { iris, projectId, sessionId, context } from './iris-prime';

// Pattern Discovery
await iris.discoverPatterns(config);

// Reflexion
await iris.evaluateOutput(input, output, verdict);

// Consensus
await iris.submitVote(consensusId, agentId, vote);
await iris.getConsensusStatus(consensusId);

// Telemetry
await iris.logEvent(event, metadata);

// Prompt Registry
await iris.getPrompt(name);
await iris.savePrompt(name, template, variables);
await iris.listPrompts(filter);

// Lineage Tracking
await iris.trackLineage(signature, input, output);
await iris.getLineage(signatureId);

// Metrics
await iris.recordMetric(metric, value, tags);
await iris.getMetrics(filter);

// Agent Management
await iris.registerAgent(agentId, capabilities, metadata);
await iris.getAgentStatus(agentId);

// Cleanup (always call at the end)
await iris.close();
```

## 🔒 Security

- **Authentication**: API key required
- **Rate Limiting**: 100 requests/minute
- **Sandboxing**: Isolated E2B containers
- **Resource Limits**: CPU, memory, timeout
- **Code Validation**: Size limits, timeout enforcement

## 📊 Resource Limits

| Resource | Limit |
|----------|-------|
| Code size | 100KB |
| Execution timeout | 5 minutes |
| Memory per sandbox | 2GB |
| Rate limit | 100/min |

## ⚡ Performance

- **Cold start** (new sandbox): ~5-10 seconds
- **Warm start** (reused sandbox): ~500ms
- **IRIS tool call**: ~100-500ms

### Optimize Performance

```typescript
// Reuse sandboxes for faster execution
const sandboxId = 'my-session';

const result1 = await executor.executeCode(code1, { sandboxId });
const result2 = await executor.executeCode(code2, { sandboxId });

await executor.closeSandbox(sandboxId);
```

## 🐛 Troubleshooting

**"E2B_API_KEY is required"**
- Set `E2B_API_KEY` environment variable

**"Execution timeout"**
- Increase timeout or optimize code

**"Module not found"**
- MCP SDK is pre-installed
- Other packages need manual installation

**"Rate limit exceeded"**
- Wait for rate limit window to reset
- Upgrade API tier

## 📖 Full Documentation

See [docs/](docs/) for complete documentation:

- [E2B_QUICKSTART.md](docs/E2B_QUICKSTART.md) - Get started in 5 minutes
- [E2B_INTEGRATION.md](docs/E2B_INTEGRATION.md) - Complete integration guide
- [E2B_IMPLEMENTATION_SUMMARY.md](docs/E2B_IMPLEMENTATION_SUMMARY.md) - Implementation details

## 🤝 Contributing

Contributions welcome! See examples in [examples/](examples/).

## 📝 License

MIT

## 🔗 Links

- **Dashboard**: https://iris-prime.com
- **API Docs**: https://api.iris-prime.com/docs
- **E2B Platform**: https://e2b.dev
- **MCP Protocol**: https://modelcontextprotocol.io

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-11-17
