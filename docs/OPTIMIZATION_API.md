# Optimization Runs API Documentation

Production-grade API endpoints for optimization run tracking with filtering, pagination, and aggregations.

## 🎯 Overview

The Optimization API provides comprehensive CRUD operations for managing optimization experiments, tracking iterations, and analyzing performance metrics. Built with production-grade features including rate limiting, caching, and sub-200ms p99 latency.

## 🔐 Authentication

All endpoints require API key authentication via Bearer token:

```bash
Authorization: Bearer sk_live_your_api_key_here
```

## 📊 Endpoints

### 1. List Optimization Runs

**GET** `/api/iris/optimization/runs`

List optimization runs with filtering and pagination.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_id` | string | (auth project) | Filter by project ID |
| `status` | enum | - | Filter by status: `pending`, `running`, `completed`, `failed`, `cancelled` |
| `optimizer_type` | enum | - | Filter by optimizer type |
| `limit` | integer | 50 | Results per page (max: 100) |
| `offset` | integer | 0 | Pagination offset |
| `order_by` | enum | `created_at` | Sort field: `created_at`, `final_score`, `duration_ms` |
| `order` | enum | `desc` | Sort direction: `asc`, `desc` |

#### Example Request

```bash
curl -X GET "https://your-api.vercel.app/api/iris/optimization/runs?status=completed&limit=10&order_by=final_score" \
  -H "Authorization: Bearer sk_live_your_api_key"
```

#### Example Response

```json
{
  "runs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "project_id": "proj_123",
      "run_name": "Experiment A",
      "optimizer_type": "bayesian",
      "status": "completed",
      "config": {
        "learning_rate": 0.01,
        "batch_size": 32
      },
      "final_score": 0.95,
      "best_params": {
        "learning_rate": 0.001,
        "batch_size": 64
      },
      "iterations_count": 50,
      "duration_ms": 125000,
      "created_at": "2025-11-23T10:00:00Z",
      "updated_at": "2025-11-23T10:02:05Z",
      "completed_at": "2025-11-23T10:02:05Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 42,
    "hasMore": true
  },
  "metadata": {
    "latencyMs": 45,
    "timestamp": "2025-11-23T10:15:00Z"
  }
}
```

#### Response Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 2025-11-23T10:16:00Z
Cache-Control: private, max-age=30, must-revalidate
ETag: "abc123..."
X-Response-Time: 45ms
```

---

### 2. Create Optimization Run

**POST** `/api/iris/optimization/runs`

Create a new optimization run.

#### Request Body

```json
{
  "run_name": "Experiment B",
  "optimizer_type": "bayesian",
  "config": {
    "learning_rate": 0.01,
    "batch_size": 32,
    "epochs": 10
  },
  "search_space": {
    "learning_rate": [0.0001, 0.1],
    "batch_size": [16, 128]
  },
  "metadata": {
    "dataset": "imagenet",
    "model": "resnet50"
  }
}
```

#### Validation Schema

```typescript
{
  run_name: string (optional, max 200 chars)
  optimizer_type: "bayesian" | "grid_search" | "random_search" | "genetic" | "gradient_descent"
  config: object (required)
  search_space: object (optional)
  metadata: object (optional)
}
```

#### Example Request

```bash
curl -X POST "https://your-api.vercel.app/api/iris/optimization/runs" \
  -H "Authorization: Bearer sk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "run_name": "Experiment B",
    "optimizer_type": "bayesian",
    "config": {
      "learning_rate": 0.01,
      "batch_size": 32
    }
  }'
```

#### Example Response

```json
{
  "run": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "project_id": "proj_123",
    "run_name": "Experiment B",
    "optimizer_type": "bayesian",
    "status": "pending",
    "config": {
      "learning_rate": 0.01,
      "batch_size": 32
    },
    "iterations_count": 0,
    "created_at": "2025-11-23T10:20:00Z",
    "started_at": "2025-11-23T10:20:00Z"
  },
  "metadata": {
    "latencyMs": 38,
    "timestamp": "2025-11-23T10:20:00Z"
  }
}
```

---

### 3. Get Single Run

**GET** `/api/iris/optimization/runs/[id]`

Retrieve a single optimization run with all iterations.

