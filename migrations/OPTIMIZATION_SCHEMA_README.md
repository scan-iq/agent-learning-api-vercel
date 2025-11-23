# Optimization Runs Schema Documentation

## Overview

This schema provides comprehensive tracking for DSPy MIPROv2 and other optimization runs, designed for high-performance queries (<200ms target) and multi-tenant isolation.

## Schema Components

### Tables

#### 1. `optimization_runs`
Main table tracking optimization runs.

**Key Features:**
- Multi-tenant isolation via `project_id` FK to `project_config(id)`
- Status tracking: `pending`, `running`, `completed`, `failed`, `cancelled`
- Computed columns: `duration_ms`, `improvement`, `improvement_pct` (GENERATED ALWAYS)
- JSONB fields for flexible configuration and metadata storage
- Array field for tags (filterable via GIN index)

**Performance Metrics:**
- Initial, final, and best scores (NUMERIC(7,4) for precision)
- Sample statistics (evaluated, successful, failed)
- Resource usage (tokens, cost, latency)

**Constraints:**
- Scores must be between 0 and 1
- End time must be >= start time
- Sample counts must be consistent

#### 2. `optimization_iterations`
Detailed iteration-level tracking within an optimization run.

**Key Features:**
- One-to-many relationship with `optimization_runs`
- Tracks score progression and identifies best iteration
- Stores program/prompt state at each iteration
- Cascade delete when parent run is deleted

**Unique Constraint:**
- `(run_id, iteration)` - prevents duplicate iteration numbers

#### 3. `optimization_samples`
Individual sample evaluations during optimization.

**Key Features:**
- Stores input/output pairs and evaluation scores
- Links to both run and iteration
- Program hash for deduplication
- Supports error tracking per sample

**Unique Constraint:**
- `(run_id, iteration, sample_index)` - prevents duplicates

### Indexes

All indexes are designed for <200ms query performance:

#### Standard B-tree Indexes

```sql
-- Primary queries: list runs by project
idx_optimization_runs_project_id (project_id, created_at DESC)

-- Filter by status
idx_optimization_runs_status (project_id, status, created_at DESC)

-- Filter by optimizer type
idx_optimization_runs_optimizer_type (project_id, optimizer_type, created_at DESC)

-- Search by name
idx_optimization_runs_run_name (project_id, run_name)

-- Performance leaderboard (completed runs only)
idx_optimization_runs_performance (project_id, final_score DESC NULLS LAST, created_at DESC)
  WHERE status = 'completed'
```

#### GIN Indexes (for JSONB and arrays)

```sql
-- Query config fields (e.g., model, temperature)
idx_optimization_runs_config_gin ON optimization_runs USING GIN (config)

-- Query metadata
idx_optimization_runs_metadata_gin ON optimization_runs USING GIN (metadata)

-- Filter by tags
idx_optimization_runs_tags_gin ON optimization_runs USING GIN (tags)

-- Query iteration params
idx_optimization_iterations_params_gin ON optimization_iterations USING GIN (params)
```

### Index Strategy Rationale

1. **Composite Indexes First**: Most queries filter by `project_id` + other columns, so composite indexes reduce index scans
2. **DESC Ordering**: Recent data is queried most often, so DESC indexes improve performance
3. **Partial Indexes**: The performance leaderboard index is partial (WHERE status = 'completed') to reduce size
4. **GIN for JSONB**: Enables fast queries like `config->>'model' = 'gpt-4'` or `tags @> ARRAY['production']`
5. **Covering Indexes**: Common queries fetch `created_at`, included in composite indexes to avoid heap lookups

## Row Level Security (RLS)

All tables have RLS enabled with two policies:

### Service Role Policy
```sql
-- Full access for backend operations
CREATE POLICY "Service role has full access"
  ON {table_name}
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

### Authenticated User Policy
```sql
-- Users can only access their own project data
CREATE POLICY "Users can manage own project {table_name}"
  ON {table_name}
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM project_config))
  WITH CHECK (project_id IN (SELECT id FROM project_config));
