/**
 * Custom Test Assertions
 *
 * Provides domain-specific assertion functions for testing
 * authentication, rate limiting, caching, and performance.
 */

import { expect } from 'vitest';

/**
 * Assert that a request is rate limited
 */
export function assertRateLimited(response: Response | any): void {
  const statusCode = response.status || response.statusCode;
  expect(statusCode).toBe(429);

  if (response.json) {
    // Web API Response
    const body = typeof response.body === 'object' ? response.body : null;
    if (body) {
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/rate limit/i);
    }
  } else {
    // Vercel Response
    expect(response.body).toBeDefined();
    expect(response.body.error).toMatch(/rate limit/i);
  }
}

/**
 * Assert that authentication was successful
 */
export function assertAuthSuccess(response: Response | any, expectedProjectId?: string): void {
  const statusCode = response.status || response.statusCode;
  expect(statusCode).toBeGreaterThanOrEqual(200);
  expect(statusCode).toBeLessThan(300);

  if (expectedProjectId) {
    const body = response.body || response.json;
    expect(body).toHaveProperty('projectId', expectedProjectId);
  }
}

/**
 * Assert that authentication failed
 */
export function assertAuthFailure(response: Response | any, expectedStatus: number = 401): void {
  const statusCode = response.status || response.statusCode;
  expect(statusCode).toBe(expectedStatus);

  if (response.body) {
    expect(response.body).toHaveProperty('error');
  }
}

/**
 * Assert that latency is under a threshold
 */
export function assertLatencyUnder(latencyMs: number, thresholdMs: number, label?: string): void {
  const message = label
    ? `${label} latency (${latencyMs}ms) should be under ${thresholdMs}ms`
    : `Latency (${latencyMs}ms) should be under ${thresholdMs}ms`;

  expect(latencyMs, message).toBeLessThan(thresholdMs);
}

/**
 * Assert that a cache hit occurred
 * Checks if subsequent request is significantly faster
 */
export function assertCacheHit(cachedLatency: number, uncachedLatency: number, speedupFactor: number = 2): void {
  expect(cachedLatency).toBeLessThan(uncachedLatency / speedupFactor);
}

/**
 * Assert that a cache miss occurred
 * Both requests should have similar latency
 */
export function assertCacheMiss(firstLatency: number, secondLatency: number, tolerance: number = 0.5): void {
  const ratio = Math.abs(firstLatency - secondLatency) / Math.max(firstLatency, secondLatency);
  expect(ratio).toBeLessThan(tolerance);
}

/**
 * Assert that a value is within a percentage range
 */
export function assertWithinPercentage(actual: number, expected: number, percentage: number): void {
  const min = expected * (1 - percentage / 100);
  const max = expected * (1 + percentage / 100);
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
}

/**
 * Assert that validation error occurred
 */
export function assertValidationError(response: Response | any, field?: string): void {
  const statusCode = response.status || response.statusCode;
  expect(statusCode).toBe(400);

  const body = response.body;
  expect(body).toHaveProperty('error');

  if (field) {
    // Check if error mentions the field
    const errorMessage = JSON.stringify(body);
    expect(errorMessage).toMatch(new RegExp(field, 'i'));
  }
}

/**
 * Assert response matches expected schema
 */
export function assertResponseSchema(response: any, schema: Record<string, any>): void {
  const body = response.body || response.json;

  for (const [key, type] of Object.entries(schema)) {
    expect(body).toHaveProperty(key);

    if (type === 'string') {
      expect(typeof body[key]).toBe('string');
    } else if (type === 'number') {
      expect(typeof body[key]).toBe('number');
    } else if (type === 'boolean') {
      expect(typeof body[key]).toBe('boolean');
    } else if (type === 'object') {
      expect(typeof body[key]).toBe('object');
      expect(body[key]).not.toBeNull();
    } else if (type === 'array') {
      expect(Array.isArray(body[key])).toBe(true);
    }
  }
}

/**
 * Calculate percentile from an array of numbers
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate statistics from an array of numbers
 */
export interface Stats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export function calculateStats(values: number[]): Stats {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, stdDev: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;

  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
    stdDev,
  };
}

/**
 * Assert that performance meets SLA
 */
export function assertPerformanceSLA(
  stats: Stats,
  sla: {
    p50?: number;
    p95?: number;
    p99?: number;
    max?: number;
  }
): void {
  if (sla.p50 !== undefined) {
    assertLatencyUnder(stats.median, sla.p50, 'P50');
  }
  if (sla.p95 !== undefined) {
    assertLatencyUnder(stats.p95, sla.p95, 'P95');
  }
  if (sla.p99 !== undefined) {
    assertLatencyUnder(stats.p99, sla.p99, 'P99');
  }
  if (sla.max !== undefined) {
    assertLatencyUnder(stats.max, sla.max, 'Max');
  }
}

/**
 * Assert concurrent operations completed successfully
 */
export async function assertConcurrentSuccess<T>(
  operations: Array<() => Promise<T>>,
  expectedSuccessCount?: number
): Promise<T[]> {
  const results = await Promise.allSettled(operations.map((op) => op()));

  const successes = results.filter((r) => r.status === 'fulfilled');
  const failures = results.filter((r) => r.status === 'rejected');

  if (expectedSuccessCount !== undefined) {
    expect(successes.length).toBe(expectedSuccessCount);
  } else {
    expect(failures.length).toBe(0);
  }

  return successes.map((r: any) => r.value);
}

/**
 * Assert that error contains specific message
 */
export function assertErrorMessage(error: Error, expectedMessage: string | RegExp): void {
  if (typeof expectedMessage === 'string') {
    expect(error.message).toContain(expectedMessage);
  } else {
    expect(error.message).toMatch(expectedMessage);
  }
}

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Benchmark a function with multiple iterations
 */
export async function benchmark(
  fn: () => Promise<any>,
  iterations: number = 100
): Promise<{ latencies: number[]; stats: Stats }> {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureExecutionTime(fn);
    latencies.push(duration);
  }

  return {
    latencies,
    stats: calculateStats(latencies),
  };
}
