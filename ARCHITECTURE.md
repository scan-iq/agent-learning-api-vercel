# Iris Prime API - System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Iris Console    │  │   Mobile Apps    │  │   CLI Tools      │  │
│  │  (React SPA)     │  │   (iOS/Android)  │  │   (Node.js)      │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
└───────────┼──────────────────────┼──────────────────────┼───────────┘
            │                      │                      │
            │   HTTPS + Bearer Token (API Key)           │
            ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway Layer                            │
│                   (Vercel Edge / Cloudflare Workers)                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Request Pipeline                           │  │
│  │                                                               │  │
│  │  1. Extract IP     →  2. Extract API Key  →  3. Rate Limit   │  │
│  │  4. Authenticate  →  5. Validate Payload  →  6. Process      │  │
│  │  7. Response       ←  8. Error Handling   ←  9. Logging      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Supabase   │    │   AgentDB       │    │  External    │
│   Database   │    │   (Vector DB)   │    │  Services    │
│              │    │                 │    │              │
│ • API Keys   │    │ • Patterns      │    │ • Twilio     │
│ • Metrics    │    │ • Embeddings    │    │ • Webhooks   │
│ • Events     │    │ • Signatures    │    │              │
└──────────────┘    └─────────────────┘    └──────────────┘
```

## 🔐 Security Architecture

### Multi-Layer Defense

```
Layer 1: Network Layer
├── IP-based rate limiting (100 req/min)
├── DDoS protection (CDN/Edge)
└── HTTPS/TLS 1.3 encryption

Layer 2: Authentication Layer
├── Bearer token validation
├── API key lookup (cached 5min)
├── Project authorization
└── Session management

Layer 3: Authorization Layer
├── Project-level permissions
├── Feature flags
├── Resource quotas
└── Rate limits per project

Layer 4: Validation Layer
├── Schema validation (runtime)
├── Type checking (TypeScript)
├── Input sanitization
└── Output encoding

Layer 5: Data Layer
├── Row Level Security (RLS)
├── Encrypted at rest
├── Audit logging
└── Backup/recovery
```

## 🔄 Request Flow

### Successful Request Path

```
Client Request
    │
    ├─► 1. Edge Runtime receives request
    │       └─► Extract: IP, Headers, Body
    │
    ├─► 2. Rate Limiter (lib/rate-limit.ts)
    │       ├─► Check IP limit: 100/min
    │       └─► Check API key limit: 1000/min
    │
    ├─► 3. Authentication (lib/auth.ts)
    │       ├─► Extract API key from Authorization header
    │       ├─► Check cache (5min TTL)
    │       ├─► Query Supabase if cache miss
    │       └─► Return ProjectConfig
    │
    ├─► 4. Validation (lib/validation.ts)
    │       ├─► Parse JSON body
    │       ├─► Validate against schema
    │       └─► Return typed event
    │
    ├─► 5. Business Logic
    │       ├─► Store in Supabase
    │       ├─► Process event
    │       └─► Generate response
    │
    └─► 6. Response
            ├─► Add rate limit headers
            ├─► Add CORS headers
            └─► Return 200 OK
```

### Error Handling Path

```
Error Occurs
    │
    ├─► 1. Error Detection
    │       └─► Any layer can throw
    │
    ├─► 2. Error Classification (lib/errors.ts)
    │       ├─► ApiError subclasses
    │       ├─► Zod validation errors
    │       ├─► Database errors
    │       └─► Unknown errors
    │
    ├─► 3. Error Transformation
    │       ├─► Extract status code
    │       ├─► Create error response
    │       ├─► Add context (path, timestamp)
    │       └─► Sanitize sensitive data
    │
    ├─► 4. Error Logging
    │       ├─► Console.error (development)
    │       ├─► Structured logging (production)
    │       └─► Alert on critical errors
    │
    └─► 5. Error Response
            ├─► Standard JSON format
            ├─► Appropriate HTTP status
            └─► Helpful error message
```

## 💾 Data Architecture

### Supabase Tables

```sql
project_config (API Keys & Settings)
├── id (PK)
├── name
├── api_key (UNIQUE, indexed)
├── settings (JSONB)
│   ├── rateLimit { maxRequests, windowMs }
│   ├── features []
│   └── webhooks {}
├── created_at
└── updated_at

