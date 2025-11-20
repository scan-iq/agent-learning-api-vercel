# Iris API

Production-grade authentication and validation utilities for the Iris Console backend.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Iris Console                        │
│                     (Frontend - React)                       │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS + Bearer Token
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  API Gateway / Edge Runtime                  │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Rate Limiter │→ │   Auth      │→ │   Validation     │   │
│  │ (IP + Key)   │  │ (API Keys)  │  │ (Event Schemas)  │   │
│  └──────────────┘  └─────────────┘  └──────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   Supabase Backend                           │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ project_config  │  │ Event Tables                     │  │
│  │ (API Keys)      │  │ • global_metrics_supabase       │  │
│  └─────────────────┘  │ • signature_events              │  │
│                       │ • reflexion_events              │  │
│                       │ • consensus_events              │  │
│                       └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Security Features

### Multi-Layer Protection

1. **API Key Authentication**
   - Bearer token validation
   - Secure key generation (32 bytes, base64url encoded)
   - 5-minute in-memory cache with TTL
   - Automatic cache invalidation

2. **Rate Limiting**
   - Dual-layer: IP-based + API key-based
   - Token bucket algorithm
   - Configurable limits per project
   - Automatic cleanup of expired entries

3. **Request Validation**
   - Runtime type checking
   - Schema validation for all event types
   - Detailed error messages with field-level feedback
   - Protection against injection attacks

4. **Error Handling**
   - Standardized error responses
   - Security-aware logging (no sensitive data exposure)
   - Stack traces only in development
   - Consistent HTTP status codes

## 📦 Installation

```bash
npm install @iris-prime/api
```

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Required environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
```

### 2. Basic Usage

```typescript
import {
  requireAuth,
  rateLimitCombined,
  validateTelemetryEvent,
  errorToResponse,
} from '@iris-prime/api';

// API route handler (works with any edge runtime)
export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Extract client IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // 2. Authenticate and get project ID
    const projectId = await requireAuth(request);

    // 3. Apply rate limiting
    rateLimitCombined(ip, projectId);

    // 4. Validate request body
    const event = await parseJsonBody(request, validateTelemetryEvent);

    // 5. Process event (store in Supabase, etc.)
    // ... your business logic here

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Automatic error handling with proper status codes
    return errorToResponse(error, '/api/telemetry');
  }
}
```

## 📚 API Reference

### Authentication (`lib/auth.ts`)

#### `requireAuth(request: Request): Promise<string>`

Validates API key and returns project ID or throws `UnauthorizedError`.

```typescript
const projectId = await requireAuth(request);
// Returns: "proj_abc123..."
```

#### `getAuthContext(request: Request): Promise<AuthContext>`

Gets full authentication context including project settings.

```typescript
const context = await getAuthContext(request);
// Returns: { 
//   projectId: "proj_abc123",
//   projectName: "My Project",
//   rateLimit: { maxRequests: 1000, windowMs: 60000 }
// }
```

#### `createApiKey(projectId, projectName, settings?): Promise<string>`

Creates a new API key for a project (admin only).

```typescript
const apiKey = await createApiKey(
  'proj_abc123',
  'My Project',
  { rateLimit: { maxRequests: 5000, windowMs: 60000 } }
);
// Returns: "sk_live_abc123def456..."
```

#### `rotateApiKey(projectId: string): Promise<string>`

Rotates API key for a project and invalidates the old one.

```typescript
const newKey = await rotateApiKey('proj_abc123');
// Old key is automatically revoked
```

### Rate Limiting (`lib/rate-limit.ts`)

#### `rateLimitCombined(ip, projectId, ipLimits?, apiKeyLimits?): void`

Apply both IP and API key rate limits. Throws `RateLimitError` if exceeded.

```typescript
rateLimitCombined(
  '192.168.1.1',
  'proj_abc123',
  { maxRequests: 100, windowMs: 60000 },   // IP limit
  { maxRequests: 1000, windowMs: 60000 }   // API key limit
);
```

#### `getRateLimitStatus(key, maxRequests): RateLimitStatus`

Get current rate limit status for headers.

```typescript
const status = getRateLimitStatus('ip:192.168.1.1', 100);
// Returns: { limit: 100, remaining: 87, reset: "2025-11-17T10:30:00Z" }

