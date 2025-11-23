# Optimization Schema Quick Reference

## Files Created

### Database Migration
- **`migrations/001_optimization_runs.sql`** - Complete schema, indexes, RLS policies, triggers, and helper functions

### TypeScript Types
- **`lib/types.optimization.ts`** - Database row types, API types, request/response types, and configurations

### Validation Schemas
- **`lib/schemas.ts`** (updated) - Zod schemas for input validation

### Helper Functions
- **`lib/supabase-optimization.ts`** - Type-safe database operations and utilities

### Documentation
- **`migrations/OPTIMIZATION_SCHEMA_README.md`** - Comprehensive schema documentation
- **`migrations/QUICK_REFERENCE.md`** - This file

## Quick Start

### 1. Run Migration

```bash
# Connect to your Supabase instance
psql $SUPABASE_DB_URL -f migrations/001_optimization_runs.sql
```

### 2. Import Types and Functions

```typescript
import {
  createOptimizationRun,
  updateOptimizationRun,
  createOptimizationIteration,
  listOptimizationRuns,
} from '@/lib/supabase-optimization';

import { CreateOptimizationRunSchema } from '@/lib/schemas';
```

### 3. Create Your First Run

```typescript
// Validate input
const input = CreateOptimizationRunSchema.parse({
  projectId: 'proj_123',
  runName: 'My First MIPROv2 Run',
  optimizerType: 'miprov2',
  config: {
    optimizer: 'miprov2',
    metric: 'accuracy',
    max_iterations: 10,
    model_config: {
      model: 'gpt-4',
      temperature: 0.7,
    },
    miprov2: {
      metric: 'accuracy',
      num_candidates: 10,
      init_temperature: 1.0,
    },
  },
  tags: ['experiment-1', 'production'],
});

// Create run
const run = await createOptimizationRun(input);
console.log('Created run:', run.id);
```

### 4. Track Progress

```typescript
// Update status
await updateOptimizationRun(run.id, {
  status: 'running',
});

// Add iteration
await createOptimizationIteration({
  runId: run.id,
  iteration: 1,
  score: 0.85,
  params: {
    temperature: 0.7,
    num_demos: 5,
  },
});

// Complete run
await updateOptimizationRun(run.id, {
  status: 'completed',
  finalScore: 0.92,
  iterations: 10,
  samplesEvaluated: 100,
});
```

### 5. Query Results

```typescript
// List all completed runs
const { data: runs } = await listOptimizationRuns({
  projectId: 'proj_123',
  status: 'completed',
  orderBy: 'final_score',
  orderDirection: 'desc',
  limit: 10,
});

// Get top runs
const topRuns = await getTopRunsByScore('proj_123', 5);
```

## Common Patterns

### Pattern 1: Continuous Progress Updates

```typescript
async function runOptimization(runId: string) {
  await updateOptimizationRun(runId, { status: 'running' });

  for (let i = 0; i < numIterations; i++) {
    // Run iteration
    const result = await optimizer.step();

    // Save iteration
    await createOptimizationIteration({
      runId,
      iteration: i,
      score: result.score,
      params: result.params,
    });

    // Update progress
    await updateOptimizationRun(runId, {
      iterations: i + 1,
      samplesEvaluated: (i + 1) * samplesPerIteration,
    });
  }

  // Mark complete
  await updateOptimizationRun(runId, {
    status: 'completed',
    endTime: new Date().toISOString(),
  });
}
```

### Pattern 2: Batch Sample Recording

```typescript
// Collect samples
const samples = [];
for (let i = 0; i < batchSize; i++) {
  samples.push({
    runId,
    iterationId,
    iteration: iterationNum,
    sampleIndex: i,
    input: inputs[i],
    predictedOutput: predictions[i],
    expectedOutput: labels[i],
    score: scores[i],
  });
}

// Insert all at once (more efficient)
await batchCreateOptimizationSamples(samples);
```

### Pattern 3: Error Handling

```typescript
try {
  const run = await createOptimizationRun(config);
  await updateOptimizationRun(run.id, { status: 'running' });

  // ... run optimization ...

  await updateOptimizationRun(run.id, {
    status: 'completed',
    finalScore: result.score,
  });
} catch (error) {
  await updateOptimizationRun(run.id, {
    status: 'failed',
    errorMessage: error.message,
    errorStack: error.stack,
  });
  throw error;
}
```

## Database Functions Cheat Sheet

### get_optimization_run_summary(run_id)
```sql
SELECT * FROM get_optimization_run_summary('550e8400-...');
```