global_metrics_supabase (Telemetry)
├── id (PK)
├── project_id (FK → project_config)
├── agent_id
├── session_id (indexed)
├── event
├── metadata (JSONB)
└── timestamp (indexed)

signature_events (DSPy Signatures)
├── id (PK)
├── project_id (FK → project_config)
├── signature_name
├── signature
├── input_fields (JSONB)
├── output_fields (JSONB)
└── timestamp

reflexion_events (Verdicts)
├── id (PK)
├── project_id (FK → project_config)
├── input
├── output
├── verdict (correct|incorrect|partial)
├── reasoning
└── timestamp

consensus_events (Multi-agent)
├── id (PK)
├── project_id (FK → project_config)
├── consensus_id
├── agent_id
├── vote (approve|reject|abstain)
└── timestamp
```

### Indexing Strategy

```sql
-- Fast API key lookups (hot path)
CREATE INDEX idx_project_config_api_key ON project_config(api_key);

-- Time-series queries
CREATE INDEX idx_global_metrics_project ON global_metrics_supabase(project_id, timestamp DESC);

-- Session tracking
CREATE INDEX idx_global_metrics_session ON global_metrics_supabase(session_id) WHERE session_id IS NOT NULL;

-- Consensus queries
CREATE INDEX idx_consensus_events_project ON consensus_events(project_id, consensus_id, timestamp DESC);
```

## 🚀 Performance Optimizations

### Caching Strategy

```typescript
// 1. API Key Cache (5 min TTL)
Map<apiKey, { config: ProjectConfig, expiresAt: number }>
├── Reduces DB queries by 95%
├── In-memory for low latency
└── Automatic cleanup every 60s

// 2. Rate Limit Store (dynamic TTL)
Map<key, { count: number, resetAt: number }>
├── Token bucket algorithm
├── Separate tracking: IP, API key
└── Memory-efficient cleanup

// 3. Edge Caching (CDN)
├── Static assets: 1 year
├── API responses: No cache
└── CORS preflight: 1 hour
```

### Optimization Techniques

1. **Connection Pooling**: Supabase client reused across requests
2. **Lazy Loading**: Import heavy modules only when needed
3. **Parallel Validation**: Independent checks run concurrently
4. **Early Returns**: Fail fast on auth/rate limit violations
5. **Minimal Allocations**: Reuse objects where possible

## 📊 Monitoring & Observability

### Key Metrics

```typescript
// Authentication Metrics
- api_key_validations_total
- api_key_validation_errors_total
- api_key_cache_hits_total
- api_key_cache_misses_total

// Rate Limiting Metrics
- rate_limit_checks_total
- rate_limit_exceeded_total
- rate_limit_store_size

// Request Metrics
- requests_total (by endpoint, status)
- request_duration_ms (p50, p95, p99)
- request_body_size_bytes

// Error Metrics
- errors_total (by type, endpoint)
- validation_errors_total (by field)
- auth_failures_total (by reason)
```

### Logging Strategy

```typescript
// Development: Verbose console logs
console.log('[Auth]', { projectId, action: 'validate' });

// Production: Structured JSON logs
logger.info({
  service: 'iris-prime-api',
  event: 'auth.validate',
  projectId,
  duration_ms: 45,
  cache_hit: true,
});

// Security Events: Always logged
logger.warn({
  event: 'auth.failure',
  reason: 'invalid_api_key',
  ip: '192.168.1.1',
  timestamp: '2025-11-17T10:00:00Z',
});
```

## 🔧 Configuration Management

### Environment-based Config

```typescript
// Development
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=local-dev-key
DEFAULT_RATE_LIMIT_MAX_REQUESTS=10000

// Staging
SUPABASE_URL=https://staging.supabase.co
SUPABASE_SERVICE_KEY=staging-key
DEFAULT_RATE_LIMIT_MAX_REQUESTS=5000