#### Path Parameters

- `id`: Run UUID

#### Example Request

```bash
curl -X GET "https://your-api.vercel.app/api/iris/optimization/runs/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer sk_live_your_api_key"
```

#### Example Response

```json
{
  "run": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "proj_123",
    "run_name": "Experiment A",
    "optimizer_type": "bayesian",
    "status": "completed",
    "config": { "learning_rate": 0.01 },
    "final_score": 0.95,
    "best_params": { "learning_rate": 0.001 },
    "iterations_count": 50,
    "duration_ms": 125000,
    "created_at": "2025-11-23T10:00:00Z",
    "completed_at": "2025-11-23T10:02:05Z"
  },
  "iterations": [
    {
      "id": "iter_001",
      "run_id": "550e8400-e29b-41d4-a716-446655440000",
      "iteration_number": 1,
      "params": { "learning_rate": 0.01 },
      "score": 0.75,
      "metrics": { "accuracy": 0.75, "loss": 0.25 },
      "duration_ms": 2500,
      "created_at": "2025-11-23T10:00:05Z"
    }
  ],
  "stats": {
    "totalIterations": 50,
    "bestScore": 0.95,
    "worstScore": 0.65,
    "averageScore": 0.82,
    "averageDuration": 2400
  },
  "metadata": {
    "latencyMs": 52,
    "timestamp": "2025-11-23T10:25:00Z"
  }
}
```

---

### 4. Update Optimization Run

**PATCH** `/api/iris/optimization/runs/[id]`

Update run status, metrics, or results.

#### Request Body (all fields optional)

```json
{
  "status": "completed",
  "final_score": 0.95,
  "best_params": {
    "learning_rate": 0.001,
    "batch_size": 64
  },
  "iterations_count": 50,
  "duration_ms": 125000,
  "completed_at": "2025-11-23T10:02:05Z"
}
```

#### Example Request

```bash
curl -X PATCH "https://your-api.vercel.app/api/iris/optimization/runs/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer sk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "final_score": 0.95,
    "duration_ms": 125000
  }'
```

#### Example Response

```json
{
  "run": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "final_score": 0.95,
    "duration_ms": 125000,
    "updated_at": "2025-11-23T10:30:00Z"
  },
  "metadata": {
    "latencyMs": 41,
    "timestamp": "2025-11-23T10:30:00Z"
  }
}
```

---

### 5. Add Iteration

**POST** `/api/iris/optimization/runs/[id]/iterations`

Add a new iteration to an optimization run.

#### Request Body

```json
{
  "iteration_number": 1,
  "params": {
    "learning_rate": 0.01,
    "batch_size": 32
  },
  "score": 0.75,
  "metrics": {
    "accuracy": 0.75,
    "loss": 0.25,
    "f1_score": 0.73
  },
  "duration_ms": 2500,
  "metadata": {
    "gpu_usage": "85%",
    "memory_mb": 4096
  }
}
```

#### Example Request

```bash
curl -X POST "https://your-api.vercel.app/api/iris/optimization/runs/550e8400-e29b-41d4-a716-446655440000/iterations" \
  -H "Authorization: Bearer sk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "iteration_number": 1,
    "params": {"learning_rate": 0.01},
    "score": 0.75
  }'
```

#### Example Response

```json
{
  "iteration": {
    "id": "iter_001",
    "run_id": "550e8400-e29b-41d4-a716-446655440000",
    "iteration_number": 1,
    "params": { "learning_rate": 0.01 },
    "score": 0.75,
    "created_at": "2025-11-23T10:35:00Z"
  },
  "runUpdates": {
    "iterations_count": 1,
    "is_new_best": true,
    "final_score": 0.75
  },
  "metadata": {
    "latencyMs": 35,
    "timestamp": "2025-11-23T10:35:00Z"
  }
}
```

---

### 6. Get Aggregated Statistics

**GET** `/api/iris/optimization/stats`

Get aggregated statistics across optimization runs.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | string | Filter by project (optional) |
| `optimizer_type` | enum | Filter by optimizer type |
| `status` | enum | Filter by status |
| `start_date` | ISO 8601 | Filter runs created after this date |
| `end_date` | ISO 8601 | Filter runs created before this date |

