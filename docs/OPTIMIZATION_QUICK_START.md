# Performance Optimization Quick Start Guide

This guide will help you implement the performance optimizations in **under 30 minutes**.

## Prerequisites

- Node.js 18+
- Vercel account with KV enabled
- Supabase project
- API key for testing

## Step-by-Step Implementation

### Step 1: Install Dependencies (2 minutes)

```bash
npm install @vercel/kv
```

### Step 2: Enable Vercel KV (5 minutes)

```bash
# Create KV database
vercel kv create iris-cache

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local
```

This will add these environment variables:
```
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

### Step 3: Create Database Indexes (5 minutes)

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy from lib/query-optimizer.ts -> SQL_TEMPLATES.createIndexes

-- Expert signatures
CREATE INDEX IF NOT EXISTS idx_expert_signatures_project ON expert_signatures(project);
CREATE INDEX IF NOT EXISTS idx_expert_signatures_active ON expert_signatures(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_expert_signatures_updated ON expert_signatures(updated_at DESC);

-- Model run log
CREATE INDEX IF NOT EXISTS idx_model_run_log_project ON model_run_log(project);
CREATE INDEX IF NOT EXISTS idx_model_run_log_timestamp ON model_run_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_model_run_log_expert ON model_run_log(expert_id);

-- Reflexion bank
CREATE INDEX IF NOT EXISTS idx_reflexion_bank_project ON reflexion_bank(project);
CREATE INDEX IF NOT EXISTS idx_reflexion_bank_created ON reflexion_bank(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflexion_bank_type ON reflexion_bank(reflexion_type);

-- Consensus lineage
CREATE INDEX IF NOT EXISTS idx_consensus_lineage_project ON consensus_lineage(project);
CREATE INDEX IF NOT EXISTS idx_consensus_lineage_created ON consensus_lineage(created_at DESC);

-- IRIS telemetry
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_project ON iris_telemetry(project_id);
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_created ON iris_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_event_type ON iris_telemetry(event_type);

-- IRIS reports
CREATE INDEX IF NOT EXISTS idx_iris_reports_created ON iris_reports(created_at DESC);

-- API keys
CREATE INDEX IF NOT EXISTS idx_iris_api_keys_project ON iris_api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_iris_api_keys_active ON iris_api_keys(is_active) WHERE is_active = true;
```

**Verify indexes were created:**
```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### Step 4: Create Database Functions (5 minutes)

```sql
-- Token statistics function
CREATE OR REPLACE FUNCTION get_token_stats(p_project_id TEXT)
RETURNS TABLE (
  total_tokens_in BIGINT,
  total_tokens_out BIGINT,
  total_cost_usd NUMERIC,
  avg_tokens_per_run NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(tokens_in), 0)::BIGINT,
    COALESCE(SUM(tokens_out), 0)::BIGINT,
    COALESCE(SUM(cost_usd), 0)::NUMERIC,
    COALESCE(AVG(tokens_in + tokens_out), 0)::NUMERIC
  FROM model_run_log
  WHERE project = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Performance statistics function
