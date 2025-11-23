/**
 * Observability and Metrics Collection for Iris Prime API
 *
 * Provides Prometheus/OpenTelemetry-compatible metrics collection
 * for monitoring performance, cache efficiency, rate limiting, and errors.
 *
 * Metrics tracked:
 * - Request duration histogram
 * - Cache hit/miss counters
 * - Rate limit hit counter
 * - Error rate by endpoint
 * - Database query duration
 * - Memory usage
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export interface Metric {
    name: string;
    type: MetricType;
    help: string;
    value: number;
    labels?: Record<string, string>;
    timestamp: number;
}
export interface HistogramBucket {
    le: number;
    count: number;
}
export interface Histogram {
    name: string;
    help: string;
    buckets: HistogramBucket[];
    sum: number;
    count: number;
    labels?: Record<string, string>;
}
/**
 * Metrics API
 */
export declare const metrics: {
    /**
     * Increment a counter
     */
    incCounter(name: string, value?: number, labels?: Record<string, string>): void;
    /**
     * Set a gauge value
     */
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Observe a value in a histogram
     */
    observe(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Get all metrics
     */
    getAll(): Metric[];
    /**
     * Get histogram
     */
    getHistogram(name: string, labels?: Record<string, string>): Histogram | null;
    /**
     * Get percentile from histogram
     */
    getPercentile(name: string, p: number, labels?: Record<string, string>): number;
    /**
     * Get counter value
     */
    getCounter(name: string, labels?: Record<string, string>): number;
    /**
     * Get gauge value
     */
    getGauge(name: string, labels?: Record<string, string>): number;
    /**
     * Reset all metrics
     */
    reset(): void;
    /**
     * Export metrics in Prometheus text format
     */
    exportPrometheus(): string;
};
/**
 * Performance timer for measuring operation duration
 */
export declare class Timer {
    private start;
    private metricName;
    private labels?;
    constructor(metricName: string, labels?: Record<string, string>);
    /**
     * Stop timer and record duration
     */
    end(): number;
    /**
     * Get elapsed time without recording
     */
    elapsed(): number;
}
/**
 * Convenience function to time an async operation
 */
export declare function timeAsync<T>(metricName: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T>;
/**
 * Track cache performance
 */
export declare const cacheMetrics: {
    hit(cacheName: string): void;
    miss(cacheName: string): void;
    getHitRate(cacheName: string): number;
};
/**
 * Track rate limiting
 */
export declare const rateLimitMetrics: {
    allowed(key: string): void;
    blocked(key: string): void;
    getBlockRate(key: string): number;
};
/**
 * Track HTTP requests
 */
export declare const httpMetrics: {
    request(method: string, path: string, statusCode: number, duration: number): void;
    error(method: string, path: string, errorType: string): void;
};
/**
 * Track database queries
 */
export declare const dbMetrics: {
    query(table: string, operation: string, duration: number): void;
    error(table: string, operation: string, errorType: string): void;
};
/**
 * Get performance summary
 */
export declare function getPerformanceSummary(): {
    requests: {
        total: number;
        errorRate: number;
        p50Latency: number;
        p95Latency: number;
        p99Latency: number;
    };
    cache: {
        hitRate: number;
    };
    rateLimit: {
        blockRate: number;
    };
    database: {
        totalQueries: number;
        avgLatency: number;
        p95Latency: number;
    };
};
/**
 * Express/Vercel middleware for automatic request tracking
 */
export declare function observabilityMiddleware(req: any, res: any, next?: () => void): void;
//# sourceMappingURL=observability.d.ts.map