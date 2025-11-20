# Iris API - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Install Dependencies

```bash
cd iris-prime-api
npm install @supabase/supabase-js
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Setup Database

```bash
# Run the schema
psql $SUPABASE_URL < examples/supabase-schema.sql
```

### 4. Create Your First API Key

```typescript
import { createApiKey } from './lib/auth';

const apiKey = await createApiKey(
  'proj_my_first_project',
  'My First Project'
);

console.log('Save this API key:', apiKey);
// Output: sk_live_abc123def456...
```

### 5. Create Your First Endpoint

**File: `api/telemetry/route.ts`**

```typescript
import {
  requireAuth,
  rateLimitCombined,
  validateTelemetryEvent,
  parseJsonBody,
  errorToResponse,
} from '@iris-prime/api';

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    // 2. Authenticate
    const projectId = await requireAuth(request);
    
    // 3. Rate limit
    rateLimitCombined(ip, projectId);
    
    // 4. Validate
    const event = await parseJsonBody(request, validateTelemetryEvent);
    
    // 5. Process (your code here)
    console.log('Event received:', event);
    
    // 6. Respond
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return errorToResponse(error, '/api/telemetry');
  }
}
```

### 6. Test Your Endpoint

```bash
curl -X POST http://localhost:3000/api/telemetry \
  -H "Authorization: Bearer sk_live_abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_my_first_project",
    "event": "agent.started",
    "agentId": "agent_001",
    "metadata": {
      "model": "gpt-4",
      "temperature": 0.7
    }
  }'
```

**Expected Response:**
```json
{
  "success": true
}
```

## 📋 Common Patterns

### Pattern 1: Authenticated Endpoint

```typescript
export async function POST(req: Request) {
  const projectId = await requireAuth(req);
  // ... your logic
}
```

### Pattern 2: With Rate Limiting

```typescript
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const projectId = await requireAuth(req);
  rateLimitCombined(ip, projectId);
  // ... your logic
}
```

### Pattern 3: With Validation

```typescript
export async function POST(req: Request) {
  const projectId = await requireAuth(req);
  const event = await parseJsonBody(req, validateTelemetryEvent);
  // ... your logic
}
```

### Pattern 4: Full Stack (Recommended)

```typescript
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const projectId = await requireAuth(req);
    rateLimitCombined(ip, projectId);
    const event = await parseJsonBody(req, validateTelemetryEvent);
    
    // Your business logic
    
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return errorToResponse(error, req.url);
  }
}
```

## 🔐 Authentication

### Header Format

```http
Authorization: Bearer sk_live_abc123def456...
```

### Extract Project ID

```typescript
const projectId = await requireAuth(request);
// Returns: "proj_my_first_project"
```

### Optional Auth (Don't Throw)

```typescript
const projectId = await optionalAuth(request);
// Returns: "proj_123" or null
```

## 🚦 Rate Limiting

### Default Limits

- **IP-based**: 100 requests/minute
- **API key-based**: 1000 requests/minute

### Custom Limits

```typescript
rateLimitCombined(
  ip,
  projectId,
  { maxRequests: 200, windowMs: 60_000 },   // IP: 200/min
  { maxRequests: 5000, windowMs: 60_000 }   // Key: 5000/min
);
```

### Get Rate Limit Status

```typescript
const status = getRateLimitStatus('apikey:proj_123', 1000);
// { limit: 1000, remaining: 876, reset: "2025-11-17T10:30:00Z" }
```

## ✅ Validation

### Telemetry Events

```typescript
const event = validateTelemetryEvent({
  projectId: 'proj_123',
  event: 'agent.started',
  agentId: 'agent_001',        // optional
  sessionId: 'sess_xyz',       // optional
  metadata: { key: 'value' }   // optional
});
```

### Signature Events (DSPy)

```typescript
const signature = validateSignatureEvent({
  projectId: 'proj_123',
  signatureName: 'ChainOfThought',
  signature: 'question -> answer',
  inputFields: [{ name: 'question', type: 'str' }],
  outputFields: [{ name: 'answer', type: 'str' }]
});
```

### Reflexion Events

```typescript
const reflexion = validateReflexionEvent({
  projectId: 'proj_123',
  input: 'What is 2+2?',
  output: '4',
  verdict: 'correct',  // or 'incorrect' or 'partial'
  reasoning: 'Correct arithmetic'
});
```

## 🛠️ Admin Operations

### Create Project

```typescript
const apiKey = await createApiKey('proj_123', 'My Project', {
  rateLimit: { maxRequests: 5000, windowMs: 60000 }
});
```

### Rotate Key

```typescript
const newKey = await rotateApiKey('proj_123');
// Old key is automatically invalidated
```

### Revoke Key

```typescript
await revokeApiKey(oldApiKey);
```

## 🐛 Error Handling

### Standard Errors

```typescript
throw new UnauthorizedError('Invalid API key');      // 401
throw new ForbiddenError('Access denied');            // 403
throw new NotFoundError('Project not found');         // 404
throw new ValidationError('Invalid input');           // 400
throw new RateLimitError('Too many requests');        // 429
```

### Error Response Format

```json
{
  "error": {
    "message": "Invalid API key",
    "code": "UNAUTHORIZED",
    "statusCode": 401,
    "details": { "hint": "Check your API key" },
    "timestamp": "2025-11-17T10:00:00Z",
    "path": "/api/telemetry"
  }
}
```

## 📊 Monitoring

### Cache Stats

```typescript
import { getAuthCacheStats } from '@iris-prime/api';

const stats = getAuthCacheStats();
console.log(`Cached keys: ${stats.size}`);
```

### Rate Limit Stats

```typescript
import { getRateLimitStoreSize } from '@iris-prime/api';

const size = getRateLimitStoreSize();
console.log(`Active limits: ${size}`);
```

## 🚀 Deployment

### Vercel

```bash
npm install
vercel deploy
```

### Cloudflare Workers

```bash
npm install
wrangler deploy
```

### Environment Variables

Set in your platform:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## 📚 Learn More

- [README.md](./README.md) - Full API reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [examples/](./examples/) - Working code samples

## 🆘 Common Issues

### Issue: "SUPABASE_URL is not defined"

**Solution**: Set environment variables
```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key
```

### Issue: "Unauthorized"

**Solution**: Check API key format
```typescript
// ✅ Correct
Authorization: Bearer sk_live_abc123...

// ❌ Wrong
Authorization: sk_live_abc123...  // Missing "Bearer"
```

### Issue: "Rate limit exceeded"

**Solution**: Increase limits in project settings
```sql
UPDATE project_config
SET settings = jsonb_set(
  settings,
  '{rateLimit,maxRequests}',
  '5000'
)
WHERE id = 'proj_123';
```

---

**Ready to build?** Start with `examples/basic-api-route.ts` and customize for your needs!