### get_top_runs_by_score(project_id, limit)
```sql
SELECT * FROM get_top_runs_by_score('proj_123', 10);
```

### refresh_optimization_analytics()
```sql
SELECT refresh_optimization_analytics();
```

## Index Usage Examples

### Query: List runs by status
```sql
-- Uses: idx_optimization_runs_status
SELECT * FROM optimization_runs
WHERE project_id = 'proj_123' AND status = 'completed'
ORDER BY created_at DESC;
```

### Query: Filter by tags
```sql
-- Uses: idx_optimization_runs_tags_gin
SELECT * FROM optimization_runs
WHERE tags @> ARRAY['production'];
```

### Query: Search config
```sql
-- Uses: idx_optimization_runs_config_gin
SELECT * FROM optimization_runs
WHERE config->>'model' = 'gpt-4';
```

### Query: Get leaderboard
```sql
-- Uses: idx_optimization_runs_performance (partial index)
SELECT * FROM optimization_runs
WHERE project_id = 'proj_123' AND status = 'completed'
ORDER BY final_score DESC NULLS LAST
LIMIT 10;
```

## Performance Targets

| Query Type | Target | Index Used |
|------------|--------|------------|
| List runs (paginated) | <50ms | `idx_optimization_runs_project_id` |
| Filter by status | <50ms | `idx_optimization_runs_status` |
| Filter by tags | <100ms | `idx_optimization_runs_tags_gin` |
| Search config | <150ms | `idx_optimization_runs_config_gin` |
| Leaderboard | <30ms | `idx_optimization_runs_performance` |
| Get run + iterations | <50ms | `idx_optimization_iterations_run_id` |
| Analytics aggregation | <20ms | `optimization_run_analytics` (materialized view) |

## Validation Schemas

All requests are validated via Zod:

```typescript
import {
  CreateOptimizationRunSchema,
  UpdateOptimizationRunSchema,
  CreateOptimizationIterationSchema,
  CreateOptimizationSampleSchema,
  OptimizationRunFiltersSchema,
} from '@/lib/schemas';

// Example validation
const result = CreateOptimizationRunSchema.safeParse(input);
if (!result.success) {
  console.error('Validation errors:', result.error.errors);
}
```

## Monitoring Queries

### Check table sizes
```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'optimization%'
ORDER BY pg_total_relation_size('public.' || tablename) DESC;
```

### Check index usage
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE tablename LIKE 'optimization%'
ORDER BY idx_scan DESC;
```

### Check slow queries
```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%optimization_runs%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Troubleshooting

### Issue: Query too slow
1. Check `EXPLAIN ANALYZE` output
2. Verify index is being used
3. Check table statistics: `ANALYZE optimization_runs;`
4. Consider adding composite index

### Issue: RLS blocking access
1. Verify user has access to project_id
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'optimization_runs';`
3. Test with service_role key temporarily

### Issue: Stale analytics
1. Manually refresh: `SELECT refresh_optimization_analytics();`
2. Set up periodic refresh (hourly recommended)

### Issue: Constraint violation
1. Check constraint: `\d+ optimization_runs` (in psql)
2. Verify input data meets constraints
3. Review error message for specific constraint name

## Migration Checklist

- [ ] Run migration SQL file
- [ ] Verify tables created: `\dt optimization_*`
- [ ] Verify indexes created: `\di optimization_*`
- [ ] Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename LIKE 'optimization%';`
- [ ] Test insert/update operations
- [ ] Test RLS with authenticated user
- [ ] Run performance tests on expected queries
- [ ] Set up analytics refresh schedule
- [ ] Configure monitoring alerts
- [ ] Update API documentation
- [ ] Deploy TypeScript types to application

## Next Steps

1. **Create API Endpoints** - Add REST/GraphQL endpoints for CRUD operations
2. **Set up Monitoring** - Configure alerts for slow queries and errors
3. **Schedule Analytics Refresh** - Use cron or scheduled job to refresh materialized view
4. **Add Integration Tests** - Test schema with realistic data volumes
5. **Document JSONB Schemas** - Define structure for config and metadata fields
6. **Optimize Queries** - Use `EXPLAIN ANALYZE` to tune specific queries
7. **Set up Backup** - Configure automated backups for optimization data
8. **Create Dashboards** - Build analytics dashboards using aggregated data

---

**Need Help?**
- Schema Docs: `migrations/OPTIMIZATION_SCHEMA_README.md`
- TypeScript Types: `lib/types.optimization.ts`
- Helper Functions: `lib/supabase-optimization.ts`
- Validation: `lib/schemas.ts`
