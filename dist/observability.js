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
import { performance } from 'perf_hooks';
// In-memory metrics storage
class MetricsStore {
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    labels = new Map();
    // Histogram bucket boundaries (in milliseconds for latency)
    LATENCY_BUCKETS = [
        5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 500, 750, 1000, 2000, 5000,
    ];
    /**
     * Increment a counter
     */
    incCounter(name, value = 1, labels) {
        const key = this.getKey(name, labels);
        this.counters.set(key, (this.counters.get(key) || 0) + value);
        if (labels)
            this.labels.set(key, labels);
    }
    /**
     * Set a gauge value
     */
    setGauge(name, value, labels) {
        const key = this.getKey(name, labels);
        this.gauges.set(key, value);
        if (labels)
            this.labels.set(key, labels);
    }
    /**
     * Observe a value in a histogram
     */
    observe(name, value, labels) {
        const key = this.getKey(name, labels);
        const values = this.histograms.get(key) || [];
        values.push(value);
        this.histograms.set(key, values);
        if (labels)
            this.labels.set(key, labels);
    }
    /**
     * Get counter value
     */
    getCounter(name, labels) {
        return this.counters.get(this.getKey(name, labels)) || 0;
    }
    /**
     * Get gauge value
     */
    getGauge(name, labels) {
        return this.gauges.get(this.getKey(name, labels)) || 0;
    }
    /**
     * Get histogram as Prometheus-style buckets
     */
    getHistogram(name, labels) {
        const key = this.getKey(name, labels);
        const values = this.histograms.get(key);
        if (!values || values.length === 0) {
            return null;
        }
        const buckets = [];
        const sorted = [...values].sort((a, b) => a - b);
        for (const le of this.LATENCY_BUCKETS) {
            const count = sorted.filter(v => v <= le).length;
            buckets.push({ le, count });
        }
        // Add +Inf bucket
        buckets.push({ le: Infinity, count: sorted.length });
        return {
            name,
            help: `Histogram for ${name}`,
            buckets,
            sum: values.reduce((a, b) => a + b, 0),
            count: values.length,
            labels: this.labels.get(key),
        };
    }
    /**
     * Calculate percentile from histogram
     */
    getPercentile(name, p, labels) {
        const key = this.getKey(name, labels);
        const values = this.histograms.get(key);
        if (!values || values.length === 0) {
            return 0;
        }
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
    /**
     * Get all metrics
     */
    getAllMetrics() {
        const metrics = [];
        const now = Date.now();
        // Counters
        for (const [key, value] of this.counters.entries()) {
            const { name, labels } = this.parseKey(key);
            metrics.push({
                name,
                type: 'counter',
                help: `Counter for ${name}`,
                value,
                labels,
                timestamp: now,
            });
        }
        // Gauges
        for (const [key, value] of this.gauges.entries()) {
            const { name, labels } = this.parseKey(key);
            metrics.push({
                name,
                type: 'gauge',
                help: `Gauge for ${name}`,
                value,
                labels,
                timestamp: now,
            });
        }
        return metrics;
    }
    /**
     * Reset all metrics
     */
    reset() {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.labels.clear();
    }
    /**
     * Get metric key with labels
     */
    getKey(name, labels) {
        if (!labels || Object.keys(labels).length === 0) {
            return name;
        }
        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        return `${name}{${labelStr}}`;
    }
    /**
     * Parse metric key back to name and labels
     */
    parseKey(key) {
        const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
        if (!match) {
            return { name: key };
        }
        const [, name, labelStr] = match;
        if (!labelStr) {
            return { name };
        }
        const labels = {};
        const pairs = labelStr.split(',');
        for (const pair of pairs) {
            const [k, v] = pair.split('=');
            labels[k] = v.replace(/"/g, '');
        }
        return { name, labels };
    }
}
// Global metrics store
const metricsStore = new MetricsStore();
/**
 * Metrics API
 */
export const metrics = {
    /**
     * Increment a counter
     */
    incCounter(name, value = 1, labels) {
        metricsStore.incCounter(name, value, labels);
    },
    /**
     * Set a gauge value
     */
    setGauge(name, value, labels) {
        metricsStore.setGauge(name, value, labels);
    },
    /**
     * Observe a value in a histogram
     */
    observe(name, value, labels) {
        metricsStore.observe(name, value, labels);
    },
    /**
     * Get all metrics
     */
    getAll() {
        return metricsStore.getAllMetrics();
    },
    /**
     * Get histogram
     */
    getHistogram(name, labels) {
        return metricsStore.getHistogram(name, labels);
    },
    /**
     * Get percentile from histogram
     */
    getPercentile(name, p, labels) {
        return metricsStore.getPercentile(name, p, labels);
    },
    /**
     * Get counter value
     */
    getCounter(name, labels) {
        return metricsStore.getCounter(name, labels);
    },
    /**
     * Get gauge value
     */
    getGauge(name, labels) {
        return metricsStore.getGauge(name, labels);
    },
    /**
     * Reset all metrics
     */
    reset() {
        metricsStore.reset();
    },
    /**
     * Export metrics in Prometheus text format
     */
    exportPrometheus() {
        const lines = [];
        const allMetrics = metricsStore.getAllMetrics();
        // Group by metric name
        const grouped = new Map();
        for (const metric of allMetrics) {
            const existing = grouped.get(metric.name) || [];
            existing.push(metric);
            grouped.set(metric.name, existing);
        }
        // Export each metric
        for (const [name, metricsList] of grouped.entries()) {
            const first = metricsList[0];
            lines.push(`# HELP ${name} ${first.help}`);
            lines.push(`# TYPE ${name} ${first.type}`);
            for (const metric of metricsList) {
                const labelsStr = metric.labels
                    ? '{' + Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
                    : '';
                lines.push(`${name}${labelsStr} ${metric.value} ${metric.timestamp}`);
            }
            lines.push('');
        }
        // Export histograms separately
        const histogramNames = new Set();
        for (const [key] of metricsStore.histograms.entries()) {
            const { name } = metricsStore.parseKey(key);
            histogramNames.add(name);
        }
        for (const name of histogramNames) {
            const histogram = metricsStore.getHistogram(name);
            if (!histogram)
                continue;
            lines.push(`# HELP ${name} ${histogram.help}`);
            lines.push(`# TYPE ${name} histogram`);
            const labelsStr = histogram.labels
                ? Object.entries(histogram.labels).map(([k, v]) => `${k}="${v}"`).join(',')
                : '';
            for (const bucket of histogram.buckets) {
                const bucketLabels = labelsStr
                    ? `{${labelsStr},le="${bucket.le}"}`
                    : `{le="${bucket.le}"}`;
                lines.push(`${name}_bucket${bucketLabels} ${bucket.count}`);
            }
            lines.push(`${name}_sum${labelsStr ? '{' + labelsStr + '}' : ''} ${histogram.sum}`);
            lines.push(`${name}_count${labelsStr ? '{' + labelsStr + '}' : ''} ${histogram.count}`);
            lines.push('');
        }
        return lines.join('\n');
    },
};
/**
 * Performance timer for measuring operation duration
 */
export class Timer {
    start;
    metricName;
    labels;
    constructor(metricName, labels) {
        this.start = performance.now();
        this.metricName = metricName;
        this.labels = labels;
    }
    /**
     * Stop timer and record duration
     */
    end() {
        const duration = performance.now() - this.start;
        metrics.observe(this.metricName, duration, this.labels);
        return duration;
    }
    /**
     * Get elapsed time without recording
     */
    elapsed() {
        return performance.now() - this.start;
    }
}
/**
 * Convenience function to time an async operation
 */
export async function timeAsync(metricName, fn, labels) {
    const timer = new Timer(metricName, labels);
    try {
        const result = await fn();
        timer.end();
        return result;
    }
    catch (error) {
        timer.end();
        throw error;
    }
}
/**
 * Track cache performance
 */
export const cacheMetrics = {
    hit(cacheName) {
        metrics.incCounter('cache_requests_total', 1, { cache: cacheName, result: 'hit' });
    },
    miss(cacheName) {
        metrics.incCounter('cache_requests_total', 1, { cache: cacheName, result: 'miss' });
    },
    getHitRate(cacheName) {
        const hits = metrics.getCounter('cache_requests_total', { cache: cacheName, result: 'hit' });
        const misses = metrics.getCounter('cache_requests_total', { cache: cacheName, result: 'miss' });
        const total = hits + misses;
        return total > 0 ? hits / total : 0;
    },
};
/**
 * Track rate limiting
 */
export const rateLimitMetrics = {
    allowed(key) {
        metrics.incCounter('rate_limit_requests_total', 1, { key, result: 'allowed' });
    },
    blocked(key) {
        metrics.incCounter('rate_limit_requests_total', 1, { key, result: 'blocked' });
    },
    getBlockRate(key) {
        const allowed = metrics.getCounter('rate_limit_requests_total', { key, result: 'allowed' });
        const blocked = metrics.getCounter('rate_limit_requests_total', { key, result: 'blocked' });
        const total = allowed + blocked;
        return total > 0 ? blocked / total : 0;
    },
};
/**
 * Track HTTP requests
 */
export const httpMetrics = {
    request(method, path, statusCode, duration) {
        metrics.incCounter('http_requests_total', 1, { method, path, status: statusCode.toString() });
        metrics.observe('http_request_duration_ms', duration, { method, path });
    },
    error(method, path, errorType) {
        metrics.incCounter('http_errors_total', 1, { method, path, error_type: errorType });
    },
};
/**
 * Track database queries
 */
export const dbMetrics = {
    query(table, operation, duration) {
        metrics.incCounter('db_queries_total', 1, { table, operation });
        metrics.observe('db_query_duration_ms', duration, { table, operation });
    },
    error(table, operation, errorType) {
        metrics.incCounter('db_errors_total', 1, { table, operation, error_type: errorType });
    },
};
/**
 * Get performance summary
 */
export function getPerformanceSummary() {
    // Calculate request stats
    const totalRequests = metrics.getCounter('http_requests_total', { status: '200' }) +
        metrics.getCounter('http_requests_total', { status: '201' }) +
        metrics.getCounter('http_requests_total', { status: '400' }) +
        metrics.getCounter('http_requests_total', { status: '401' }) +
        metrics.getCounter('http_requests_total', { status: '404' }) +
        metrics.getCounter('http_requests_total', { status: '429' }) +
        metrics.getCounter('http_requests_total', { status: '500' });
    const errorRequests = metrics.getCounter('http_requests_total', { status: '400' }) +
        metrics.getCounter('http_requests_total', { status: '401' }) +
        metrics.getCounter('http_requests_total', { status: '404' }) +
        metrics.getCounter('http_requests_total', { status: '429' }) +
        metrics.getCounter('http_requests_total', { status: '500' });
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
    // Calculate cache hit rate across all caches
    const cacheHits = metrics.getCounter('cache_requests_total', { result: 'hit' });
    const cacheMisses = metrics.getCounter('cache_requests_total', { result: 'miss' });
    const cacheTotal = cacheHits + cacheMisses;
    const cacheHitRate = cacheTotal > 0 ? cacheHits / cacheTotal : 0;
    // Calculate rate limit block rate
    const rateLimitAllowed = metrics.getCounter('rate_limit_requests_total', { result: 'allowed' });
    const rateLimitBlocked = metrics.getCounter('rate_limit_requests_total', { result: 'blocked' });
    const rateLimitTotal = rateLimitAllowed + rateLimitBlocked;
    const rateLimitBlockRate = rateLimitTotal > 0 ? rateLimitBlocked / rateLimitTotal : 0;
    // Calculate database stats
    const dbQueries = metrics.getCounter('db_queries_total');
    return {
        requests: {
            total: totalRequests,
            errorRate,
            p50Latency: metrics.getPercentile('http_request_duration_ms', 50),
            p95Latency: metrics.getPercentile('http_request_duration_ms', 95),
            p99Latency: metrics.getPercentile('http_request_duration_ms', 99),
        },
        cache: {
            hitRate: cacheHitRate,
        },
        rateLimit: {
            blockRate: rateLimitBlockRate,
        },
        database: {
            totalQueries: dbQueries,
            avgLatency: 0, // Would need to calculate from histogram
            p95Latency: metrics.getPercentile('db_query_duration_ms', 95),
        },
    };
}
/**
 * Express/Vercel middleware for automatic request tracking
 */
export function observabilityMiddleware(req, res, next) {
    const timer = new Timer('http_request_duration_ms', {
        method: req.method,
        path: req.url || req.path,
    });
    // Track original end() method
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = timer.end();
        httpMetrics.request(req.method, req.url || req.path, res.statusCode, duration);
        return originalEnd.apply(res, args);
    };
    if (next) {
        next();
    }
}
// Update memory metrics periodically
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const mem = process.memoryUsage();
        metrics.setGauge('memory_heap_used_bytes', mem.heapUsed);
        metrics.setGauge('memory_heap_total_bytes', mem.heapTotal);
        metrics.setGauge('memory_external_bytes', mem.external);
        metrics.setGauge('memory_rss_bytes', mem.rss);
    }, 10000); // Every 10 seconds
}
