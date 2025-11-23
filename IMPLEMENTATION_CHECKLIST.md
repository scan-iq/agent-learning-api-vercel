# Performance Optimization Implementation Checklist

Use this checklist to track your implementation progress.

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] Vercel account with deployment access
- [ ] Supabase project access
- [ ] Test API key available

## Phase 1: Setup & Dependencies (15 minutes)

### Install Dependencies
- [ ] Run `npm install`
- [ ] Verify `@vercel/kv` is installed
- [ ] Verify `tsx` is installed (for running scripts)

### Verify Environment
- [ ] Supabase connection working
- [ ] API endpoints accessible
- [ ] Test API key valid

**Verification:**
```bash
curl -H "Authorization: Bearer sk_live_..." https://your-api.vercel.app/api/iris/overview
# Should return 200 OK
```

## Phase 2: Database Optimization (30 minutes)

### Create Indexes
- [ ] Open Supabase SQL Editor
- [ ] Copy SQL from `lib/query-optimizer.ts` → `SQL_TEMPLATES.createIndexes`
- [ ] Execute SQL
- [ ] Verify indexes created

**Verification SQL:**
```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Expected**: 15+ indexes shown

### Create Database Functions
- [ ] Copy SQL for `get_token_stats` from `lib/query-optimizer.ts`
- [ ] Execute SQL
- [ ] Copy SQL for `get_performance_stats`
- [ ] Execute SQL
- [ ] Verify functions created

**Verification SQL:**
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_token_stats', 'get_performance_stats');
```

**Expected**: 2 functions shown

## Phase 3: Enable Vercel KV (20 minutes)

### Create KV Database
- [ ] Run `vercel kv create iris-cache`
- [ ] Select your project
- [ ] Note the database name

### Configure Environment
- [ ] Run `vercel link` (if not already linked)
- [ ] Run `vercel env pull .env.local`
- [ ] Verify `KV_REST_API_URL` in `.env.local`
- [ ] Verify `KV_REST_API_TOKEN` in `.env.local`

**Verification:**
```bash
grep "KV_REST_API" .env.local
# Should show both URL and TOKEN
```

### Deploy Environment Variables
- [ ] Run `vercel env add KV_REST_API_URL` (production)
- [ ] Run `vercel env add KV_REST_API_TOKEN` (production)
- [ ] Verify in Vercel dashboard → Settings → Environment Variables

## Phase 4: Update Code (1 hour)

### Option A: Use Optimized Endpoint (Recommended)
- [ ] Backup current endpoint: `mv api/iris/overview.ts api/iris/overview.old.ts`
- [ ] Rename optimized: `mv api/iris/overview-optimized.ts api/iris/overview.ts`
- [ ] Test locally

### Option B: Manual Implementation
For each endpoint to optimize:
- [ ] Add imports for `observability`, `cache`, `query-optimizer`
- [ ] Wrap handler with `Timer` for metrics
- [ ] Replace queries with `executeQuery()` for caching
- [ ] Add HTTP caching headers
- [ ] Add ETag support
- [ ] Test endpoint

**Example Import Block:**
```typescript
import { getQueryCache, httpCache } from '../../lib/cache.js';
import { Timer, httpMetrics } from '../../lib/observability.js';
import { executeQuery } from '../../lib/query-optimizer.js';
```

### Initialize Caches
- [ ] Create `api/_middleware.ts` (if not exists)
- [ ] Add cache initialization code
- [ ] Verify caches initialize on startup

**Middleware Code:**
```typescript
import { kv } from '@vercel/kv';
import { initializeCaches } from '../lib/cache.js';

initializeCaches(kv);

export function middleware(request) {
  return NextResponse.next();
}
```

## Phase 5: Test Locally (30 minutes)

### Run Benchmarks Locally
- [ ] Start local dev server: `npm run dev`
- [ ] Set test API key: `export BENCHMARK_API_KEY="sk_live_..."`
- [ ] Run benchmark: `npm run benchmark:local`

**Success Criteria:**
- [ ] Benchmark completes without errors
- [ ] P95 latency shown
- [ ] P99 latency shown
- [ ] Cache hit rate shown

### Verify Optimizations
- [ ] Cache hit rate > 50% (will be higher in production)
- [ ] No database errors in logs
- [ ] All endpoints return 200 OK

## Phase 6: Deploy to Staging (20 minutes)

### Deploy
- [ ] Run `vercel deploy` (preview/staging)
- [ ] Wait for deployment to complete
- [ ] Note deployment URL

### Test Deployment
- [ ] Set deployment URL: `export BENCHMARK_URL="https://your-deployment.vercel.app"`
- [ ] Set test API key: `export BENCHMARK_API_KEY="sk_live_..."`
- [ ] Run smoke test: `npm run load-test:smoke`

**Success Criteria:**
- [ ] Smoke test passes
- [ ] No errors in Vercel logs
- [ ] Cache metrics showing hits

### Run Full Benchmark
- [ ] Run `npm run benchmark`
- [ ] Review results

**Target Metrics:**
- [ ] P95 < 150ms
- [ ] P99 < 200ms
- [ ] Cache hit rate > 70%
- [ ] Error rate < 1%

## Phase 7: Deploy to Production (30 minutes)

### Pre-Deployment Checklist
- [ ] All staging tests passed
- [ ] Database indexes verified
- [ ] Vercel KV enabled in production
- [ ] Environment variables set in production
- [ ] Backup plan documented

