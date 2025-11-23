/**
 * Query Optimization Utilities
 *
 * Provides helpers for optimizing database queries:
 * - Use database-level aggregation instead of fetching all rows
 * - Implement pagination for large result sets
 * - Add query result caching
 * - Track query performance metrics
 */
import { getSupabaseClient } from './supabase.js';
import { getQueryCache } from './cache.js';
import { dbMetrics, Timer } from './observability.js';
/**
 * Execute query with caching and metrics
 */
export async function executeQuery(queryFn, options) {
    const { cache = false, cacheTTL = 60000, cacheKey, table, operation } = options;
    // Check cache first
    if (cache && cacheKey) {
        const queryCache = getQueryCache();
        const cached = await queryCache.get(cacheKey);
        if (cached !== null) {
            return cached;
        }
    }
    // Execute query with metrics
    const timer = new Timer('db_query_duration_ms', { table, operation });
    try {
        const { data, error } = await queryFn();
        const duration = timer.end();
        if (error) {
            dbMetrics.error(table, operation, error.code || 'unknown');
            throw new Error(`Query failed: ${error.message}`);
        }
        if (data === null) {
            throw new Error('Query returned null');
        }
        dbMetrics.query(table, operation, duration);
        // Store in cache
        if (cache && cacheKey) {
            const queryCache = getQueryCache();
            await queryCache.set(cacheKey, data, cacheTTL);
        }
        return data;
    }
    catch (error) {
        timer.end();
        throw error;
    }
}
/**
 * Optimized overview query using database aggregation
 */
export async function getOptimizedOverview(projectId) {
    const supabase = getSupabaseClient();
    // Use Promise.all for parallel queries, but with database-level aggregation
    const [expertsCount, reportsCount, reflexionsCount, eventsCount] = await Promise.all([
        // Count active experts (single row result)
        executeQuery(() => supabase
            .from('expert_signatures')
            .select('project', { count: 'exact', head: true })
            .eq('active', true), {
            table: 'expert_signatures',
            operation: 'count',
            cache: true,
            cacheTTL: 60000,
            cacheKey: `experts:count:${projectId || 'all'}`,
        }),
        // Count reports
        executeQuery(() => supabase
            .from('iris_reports')
            .select('id', { count: 'exact', head: true }), {
            table: 'iris_reports',
            operation: 'count',
            cache: true,
            cacheTTL: 30000,
            cacheKey: `reports:count:${projectId || 'all'}`,
        }),
        // Count reflexions
        executeQuery(() => supabase
            .from('reflexion_bank')
            .select('id', { count: 'exact', head: true }), {
            table: 'reflexion_bank',
            operation: 'count',
            cache: true,
            cacheTTL: 60000,
            cacheKey: `reflexions:count:${projectId || 'all'}`,
        }),
        // Count events
        executeQuery(() => supabase
            .from('iris_telemetry')
            .select('id', { count: 'exact', head: true }), {
            table: 'iris_telemetry',
            operation: 'count',
            cache: true,
            cacheTTL: 30000,
            cacheKey: `events:count:${projectId || 'all'}`,
        }),
    ]);
    return {
        expertsCount,
        reportsCount,
        reflexionsCount,
        eventsCount,
    };
}
/**
 * Optimized analytics query using database aggregation
 */
export async function getOptimizedAnalytics(projectId) {
    const supabase = getSupabaseClient();
    // Use database RPC functions for complex aggregations
    // Example: Create a Postgres function for analytics
    // For now, use optimized queries with pagination
    const [tokenStats, performanceStats] = await Promise.all([
        // Token statistics using database aggregation
        executeQuery(() => supabase.rpc('get_token_stats', { p_project_id: projectId }), {
            table: 'model_run_log',
            operation: 'aggregate',
            cache: true,
            cacheTTL: 60000,
            cacheKey: `analytics:tokens:${projectId}`,
        }).catch(() => ({
            totalTokensIn: 0,
            totalTokensOut: 0,
            totalCostUsd: 0,
            avgTokensPerRun: 0,
        })),
        // Performance statistics
        executeQuery(() => supabase.rpc('get_performance_stats', { p_project_id: projectId }), {
            table: 'model_run_log',
            operation: 'aggregate',
            cache: true,
            cacheTTL: 60000,
            cacheKey: `analytics:performance:${projectId}`,
        }).catch(() => ({
            avgConfidence: 0,
            avgLatencyMs: 0,
            successRate: 0,
        })),
    ]);
    return {
        tokens: tokenStats,
        performance: performanceStats,
    };
}
/**
 * Paginated query helper
 */