```

**Multi-Tenant Isolation:**
- Projects are isolated via `project_id` foreign key
- RLS policies enforce access control at the database level
- Even if application logic fails, database enforces isolation

## Triggers & Functions

### Auto-Update Triggers

1. **update_optimization_runs_updated_at**
   - Updates `updated_at` timestamp on every row update
   - Triggered: BEFORE UPDATE on `optimization_runs`

2. **update_run_statistics_from_iterations**
   - Automatically aggregates stats from iterations to parent run
   - Updates: `iterations`, `best_score`, `avg_latency_ms`, `total_tokens`, `total_cost_usd`
   - Triggered: AFTER INSERT OR UPDATE on `optimization_iterations`

3. **mark_best_iteration**
   - Automatically sets `is_best = true` for highest scoring iteration
   - Resets all other iterations to `is_best = false`
   - Triggered: AFTER INSERT OR UPDATE OF score on `optimization_iterations`

### Helper Functions

#### get_optimization_run_summary(run_id UUID)
Returns a comprehensive summary for a single run.

**Usage:**
```sql
SELECT * FROM get_optimization_run_summary('550e8400-e29b-41d4-a716-446655440000');
```

**Performance:** <10ms (single row lookup)

#### get_top_runs_by_score(project_id TEXT, limit INTEGER)
Returns top N runs by final score for a project.

**Usage:**
```sql
SELECT * FROM get_top_runs_by_score('proj_123', 10);
```

**Performance:** <50ms (uses performance index)

#### refresh_optimization_analytics()
Refreshes the materialized view for analytics.

**Usage:**
```sql
SELECT refresh_optimization_analytics();
```

**Performance:** ~500ms-2s depending on data volume
**Recommendation:** Refresh periodically (e.g., hourly) or on-demand

## Materialized View

### optimization_run_analytics

Provides pre-aggregated analytics by project, optimizer type, and status.

**Benefits:**
- Fast aggregations without scanning all rows
- Reduces load on primary tables
- Supports dashboard queries

**Refresh Strategy:**
- Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` to avoid locking
- Refresh frequency: hourly or after significant data changes
- Consider pg_cron for automated refreshes

**Query Example:**
```sql
-- Get analytics for a project
SELECT * FROM optimization_run_analytics
WHERE project_id = 'proj_123'
ORDER BY optimizer_type, status;
```

**Performance:** <20ms (small table, unique index)

## Expected Query Patterns

### 1. List Runs (with pagination)
```sql
SELECT * FROM optimization_runs
WHERE project_id = 'proj_123'
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```
**Index Used:** `idx_optimization_runs_status`
**Expected Performance:** <50ms

### 2. Filter by Tags
```sql
SELECT * FROM optimization_runs
WHERE project_id = 'proj_123'
  AND tags @> ARRAY['production', 'experiment-1']
ORDER BY created_at DESC;
```
**Index Used:** `idx_optimization_runs_tags_gin`
**Expected Performance:** <100ms

### 3. Search by Config
```sql
SELECT * FROM optimization_runs
WHERE project_id = 'proj_123'
  AND config->>'model' = 'gpt-4'
  AND config->'miprov2'->>'num_candidates' = '10'
ORDER BY created_at DESC;
```
**Index Used:** `idx_optimization_runs_config_gin`
**Expected Performance:** <150ms

### 4. Get Leaderboard (Top Scores)
```sql
SELECT id, run_name, final_score, improvement, created_at
FROM optimization_runs
WHERE project_id = 'proj_123'
  AND status = 'completed'
ORDER BY final_score DESC NULLS LAST
LIMIT 10;
```
**Index Used:** `idx_optimization_runs_performance` (partial index)
**Expected Performance:** <30ms

