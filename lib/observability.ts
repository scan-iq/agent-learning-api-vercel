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

// Metric types
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
  le: number; // "less than or equal to"
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

// In-memory metrics storage
class MetricsStore {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private labels: Map<string, Record<string, string>> = new Map();

  // Histogram bucket boundaries (in milliseconds for latency)
  private readonly LATENCY_BUCKETS = [
    5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 500, 750, 1000, 2000, 5000,
  ];

  /**
   * Increment a counter
   */
  incCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
    if (labels) this.labels.set(key, labels);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, value);
    if (labels) this.labels.set(key, labels);
  }

  /**
   * Observe a value in a histogram
   */
  observe(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    if (labels) this.labels.set(key, labels);
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    return this.counters.get(this.getKey(name, labels)) || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, labels?: Record<string, string>): number {
    return this.gauges.get(this.getKey(name, labels)) || 0;
  }

  /**
   * Get histogram as Prometheus-style buckets
   */
  getHistogram(name: string, labels?: Record<string, string>): Histogram | null {
    const key = this.getKey(name, labels);
    const values = this.histograms.get(key);

    if (!values || values.length === 0) {
      return null;
    }

    const buckets: HistogramBucket[] = [];
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
  getPercentile(name: string, p: number, labels?: Record<string, string>): number {
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
  getAllMetrics(): Metric[] {
    const metrics: Metric[] = [];
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
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.labels.clear();
  }

  /**
   * Get metric key with labels
   */
  private getKey(name: string, labels?: Record<string, string>): string {
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
  private parseKey(key: string): { name: string; labels?: Record<string, string> } {
    const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
    if (!match) {
      return { name: key };
    }

    const [, name, labelStr] = match;

    if (!labelStr) {
      return { name };
    }

    const labels: Record<string, string> = {};
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
  incCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    metricsStore.incCounter(name, value, labels);
  },

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    metricsStore.setGauge(name, value, labels);
  },

  /**
   * Observe a value in a histogram
   */
  observe(name: string, value: number, labels?: Record<string, string>): void {
    metricsStore.observe(name, value, labels);
  },

  /**
   * Get all metrics
   */
  getAll(): Metric[] {
    return metricsStore.getAllMetrics();
  },

  /**
   * Get histogram
   */
  getHistogram(name: string, labels?: Record<string, string>): Histogram | null {
    return metricsStore.getHistogram(name, labels);
  },

  /**
   * Get percentile from histogram
   */
  getPercentile(name: string, p: number, labels?: Record<string, string>): number {
    return metricsStore.getPercentile(name, p, labels);
  },

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    return metricsStore.getCounter(name, labels);
  },

  /**
   * Get gauge value
   */
  getGauge(name: string, labels?: Record<string, string>): number {
    return metricsStore.getGauge(name, labels);
  },

  /**
   * Reset all metrics
   */
  reset(): void {
    metricsStore.reset();
  },

  /**
   * Export metrics in Prometheus text format
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    const allMetrics = metricsStore.getAllMetrics();

    // Group by metric name
    const grouped = new Map<string, Metric[]>();
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
    const histogramNames = new Set<string>();
    for (const [key] of (metricsStore as any).histograms.entries()) {
      const { name } = (metricsStore as any).parseKey(key);
      histogramNames.add(name);
    }

    for (const name of histogramNames) {
      const histogram = metricsStore.getHistogram(name);
      if (!histogram) continue;

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
  private start: number;
  private metricName: string;
  private labels?: Record<string, string>;

  constructor(metricName: string, labels?: Record<string, string>) {
    this.start = performance.now();
    this.metricName = metricName;
    this.labels = labels;
  }

  /**
   * Stop timer and record duration
   */
  end(): number {
    const duration = performance.now() - this.start;
    metrics.observe(this.metricName, duration, this.labels);
    return duration;
  }

  /**
   * Get elapsed time without recording
   */
  elapsed(): number {
    return performance.now() - this.start;
  }
}

/**
 * Convenience function to time an async operation
 */
export async function timeAsync<T>(
  metricName: string,
  fn: () => Promise<T>,
  labels?: Record<string, string>
): Promise<T> {
  const timer = new Timer(metricName, labels);
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    timer.end();
    throw error;
  }
}

/**
 * Track cache performance
 */
export const cacheMetrics = {
  hit(cacheName: string): void {
    metrics.incCounter('cache_requests_total', 1, { cache: cacheName, result: 'hit' });
  },

  miss(cacheName: string): void {
    metrics.incCounter('cache_requests_total', 1, { cache: cacheName, result: 'miss' });
  },

  getHitRate(cacheName: string): number {
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
  allowed(key: string): void {
    metrics.incCounter('rate_limit_requests_total', 1, { key, result: 'allowed' });
  },

  blocked(key: string): void {
    metrics.incCounter('rate_limit_requests_total', 1, { key, result: 'blocked' });
  },

  getBlockRate(key: string): number {
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
  request(method: string, path: string, statusCode: number, duration: number): void {
    metrics.incCounter('http_requests_total', 1, { method, path, status: statusCode.toString() });
    metrics.observe('http_request_duration_ms', duration, { method, path });
  },

  error(method: string, path: string, errorType: string): void {
    metrics.incCounter('http_errors_total', 1, { method, path, error_type: errorType });
  },
};

/**
 * Track database queries
 */
export const dbMetrics = {
  query(table: string, operation: string, duration: number): void {
    metrics.incCounter('db_queries_total', 1, { table, operation });
    metrics.observe('db_query_duration_ms', duration, { table, operation });
  },

  error(table: string, operation: string, errorType: string): void {
    metrics.incCounter('db_errors_total', 1, { table, operation, error_type: errorType });
  },
};

/**
 * Get performance summary
 */
export function getPerformanceSummary(): {
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
} {
  // Calculate request stats
  const totalRequests =
    metrics.getCounter('http_requests_total', { status: '200' }) +
    metrics.getCounter('http_requests_total', { status: '201' }) +
    metrics.getCounter('http_requests_total', { status: '400' }) +
    metrics.getCounter('http_requests_total', { status: '401' }) +
    metrics.getCounter('http_requests_total', { status: '404' }) +
    metrics.getCounter('http_requests_total', { status: '429' }) +
    metrics.getCounter('http_requests_total', { status: '500' });

  const errorRequests =
    metrics.getCounter('http_requests_total', { status: '400' }) +
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
export function observabilityMiddleware(req: any, res: any, next?: () => void): void {
  const timer = new Timer('http_request_duration_ms', {
    method: req.method,
    path: req.url || req.path,
  });

  // Track original end() method
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const duration = timer.end();

    httpMetrics.request(
      req.method,
      req.url || req.path,
      res.statusCode,
      duration
    );

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