export async function getPaginated(table, options) {
    const { page = 1, limit = 50, orderBy = 'created_at', ascending = false, select = '*', filter, } = options;
    const supabase = getSupabaseClient();
    // Calculate range
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    // Build query
    let query = supabase
        .from(table)
        .select(select, { count: 'exact' })
        .order(orderBy, { ascending })
        .range(from, to);
    // Apply filter if provided
    if (filter) {
        query = filter(query);
    }
    // Execute with metrics
    const timer = new Timer('db_query_duration_ms', { table, operation: 'select' });
    const { data, error, count } = await query;
    timer.end();
    if (error) {
        dbMetrics.error(table, 'select', error.code || 'unknown');
        throw new Error(`Query failed: ${error.message}`);
    }
    dbMetrics.query(table, 'select', timer.elapsed());
    const total = count || 0;
    const hasMore = to < total - 1;
    return {
        data: (data || []),
        total,
        page,
        limit,
        hasMore,
    };
}
/**
 * Batch insert optimization
 */
export async function batchInsert(table, records, batchSize = 100) {
    const supabase = getSupabaseClient();
    // Split into batches
    const batches = [];
    for (let i = 0; i < records.length; i += batchSize) {
        batches.push(records.slice(i, i + batchSize));
    }
    // Insert batches in parallel (limit concurrency to avoid overwhelming DB)
    const concurrency = 3;
    for (let i = 0; i < batches.length; i += concurrency) {
        const batchGroup = batches.slice(i, i + concurrency);
        await Promise.all(batchGroup.map(async (batch) => {
            const timer = new Timer('db_query_duration_ms', { table, operation: 'insert' });
            const { error } = await supabase.from(table).insert(batch);
            timer.end();
            if (error) {
                dbMetrics.error(table, 'insert', error.code || 'unknown');
                throw new Error(`Batch insert failed: ${error.message}`);
            }
            dbMetrics.query(table, 'insert', timer.elapsed());
        }));
    }
}
/**
 * Analyze query performance and suggest optimizations
 */
export function analyzePerformance() {
    const suggestions = [];
    // Check for slow queries (p95 > 100ms)
    const slowTables = ['expert_signatures', 'iris_reports', 'reflexion_bank', 'iris_telemetry'];
    for (const table of slowTables) {
        // This would require tracking query metrics
        // For now, provide general suggestions
        suggestions.push({
            type: 'index',
            severity: 'medium',
            table,
            description: `Consider adding indexes for frequently queried columns`,
            suggestion: `CREATE INDEX IF NOT EXISTS idx_${table}_project ON ${table}(project_id)`,
        });
    }
    return suggestions;
}
/**
 * SQL templates for creating optimized database functions
 */
export const SQL_TEMPLATES = {
    /**
     * Token statistics aggregation function
     */
    getTokenStats: `
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
  `,
    /**
     * Performance statistics aggregation function
     */
    getPerformanceStats: `
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
  `,
    /**
     * Increment API key usage count atomically
     */
    incrementUsageCount: `
    CREATE OR REPLACE FUNCTION increment_usage_count(key_id UUID)
    RETURNS void AS $$
    BEGIN
      UPDATE iris_api_keys
      SET usage_count = usage_count + 1,
          last_used_at = NOW()
      WHERE id = key_id;
    END;
    $$ LANGUAGE plpgsql;
  `,
    /**
     * Suggested indexes for performance
     */
    createIndexes: `
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
  `,
};
/**
 * Execute SQL template (for database setup)
 */
export async function executeSQLTemplate(template) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('exec_sql', { sql: template });
    if (error) {
        console.warn('SQL template execution failed:', error);
    }
}