#### Example Request

```bash
curl -X GET "https://your-api.vercel.app/api/iris/optimization/stats?optimizer_type=bayesian" \
  -H "Authorization: Bearer sk_live_your_api_key"
```

#### Example Response

```json
{
  "statistics": {
    "totalRuns": 142,
    "successRate": 87.32,
    "averageImprovement": 0.8245,
    "averageDuration": 118500
  },
  "byStatus": {
    "pending": 5,
    "running": 12,
    "completed": 124,
    "failed": 8,
    "cancelled": 3
  },
  "byOptimizerType": [
    {
      "optimizerType": "bayesian",
      "count": 85,
      "successRate": 91.76,
      "averageScore": 0.8534,
      "averageDuration": 125000
    },
    {
      "optimizerType": "random_search",
      "count": 42,
      "successRate": 80.95,
      "averageScore": 0.7856,
      "averageDuration": 95000
    }
  ],
  "topPerformers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "run_name": "Experiment A",
      "optimizer_type": "bayesian",
      "final_score": 0.95,
      "duration_ms": 125000,
      "created_at": "2025-11-23T10:00:00Z"
    }
  ],
  "recentTrends": [
    {
      "date": "2025-11-22",
      "count": 15,
      "completed": 13,
      "failed": 2
    },
    {
      "date": "2025-11-23",
      "count": 8,
      "completed": 7,
      "failed": 1
    }
  ],
  "metadata": {
    "filters": {
      "projectId": "proj_123",
      "optimizerType": "bayesian",
      "status": null,
      "startDate": null,
      "endDate": null
    },
    "latencyMs": 87,
    "timestamp": "2025-11-23T10:40:00Z"
  }
}
```

#### Response Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
Cache-Control: private, max-age=300, must-revalidate
ETag: "stats-proj_123-142-..."
X-Response-Time: 87ms
```

---

## 🚀 Performance Characteristics

### Latency Targets

- **GET requests**: p99 < 100ms
- **POST/PATCH requests**: p99 < 150ms
- **Stats aggregations**: p99 < 200ms

### Caching Strategy

| Endpoint | Cache Duration | Strategy |
|----------|---------------|----------|
| List runs | 30 seconds | Private, must-revalidate |
| Single run | 60 seconds | Private, must-revalidate, ETag |
| Stats | 300 seconds | Private, aggressive caching |

### Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| Read (GET) | 1000 req | 60 seconds |
| Write (POST/PATCH) | 500 req | 60 seconds |
| Iterations | 2000 req | 60 seconds |

---

## 🔧 Database Schema

```sql
-- Optimization runs table
CREATE TABLE optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  run_name text,
  optimizer_type text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  config jsonb NOT NULL DEFAULT '{}',
  search_space jsonb DEFAULT '{}',
  final_score numeric,
  best_params jsonb,
  metadata jsonb DEFAULT '{}',
  iterations_count integer DEFAULT 0,
  duration_ms bigint,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Optimization iterations table
CREATE TABLE optimization_iterations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES optimization_runs(id) ON DELETE CASCADE,
  iteration_number integer NOT NULL,
  params jsonb NOT NULL,
  score numeric NOT NULL,
  metrics jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);
```

---

## ❌ Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid query parameters",
  "issues": {
    "fieldErrors": {
      "limit": ["Must be between 1 and 100"]
    }
  },
  "timestamp": "2025-11-23T10:45:00Z"
}
```

### 401 Unauthorized

```json
{
  "error": "Authorization header is required",
  "hint": "Include \"Authorization: Bearer <your-api-key>\" header",
  "timestamp": "2025-11-23T10:45:00Z"
}
```

### 404 Not Found

```json
{
  "error": "Optimization run not found",
  "hint": "Check that the run ID is correct and belongs to your project",
  "timestamp": "2025-11-23T10:45:00Z"
}
```

### 429 Rate Limit Exceeded

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45,
  "timestamp": "2025-11-23T10:45:00Z"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "timestamp": "2025-11-23T10:45:00Z"
}
```

---

## 📝 Best Practices

### 1. Use Pagination

Always use pagination for list endpoints to avoid large payloads:

```bash
# Good: Paginated requests
GET /api/iris/optimization/runs?limit=50&offset=0