// Production
SUPABASE_URL=https://prod.supabase.co
SUPABASE_SERVICE_KEY=prod-key
DEFAULT_RATE_LIMIT_MAX_REQUESTS=1000
```

### Runtime Configuration

```typescript
// Stored in project_config.settings (JSONB)
{
  "rateLimit": {
    "maxRequests": 5000,
    "windowMs": 60000
  },
  "features": ["telemetry", "signatures", "reflexions"],
  "webhooks": {
    "onEvent": "https://webhook.example.com/events"
  },
  "quota": {
    "eventsPerMonth": 1000000
  }
}
```

## 🛡️ Security Best Practices

### API Key Management

```typescript
// Generation: 32 bytes random, base64url encoded
const apiKey = generateSecureApiKey();
// Result: "sk_live_abc123def456..." (43 chars)

// Storage: Never log, never expose in errors
// ✅ Correct
logger.info({ projectId: 'proj_123', action: 'created' });

// ❌ Wrong
logger.info({ apiKey: 'sk_live_...', action: 'created' });

// Rotation: 90-day policy
if (daysSinceCreated > 90) {
  await rotateApiKey(projectId);
}
```

### Input Validation

```typescript
// Layer 1: Type checking (compile-time)
interface TelemetryEvent { projectId: string; ... }

// Layer 2: Runtime validation (request-time)
validateTelemetryEvent(data); // Throws ValidationError

// Layer 3: Business logic validation
if (event.projectId !== authProjectId) {
  throw new ForbiddenError('Project ID mismatch');
}

// Layer 4: Database constraints
CHECK (verdict IN ('correct', 'incorrect', 'partial'))
```

## 📈 Scalability Considerations

### Horizontal Scaling

- **Stateless Design**: No server-side sessions
- **Edge Deployment**: Run on Cloudflare Workers, Vercel Edge
- **Database Pooling**: Supabase handles connection pooling
- **Cache Invalidation**: TTL-based, no coordination needed

### Vertical Scaling

- **Rate Limit Store**: O(1) lookups, periodic cleanup
- **API Key Cache**: Limited by # of active projects
- **Memory Usage**: ~1KB per cached API key, ~100 bytes per rate limit entry

### Growth Projections

```
Current: 100 projects, 1M events/day
├── API key cache: ~100KB
├── Rate limit store: ~50KB (assuming 500 unique IPs)
└── DB size: ~500MB

At 10,000 projects, 100M events/day
├── API key cache: ~10MB
├── Rate limit store: ~5MB (50K unique IPs)
└── DB size: ~50GB (with partitioning)
```

## 🔄 Deployment Architecture

### Multi-Region Setup

```
┌──────────────────────────────────────────────────────────┐
│                    Global DNS / CDN                       │
│                   (Route 53 / Cloudflare)                │
└────────┬──────────────────────────┬──────────────────────┘
         │                          │
    ┌────▼────┐                ┌────▼────┐
    │  US-EAST │                │  EU-WEST │
    │  Region  │                │  Region  │
    └────┬────┘                └────┬────┘
         │                          │
    ┌────▼────────────┐    ┌────────▼────┐
    │ Edge Functions  │    │ Edge Functions│
    │ (Vercel/CF)     │    │ (Vercel/CF)  │
    └────┬────────────┘    └────────┬────┘
         │                          │
    ┌────▼─────────────────────────▼────┐
    │     Supabase (Multi-region)        │
    │  ┌──────────┐      ┌──────────┐   │
    │  │ Primary  │ ←──→ │ Replica  │   │
    │  │ (US)     │      │ (EU)     │   │
    │  └──────────┘      └──────────┘   │
    └────────────────────────────────────┘
```

## 📝 API Versioning Strategy

```typescript
// URL-based versioning
/api/v1/telemetry
/api/v2/telemetry

// Header-based versioning
X-API-Version: 2

// Backwards compatibility
// v1: Simple events
// v2: Batched events + streaming
```

## 🎯 Future Enhancements

1. **Distributed Rate Limiting**: Redis-based for multi-instance deployment
2. **Advanced Analytics**: Real-time dashboards, anomaly detection
3. **Webhook System**: Notify external systems on events
4. **GraphQL API**: Flexible querying for complex use cases
5. **Event Streaming**: Kafka/NATS for high-throughput scenarios
6. **Multi-tenancy**: Isolated databases per enterprise customer
7. **API Gateway**: Kong/Tyk for advanced routing and policies

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-17  
**Maintainer**: Iris Prime Team