### Deploy
- [ ] Run `vercel deploy --prod`
- [ ] Wait for deployment
- [ ] Monitor Vercel logs

### Post-Deployment Verification
- [ ] Run smoke test against production: `npm run load-test:smoke`
- [ ] Run full benchmark: `npm run benchmark`
- [ ] Check metrics endpoint: `curl https://your-api.vercel.app/api/metrics`

**Success Criteria:**
- [ ] P95 < 150ms ✅
- [ ] P99 < 200ms ✅
- [ ] Cache hit rate > 85% ✅
- [ ] Error rate < 1% ✅
- [ ] No 5xx errors in logs ✅

## Phase 8: Monitoring Setup (30 minutes)

### Create Metrics Endpoint
- [ ] Create `api/metrics.ts`
- [ ] Implement metrics export
- [ ] Test endpoint: `curl https://your-api.vercel.app/api/metrics`

### Configure Alerts (Optional but Recommended)
- [ ] Set up Datadog/Grafana dashboard
- [ ] Configure alert: P95 > 200ms (warning)
- [ ] Configure alert: P99 > 300ms (critical)
- [ ] Configure alert: Cache hit rate < 70% (warning)
- [ ] Configure alert: Error rate > 2% (critical)

### Document Baselines
- [ ] Record initial P95/P99 latency
- [ ] Record cache hit rates
- [ ] Record throughput
- [ ] Save benchmark results

## Phase 9: Load Testing (1 hour)

### Run Load Tests
- [ ] Smoke test: `npm run load-test:smoke` (30s)
- [ ] Load test: `npm run load-test:load` (5min)
- [ ] Review results

**Optional Stress Testing:**
- [ ] Stress test: `npm run load-test:stress` (10min)
- [ ] Spike test: `npm run load-test:spike` (3min)

### Verify Under Load
- [ ] P95 remains < 150ms
- [ ] P99 remains < 200ms
- [ ] Cache hit rate remains > 85%
- [ ] Error rate remains < 1%
- [ ] No timeouts or connection errors

## Phase 10: Documentation & Handoff (30 minutes)

### Update Documentation
- [ ] Document performance baselines
- [ ] Document cache TTLs used
- [ ] Document monitoring setup
- [ ] Document rollback procedure

### Team Handoff
- [ ] Share benchmark results
- [ ] Share monitoring dashboard
- [ ] Share alert configuration
- [ ] Schedule performance review meeting

## Rollback Plan (if needed)

### Quick Rollback
- [ ] `git revert <commit-hash>`
- [ ] `vercel deploy --prod`
- [ ] Verify service restored

### Disable Caching Temporarily
- [ ] Edit `lib/cache.ts`
- [ ] Set all `cacheTTL` to 0
- [ ] Deploy
- [ ] Investigate issues in lower environment

## Success Verification

### Performance Targets
- [ ] ✅ P95 < 150ms achieved
- [ ] ✅ P99 < 200ms achieved
- [ ] ✅ Cache hit rate > 85% achieved
- [ ] ✅ Error rate < 1% achieved
- [ ] ✅ All bottlenecks addressed
- [ ] ✅ Monitoring instrumented

### Business Outcomes
- [ ] 65% latency reduction achieved
- [ ] 4x scalability improvement achieved
- [ ] Cost reduction measured
- [ ] User experience improved

## Post-Implementation

### Week 1
- [ ] Monitor performance daily
- [ ] Review error logs
- [ ] Track cache hit rates
- [ ] Validate cost savings

### Week 2-4
- [ ] Run weekly load tests
- [ ] Review performance trends
- [ ] Optimize cache TTLs if needed
- [ ] Expand optimizations to more endpoints

### Month 2+
- [ ] Evaluate semantic caching
- [ ] Consider database read replicas
- [ ] Explore edge function opportunities
- [ ] Plan next optimization phase

---

## Troubleshooting

### Cache Not Working
**Issue**: Cache hit rate < 30%

**Check:**
- [ ] Vercel KV enabled: `vercel env ls`
- [ ] Environment variables set
- [ ] No KV errors in logs
- [ ] `initializeCaches(kv)` called

### High Latency
**Issue**: P95 > 200ms

**Check:**
- [ ] Database indexes created
- [ ] Postgres functions deployed
- [ ] Cache TTL appropriate
- [ ] No slow queries in pg_stat_statements

### Errors After Deployment
**Issue**: Increased error rate

**Check:**
- [ ] Vercel logs for stack traces
- [ ] Database connection working
- [ ] Environment variables correct
- [ ] Rate limits not too strict

---

## Completion

**Implementation Date**: _________________

**Deployed By**: _________________

**Performance Results:**
- P95 Latency: _______ ms
- P99 Latency: _______ ms
- Cache Hit Rate: _______ %
- Error Rate: _______ %

**Status**:
- [ ] All phases complete
- [ ] All tests passing
- [ ] Monitoring active
- [ ] Team informed

**Next Review Date**: _________________

---

**Questions or Issues?**
- Check: `PERFORMANCE.md` for detailed guide
- Check: `docs/OPTIMIZATION_QUICK_START.md` for quick reference
- Check: `docs/PERFORMANCE_README.md` for examples
- Check: Vercel logs for errors
- Create issue in repository

**Congratulations on optimizing the API! 🎉**