# Avoid: Fetching all records
GET /api/iris/optimization/runs?limit=10000
```

### 2. Leverage Caching

Use `If-None-Match` header with ETag for conditional requests:

```bash
curl -H "If-None-Match: \"abc123...\"" \
  https://your-api.vercel.app/api/iris/optimization/runs/550e8400...
```

### 3. Filter Early

Apply filters to reduce payload size:

```bash
# Good: Filtered query
GET /api/iris/optimization/runs?status=completed&optimizer_type=bayesian

# Avoid: Fetching all and filtering client-side
GET /api/iris/optimization/runs
```

### 4. Monitor Rate Limits

Check response headers to monitor rate limit usage:

```javascript
const response = await fetch('/api/iris/optimization/runs');
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');
```

### 5. Batch Iterations

When adding multiple iterations, batch them efficiently:

```javascript
// Add iterations sequentially
for (const iteration of iterations) {
  await addIteration(runId, iteration);
  await sleep(50); // Small delay to avoid rate limits
}
```

---

## 🧪 Testing

### Sample cURL Commands

```bash
# List runs
curl -X GET "https://your-api.vercel.app/api/iris/optimization/runs?limit=10" \
  -H "Authorization: Bearer sk_live_test_key"

# Create run
curl -X POST "https://your-api.vercel.app/api/iris/optimization/runs" \
  -H "Authorization: Bearer sk_live_test_key" \
  -H "Content-Type: application/json" \
  -d '{"optimizer_type":"bayesian","config":{}}'

# Get single run
curl -X GET "https://your-api.vercel.app/api/iris/optimization/runs/{run_id}" \
  -H "Authorization: Bearer sk_live_test_key"

# Update run
curl -X PATCH "https://your-api.vercel.app/api/iris/optimization/runs/{run_id}" \
  -H "Authorization: Bearer sk_live_test_key" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","final_score":0.95}'

# Add iteration
curl -X POST "https://your-api.vercel.app/api/iris/optimization/runs/{run_id}/iterations" \
  -H "Authorization: Bearer sk_live_test_key" \
  -H "Content-Type: application/json" \
  -d '{"iteration_number":1,"params":{},"score":0.75}'

# Get stats
curl -X GET "https://your-api.vercel.app/api/iris/optimization/stats" \
  -H "Authorization: Bearer sk_live_test_key"
```

---

## 📚 TypeScript SDK Example

```typescript
import { OptimizationClient } from '@iris/sdk';

const client = new OptimizationClient({
  apiKey: process.env.IRIS_API_KEY,
  baseUrl: 'https://your-api.vercel.app',
});

// Create a new run
const run = await client.runs.create({
  runName: 'Experiment A',
  optimizerType: 'bayesian',
  config: {
    learningRate: 0.01,
    batchSize: 32,
  },
});

// Add iterations
for (let i = 0; i < 10; i++) {
  await client.iterations.create(run.id, {
    iterationNumber: i,
    params: { learningRate: 0.01 * (i + 1) },
    score: Math.random(),
  });
}

// Complete the run
await client.runs.update(run.id, {
  status: 'completed',
  finalScore: 0.95,
});

// Get statistics
const stats = await client.stats.get();
console.log(`Success rate: ${stats.successRate}%`);
```

---

## 🔒 Security Considerations

1. **API Key Security**: Store API keys in environment variables, never in code
2. **Rate Limiting**: Enforced at both IP and API key level
3. **Input Validation**: All inputs validated with Zod schemas
4. **SQL Injection**: Prevented through parameterized queries
5. **CORS**: Configured for allowed origins only

---

## 📊 Monitoring

Track these metrics for production monitoring:

- **Response times**: p50, p95, p99 latencies
- **Error rates**: 4xx and 5xx response codes
- **Rate limit hits**: Track how often limits are reached
- **Cache hit rates**: Monitor ETag effectiveness
- **Database query times**: Identify slow queries

---

## 🆘 Support

For issues or questions:
- **Documentation**: `/docs/OPTIMIZATION_API.md`
- **Schema**: `/scripts/create-optimization-runs-table.sql`
- **Status**: Check API health at `/api/health`