### 5. Get Run with Iterations
```sql
-- Run details
SELECT * FROM optimization_runs WHERE id = :run_id;

-- All iterations for run
SELECT * FROM optimization_iterations
WHERE run_id = :run_id
ORDER BY iteration;

-- Best iteration only
SELECT * FROM optimization_iterations
WHERE run_id = :run_id AND is_best = true;
```
**Index Used:** `idx_optimization_iterations_run_id`, `idx_optimization_iterations_best`
**Expected Performance:** <50ms total

### 6. Get Samples for Analysis
```sql
SELECT * FROM optimization_samples
WHERE run_id = :run_id
  AND iteration = :iteration
ORDER BY sample_index
LIMIT 100;
```
**Index Used:** `idx_optimization_samples_run_id`
**Expected Performance:** <100ms

### 7. Aggregate Stats
```sql
-- Use materialized view for fast aggregations
SELECT
  optimizer_type,
  SUM(completed_runs) as total_completed,
  AVG(avg_final_score) as overall_avg_score,
  SUM(total_cost_usd) as total_spend
FROM optimization_run_analytics
WHERE project_id = 'proj_123'
GROUP BY optimizer_type;
```
**Index Used:** `idx_optimization_run_analytics_pk`
**Expected Performance:** <20ms

## Performance Optimization Tips

### For Large Datasets

1. **Partitioning** (if >1M runs per project):
   ```sql
   -- Partition by project_id for data isolation
   CREATE TABLE optimization_runs_partitioned (
     LIKE optimization_runs INCLUDING ALL
   ) PARTITION BY LIST (project_id);
   ```

2. **Index Maintenance**:
   - Run `VACUUM ANALYZE optimization_runs` periodically
   - Monitor index bloat with `pg_stat_user_indexes`
   - Reindex if fragmented: `REINDEX INDEX CONCURRENTLY idx_name`

3. **Query Optimization**:
   - Use `EXPLAIN ANALYZE` to verify index usage
   - Avoid `SELECT *` when possible
   - Use pagination with `LIMIT/OFFSET` or cursor-based paging
   - Batch writes (use `batchCreateOptimizationSamples`)

4. **Connection Pooling**:
   - Use Supabase connection pooler (PgBouncer)
   - Limit concurrent connections per project

### For High Write Throughput

1. **Batch Inserts**:
   ```typescript
   // Instead of 100 individual inserts
   await batchCreateOptimizationSamples(samples);
   ```

2. **Disable Triggers Temporarily** (for bulk loads):
   ```sql
   ALTER TABLE optimization_iterations DISABLE TRIGGER trigger_update_run_statistics;
   -- Bulk insert here
   ALTER TABLE optimization_iterations ENABLE TRIGGER trigger_update_run_statistics;
   ```

3. **Use Unlogged Tables** (for temp data):
   - Not recommended for production data
   - Useful for staging/testing

## TypeScript Integration

### Usage Examples

```typescript
import {
  createOptimizationRun,
  updateOptimizationRun,
  listOptimizationRuns,
  createOptimizationIteration,
  getTopRunsByScore,
} from './lib/supabase-optimization';

// Create a new run
const run = await createOptimizationRun({
  projectId: 'proj_123',
  runName: 'Experiment 1',
  optimizerType: 'miprov2',
  config: {
    optimizer: 'miprov2',
    metric: 'accuracy',
    miprov2: {
      metric: 'accuracy',
      num_candidates: 10,
      init_temperature: 1.0,
    },
  },
  tags: ['production', 'v2'],
});

// Update run with results
await updateOptimizationRun(run.id, {
  status: 'completed',
  finalScore: 0.9234,
  iterations: 10,
  samplesEvaluated: 100,
});

// List runs with filters
const { data, total } = await listOptimizationRuns({
  projectId: 'proj_123',
  status: 'completed',
  minScore: 0.8,
  orderBy: 'final_score',
  orderDirection: 'desc',
  limit: 20,
});

// Add iteration
await createOptimizationIteration({
  runId: run.id,
  iteration: 1,
  score: 0.85,
  params: { temperature: 0.7, num_demos: 5 },
});

// Get leaderboard
const topRuns = await getTopRunsByScore('proj_123', 10);
```