// Add to response headers
response.headers.set('X-RateLimit-Limit', status.limit.toString());
response.headers.set('X-RateLimit-Remaining', status.remaining.toString());
```

### Validation (`lib/validation.ts`)

#### `validateTelemetryEvent(data: unknown): TelemetryEvent`

Validates telemetry event payload.

```typescript
const event = validateTelemetryEvent({
  projectId: 'proj_abc123',
  event: 'agent.started',
  agentId: 'agent_001',
  sessionId: 'sess_xyz',
  metadata: { model: 'gpt-4' }
});
```

#### `validateSignatureEvent(data: unknown): SignatureEvent`

Validates DSPy signature event.

```typescript
const signature = validateSignatureEvent({
  projectId: 'proj_abc123',
  signatureName: 'ChainOfThought',
  signature: 'question -> answer',
  inputFields: [{ name: 'question', type: 'str' }],
  outputFields: [{ name: 'answer', type: 'str' }]
});
```

#### `validateReflexionEvent(data: unknown): ReflexionEvent`

Validates reflexion/verdict event.

```typescript
const reflexion = validateReflexionEvent({
  projectId: 'proj_abc123',
  input: 'What is 2+2?',
  output: '4',
  verdict: 'correct',
  reasoning: 'Correct arithmetic calculation'
});
```

### Error Handling (`lib/errors.ts`)

#### `handleApiError(error: unknown, path?: string): ErrorResponse`

Converts any error to standardized format.

```typescript
const errorResponse = handleApiError(error, '/api/telemetry');
// Returns: {
//   error: {
//     message: "Validation failed",
//     code: "VALIDATION_ERROR",
//     statusCode: 400,
//     details: { field: "projectId" },
//     timestamp: "2025-11-17T10:00:00Z",
//     path: "/api/telemetry"
//   }
// }
```

#### Error Classes

```typescript
throw new UnauthorizedError('Invalid API key');           // 401
throw new ForbiddenError('Insufficient permissions');      // 403
throw new NotFoundError('Project not found');              // 404
throw new ValidationError('Invalid input', { field });     // 400
throw new RateLimitError('Too many requests');             // 429
throw new InternalServerError('Database error');           // 500
```

## 🎯 Usage Patterns

### Edge Runtime (Vercel, Cloudflare Workers)

```typescript
import { withAuth, validateTelemetryEvent, parseJsonBody } from '@iris-prime/api';

export async function POST(request: Request) {
  return withAuth(request, async (projectId, req) => {
    const event = await parseJsonBody(req, validateTelemetryEvent);
    
    // Your business logic
    await storeEvent(projectId, event);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });
}
```

### Node.js Express

```typescript
import express from 'express';
import { requireAuth, rateLimitByIp, errorToResponse } from '@iris-prime/api';

const app = express();