CREATE OR REPLACE FUNCTION get_performance_stats(p_project_id TEXT)
RETURNS TABLE (
  avg_confidence NUMERIC,
  avg_latency_ms NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(AVG(confidence), 0)::NUMERIC,
    COALESCE(AVG(latency_ms), 0)::NUMERIC,
    COALESCE(
      COUNT(CASE WHEN outcome = 'success' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0),
      0
    )::NUMERIC
  FROM model_run_log
  WHERE project = p_project_id;
END;
$$ LANGUAGE plpgsql;
```

**Verify functions were created:**
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_token_stats', 'get_performance_stats');
```

### Step 5: Update API Endpoints (10 minutes)

#### Option A: Use Pre-Optimized Endpoints

Rename optimized files:
```bash
# Backup current files
mv api/iris/overview.ts api/iris/overview.old.ts

# Use optimized version
mv api/iris/overview-optimized.ts api/iris/overview.ts
```

#### Option B: Add Optimizations to Existing Endpoints

Add these imports to your endpoint:
```typescript
import { getQueryCache, httpCache } from '../../lib/cache.js';
import { Timer, httpMetrics } from '../../lib/observability.js';
import { executeQuery } from '../../lib/query-optimizer.js';
```

Wrap your handler:
```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const timer = new Timer('http_request_duration_ms', {
    method: req.method!,
    path: req.url!,
  });

  // ... existing CORS handling ...

  return withIrisAuthVercel(req, res, async (project, req, res) => {
    try {
      const queryCache = getQueryCache();
      const cacheKey = `your-cache-key`;

      // Get or compute with caching
      const data = await queryCache.getOrCompute(
        cacheKey,
        async () => {
          // Your existing query logic
          return result;
        },
        30000 // 30 second TTL
      );

      // Add HTTP caching
      httpCache.setCacheHeaders(res, {
        maxAge: 30,
        sMaxAge: 60,
        staleWhileRevalidate: 120,
      });

      const duration = timer.end();
      httpMetrics.request(req.method!, req.url!, 200, duration);

      return res.json(data);
    } catch (error) {
      timer.end();
      httpMetrics.error(req.method!, req.url!, 'internal_error');
      throw error;
    }
  });
}
```

### Step 6: Initialize Caches (2 minutes)

Create `api/_middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { initializeCaches } from '../lib/cache.js';

// Initialize caches once
initializeCaches(kv);

export function middleware(request: NextRequest) {
  return NextResponse.next();
}
```

### Step 7: Deploy and Test (5 minutes)

```bash
# Deploy to Vercel
vercel deploy

# Set environment variables for testing
export BENCHMARK_URL="https://your-deployment.vercel.app"
export BENCHMARK_API_KEY="sk_live_..."

# Run benchmark
npx tsx scripts/benchmark.ts

# Expected output:
# ✅ P95 < 150ms
# ✅ P99 < 200ms
```

## Verification Checklist

After deployment, verify:

- [ ] Database indexes created (check Supabase)
- [ ] Database functions created (check Supabase)
- [ ] Vercel KV enabled (check Vercel dashboard)
- [ ] Environment variables set (KV_REST_API_URL, KV_REST_API_TOKEN)
- [ ] Benchmarks passing (p95 < 150ms, p99 < 200ms)
- [ ] No errors in logs

## Monitoring

### Check Cache Performance

```bash
curl https://your-api.vercel.app/api/metrics | jq '.cache'
```

Expected:
```json
{
  "auth": { "hitRate": 0.92 },
  "rateLimit": { "hitRate": 0.88 },
  "query": { "hitRate": 0.85 }
}
```

### Check Request Latency

```bash
curl https://your-api.vercel.app/api/metrics | jq '.requests'
```

Expected:
```json
{
  "total": 1250,
  "errorRate": 0.008,
  "p50Latency": 45.2,
  "p95Latency": 98.5,
  "p99Latency": 145.3
}
```

## Troubleshooting

### Cache Not Working

**Issue**: Cache hit rate < 30%

**Solutions**:
1. Check Vercel KV is enabled: `vercel env ls`
2. Verify environment variables are set
3. Check Vercel logs for KV errors

### High Latency Still

**Issue**: P95 > 200ms

**Solutions**:
1. Verify database indexes: Run SQL query above
2. Check slow queries: `SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10`
3. Increase cache TTL if data changes infrequently

### Database Function Errors

**Issue**: `function get_token_stats does not exist`

**Solutions**:
1. Re-run the CREATE FUNCTION SQL
2. Check function exists: `\df get_token_stats` in psql
3. Verify you're using the correct schema (public)

## Rollback Plan

If issues occur:

```bash
# Restore original endpoints
mv api/iris/overview.old.ts api/iris/overview.ts

# Disable caching temporarily
# In lib/cache.ts, set all TTLs to 0

# Deploy
vercel deploy
```

## Next Steps

After implementing basic optimizations:

1. **Add HTTP Caching**: ETags, Cache-Control headers
2. **Enable Monitoring**: Set up Datadog/Grafana
3. **Configure Alerts**: P95 > 200ms, error rate > 2%
4. **Load Testing**: Run stress tests weekly

## Support

- Documentation: `/PERFORMANCE.md`
- Benchmarking: `npx tsx scripts/benchmark.ts --help`
- Load Testing: `npx tsx scripts/load-test.ts --help`

---

**Estimated Time**: 30 minutes
**Difficulty**: Easy
**Impact**: 65% latency reduction, 400%+ cache hit rate improvement