### Type Safety

All functions have full TypeScript support:
- Input validation via Zod schemas
- Type inference for request/response objects
- Automatic snake_case ↔ camelCase conversion

## Migration Workflow

### Initial Setup
```bash
# 1. Run migration in Supabase
psql $DATABASE_URL -f migrations/001_optimization_runs.sql

# 2. Verify tables created
psql $DATABASE_URL -c "\dt optimization_*"

# 3. Test with sample data
npm run test:optimization-schema
```

### Rollback
```sql
-- If needed, rollback using commented section at end of migration file
-- See migrations/001_optimization_runs.sql
```

### Migration Verification
```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE tablename LIKE 'optimization%';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename LIKE 'optimization%';

-- Verify RLS policies
SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'optimization%';

-- Test sample insert
INSERT INTO optimization_runs (project_id, run_name, optimizer_type, config)
VALUES ('test_proj', 'test_run', 'miprov2', '{"optimizer": "miprov2"}'::jsonb);
```

## Monitoring & Observability

### Key Metrics to Track

1. **Query Performance**:
   ```sql
   -- Slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE query LIKE '%optimization_runs%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

2. **Index Usage**:
   ```sql
   -- Unused indexes (consider removing)
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public' AND tablename LIKE 'optimization%'
   ORDER BY idx_scan ASC;
   ```

3. **Table Size**:
   ```sql
   -- Monitor growth
   SELECT
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE tablename LIKE 'optimization%'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

4. **Materialized View Freshness**:
   ```sql
   -- Check last refresh time
   SELECT schemaname, matviewname, last_refresh
   FROM pg_matviews
   WHERE matviewname = 'optimization_run_analytics';
   ```

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Validate inputs** with Zod schemas before database calls
3. **Use batch operations** for bulk inserts (>10 rows)
4. **Monitor query performance** via `EXPLAIN ANALYZE`
5. **Refresh analytics view** during off-peak hours
6. **Archive old runs** to separate table if needed (>6 months old)
7. **Test RLS policies** in staging before production
8. **Set appropriate timeouts** for long-running queries
9. **Use read replicas** for analytics queries if available
10. **Document custom JSONB schema** for config/metadata fields

## Schema Evolution

### Adding New Fields
```sql
-- Safe: Add nullable column
ALTER TABLE optimization_runs ADD COLUMN new_field TEXT;

-- Safe: Add column with default
ALTER TABLE optimization_runs ADD COLUMN new_metric NUMERIC DEFAULT 0;

-- Create index if needed
CREATE INDEX CONCURRENTLY idx_optimization_runs_new_field ON optimization_runs(new_field);
```

### Removing Fields
```sql
-- 1. Deploy code that ignores field
-- 2. Wait for rollout (ensure no active readers)
-- 3. Drop column
ALTER TABLE optimization_runs DROP COLUMN old_field;
```

### Changing Constraints
```sql
-- Use NOT VALID initially, validate later
ALTER TABLE optimization_runs ADD CONSTRAINT check_new_constraint CHECK (field > 0) NOT VALID;
-- Later, during low-traffic period:
ALTER TABLE optimization_runs VALIDATE CONSTRAINT check_new_constraint;
```

## Support & Troubleshooting

### Common Issues

**Issue: Slow queries on large datasets**
- Solution: Verify index usage with `EXPLAIN`, consider partitioning

**Issue: RLS policy blocking queries**
- Solution: Check user permissions, verify project_id in context

**Issue: Materialized view outdated**
- Solution: Refresh view manually or set up automated refresh

**Issue: Type mismatches**
- Solution: Ensure Zod schemas match database constraints

**Issue: Cascade delete too slow**
- Solution: Consider soft deletes or async cleanup job

---

**Version:** 1.0
**Last Updated:** 2025-11-23
**Schema File:** migrations/001_optimization_runs.sql
**Contact:** Database Architecture Team
