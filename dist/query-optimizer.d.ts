/**
 * Query Optimization Utilities
 *
 * Provides helpers for optimizing database queries:
 * - Use database-level aggregation instead of fetching all rows
 * - Implement pagination for large result sets
 * - Add query result caching
 * - Track query performance metrics
 */
/**
 * Query options
 */
export interface QueryOptions {
    cache?: boolean;
    cacheTTL?: number;
    timeout?: number;
}
/**
 * Pagination options
 */
export interface PaginationOptions {
    page?: number;
    limit?: number;
    orderBy?: string;
    ascending?: boolean;
}
/**
 * Execute query with caching and metrics
 */
export declare function executeQuery<T>(queryFn: () => Promise<{
    data: T | null;
    error: any;
}>, options: QueryOptions & {
    cacheKey?: string;
    table: string;
    operation: string;
}): Promise<T>;
/**
 * Optimized overview query using database aggregation
 */
export declare function getOptimizedOverview(projectId?: string): Promise<{
    expertsCount: unknown;
    reportsCount: unknown;
    reflexionsCount: unknown;
    eventsCount: unknown;
}>;
/**
 * Optimized analytics query using database aggregation
 */
export declare function getOptimizedAnalytics(projectId: string): Promise<{
    tokens: unknown;
    performance: unknown;
}>;
/**
 * Paginated query helper
 */
export declare function getPaginated<T>(table: string, options: PaginationOptions & {
    select?: string;
    filter?: (query: any) => any;
}): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}>;
/**
 * Batch insert optimization
 */
export declare function batchInsert<T>(table: string, records: T[], batchSize?: number): Promise<void>;
/**
 * Database performance suggestions
 */
export interface PerformanceSuggestion {
    type: 'index' | 'query' | 'cache';
    severity: 'high' | 'medium' | 'low';
    table: string;
    description: string;
    suggestion: string;
}
/**
 * Analyze query performance and suggest optimizations
 */
export declare function analyzePerformance(): PerformanceSuggestion[];
/**
 * SQL templates for creating optimized database functions
 */
export declare const SQL_TEMPLATES: {
    /**
     * Token statistics aggregation function
     */
    getTokenStats: string;
    /**
     * Performance statistics aggregation function
     */
    getPerformanceStats: string;
    /**
     * Increment API key usage count atomically
     */
    incrementUsageCount: string;
    /**
     * Suggested indexes for performance
     */
    createIndexes: string;
};
/**
 * Execute SQL template (for database setup)
 */
export declare function executeSQLTemplate(template: string): Promise<void>;
//# sourceMappingURL=query-optimizer.d.ts.map