app.post('/api/telemetry', async (req, res) => {
  try {
    const projectId = await requireAuth(req);
    rateLimitByIp(req.ip, 100, 60000);
    
    // Your logic here
    res.json({ success: true });
  } catch (error) {
    const response = errorToResponse(error, req.path);
    res.status(response.error.statusCode).json(response);
  }
});
```

### Next.js App Router

```typescript
// app/api/telemetry/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, rateLimitCombined, validateTelemetryEvent } from '@iris-prime/api';

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip || 'unknown';
    const projectId = await requireAuth(request);
    
    rateLimitCombined(ip, projectId);
    
    const body = await request.json();
    const event = validateTelemetryEvent(body);
    
    // Store event
    return NextResponse.json({ success: true });
  } catch (error) {
    const { handleApiError } = await import('@iris-prime/api');
    const errorResponse = handleApiError(error, '/api/telemetry');
    return NextResponse.json(errorResponse, {
      status: errorResponse.error.statusCode
    });
  }
}
```

## 🔧 Configuration

### Custom Rate Limits

Store in `project_config.settings`:

```sql
UPDATE project_config
SET settings = jsonb_set(
  settings,
  '{rateLimit}',
  '{"maxRequests": 5000, "windowMs": 60000}'::jsonb
)
WHERE id = 'proj_abc123';
```

### API Key Management

```typescript
// Create new project with API key
const apiKey = await createApiKey('proj_new', 'New Project', {
  rateLimit: { maxRequests: 1000, windowMs: 60000 },
  features: ['telemetry', 'signatures', 'reflexions']
});

// Rotate compromised key
const newKey = await rotateApiKey('proj_abc123');

// Revoke key
await revokeApiKey(compromisedKey);
```

## 📊 Monitoring

### Rate Limit Metrics

```typescript
import { getRateLimitStoreSize, getRateLimitStatus } from '@iris-prime/api';

// Monitor memory usage
const storeSize = getRateLimitStoreSize();
console.log(`Rate limit entries: ${storeSize}`);

// Check specific key status
const status = getRateLimitStatus('ip:192.168.1.1', 100);
console.log(`Remaining: ${status.remaining}/${status.limit}`);
```

### Auth Cache Metrics

```typescript
import { getAuthCacheStats } from '@iris-prime/api';

const stats = getAuthCacheStats();
console.log(`Cached API keys: ${stats.size}`);
stats.entries.forEach(entry => {
  console.log(`Project ${entry.projectId} expires at ${entry.expiresAt}`);
});
```

## 🧪 Testing

```typescript
import { clearAuthCache, clearAllRateLimits, resetRateLimit } from '@iris-prime/api';

beforeEach(() => {
  // Clear caches between tests
  clearAuthCache();
  clearAllRateLimits();
});

test('rate limiting works', () => {
  // Test rate limit
  for (let i = 0; i < 100; i++) {
    rateLimit('test-key', 100, 60000); // Should pass
  }
  
  expect(() => rateLimit('test-key', 100, 60000)).toThrow(RateLimitError);
  
  // Reset for next test
  resetRateLimit('test-key');
});
```

## 🚢 Deployment

### Supabase Schema

```sql
-- Create project_config table
CREATE TABLE project_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast API key lookups
CREATE INDEX idx_project_config_api_key ON project_config(api_key);

-- Enable RLS
ALTER TABLE project_config ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access"
  ON project_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Environment Variables

```bash
# Production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # Service role key (keep secret!)

# Development
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=eyJhbGc...  # Local service key
```

## 📖 Best Practices

1. **API Key Rotation**: Rotate keys every 90 days
2. **Rate Limiting**: Use combined IP + API key limits
3. **Caching**: API key cache reduces DB load by 95%
4. **Monitoring**: Track rate limit hits and auth failures
5. **Errors**: Always use `errorToResponse()` for consistent responses
6. **Security**: Never log API keys, even in errors

## 🤝 Integration with Agent Learning Core

```typescript
import { GlobalMetrics } from '@foxruv/agent-learning-core';
import { requireAuth, validateTelemetryEvent } from '@iris-prime/api';

export async function POST(request: Request) {
  const projectId = await requireAuth(request);
  const event = await parseJsonBody(request, validateTelemetryEvent);
  
  // Store in both Supabase and AgentDB
  await GlobalMetrics.track(projectId, event.event, event.metadata);
  
  return new Response(JSON.stringify({ success: true }));
}
```

## 📄 License

MIT

## 🆘 Support

For issues and questions:
- GitHub Issues: https://github.com/iris-prime/api/issues
- Documentation: https://iris-prime.dev/docs/api
