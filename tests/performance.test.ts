/**
 * Performance Benchmark Tests
 *
 * Validates that the system meets performance SLAs:
 * - Auth with KV cache: <50ms p99
 * - Rate limiting: <5ms p99
 * - Full request flow: <100ms p99
 * - Throughput targets
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupTestEnvironment,
  createMockRequest,
  wait,
  type TestEnvironment,
} from './utils/setup.js';
import {
  authenticateIrisRequest,
  clearAuthCache,
} from '../lib/auth.js';
import {
  rateLimitCombined,
  clearAllRateLimits,
  stopCleanupTimer,
} from '../lib/rate-limit.js';
import { TelemetryEventSchema } from '../lib/schemas.js';
import {
  benchmark,
  calculateStats,
  assertPerformanceSLA,
  percentile,
  type Stats,
} from './utils/assertions.js';

describe('Performance Benchmarks', () => {
  let env: TestEnvironment;

  beforeAll(async () => {
    env = await setupTestEnvironment(1);
  });

  afterAll(async () => {
    await env.cleanup();
    stopCleanupTimer();
  });

  describe('Authentication Performance', () => {
    it('[performance] auth with KV cache should be <50ms p99', async () => {
      const project = env.projects[0];

      // Warm up cache
      const warmupReq = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(warmupReq);

      // Benchmark cached authentication
      const { stats } = await benchmark(async () => {
        const request = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
        });
        await authenticateIrisRequest(request);
      }, 100);

      console.log(`\nAuth (cached) performance:
  Min: ${stats.min.toFixed(2)}ms
  P50: ${stats.median.toFixed(2)}ms
  P95: ${stats.p95.toFixed(2)}ms
  P99: ${stats.p99.toFixed(2)}ms
  Max: ${stats.max.toFixed(2)}ms`);

      // SLA validation
      assertPerformanceSLA(stats, {
        p50: 5,
        p95: 10,
        p99: 50,
      });
    });

    it('[performance] auth without cache should be <200ms p99', async () => {
      const project = env.projects[0];

      // Benchmark uncached authentication
      const { stats } = await benchmark(async () => {
        clearAuthCache();
        const request = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
        });
        await authenticateIrisRequest(request);
      }, 50);

      console.log(`\nAuth (uncached) performance:
  Min: ${stats.min.toFixed(2)}ms
  P50: ${stats.median.toFixed(2)}ms
  P95: ${stats.p95.toFixed(2)}ms
  P99: ${stats.p99.toFixed(2)}ms
  Max: ${stats.max.toFixed(2)}ms`);

      assertPerformanceSLA(stats, {
        p99: 200,
      });
    });

    it('[performance] should measure cache speedup factor', async () => {
      const project = env.projects[0];

      // Measure uncached
      clearAuthCache();
      const { stats: uncachedStats } = await benchmark(async () => {
        clearAuthCache();
        const request = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
        });
        await authenticateIrisRequest(request);
      }, 20);

      // Warm cache
      const warmupReq = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(warmupReq);

      // Measure cached
      const { stats: cachedStats } = await benchmark(async () => {
        const request = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
        });
        await authenticateIrisRequest(request);
      }, 100);

      const speedup = uncachedStats.median / cachedStats.median;

      console.log(`\nCache speedup:
  Uncached P50: ${uncachedStats.median.toFixed(2)}ms
  Cached P50: ${cachedStats.median.toFixed(2)}ms
  Speedup: ${speedup.toFixed(1)}x`);

      // Cache should provide at least 2x speedup
      expect(speedup).toBeGreaterThan(2);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('[performance] rate limit check should be <5ms p99', async () => {
      const project = env.projects[0];
      clearAllRateLimits();

      const { stats } = await benchmark(async () => {
        rateLimitCombined(
          '192.168.1.1',
          project.id,
          { maxRequests: 1000, windowMs: 60000 },
          { maxRequests: 10000, windowMs: 60000 }
        );
      }, 1000);

      console.log(`\nRate limit performance:
  Min: ${stats.min.toFixed(3)}ms
  P50: ${stats.median.toFixed(3)}ms
  P95: ${stats.p95.toFixed(3)}ms
  P99: ${stats.p99.toFixed(3)}ms
  Max: ${stats.max.toFixed(3)}ms`);

      assertPerformanceSLA(stats, {
        p50: 1,
        p95: 2,
        p99: 5,
      });
    });

    it('[performance] should handle 10k rate limit checks in <5s', async () => {
      const project = env.projects[0];
      clearAllRateLimits();

      const numChecks = 10000;
      const start = performance.now();

      for (let i = 0; i < numChecks; i++) {
        rateLimitCombined(
          `ip-${i % 100}`, // 100 unique IPs
          project.id,
          { maxRequests: 10000, windowMs: 60000 },
          { maxRequests: 100000, windowMs: 60000 }
        );
      }

      const duration = performance.now() - start;
      const throughput = numChecks / (duration / 1000);

      console.log(`\nRate limit throughput:
  Checks: ${numChecks}
  Duration: ${duration.toFixed(0)}ms
  Throughput: ${throughput.toFixed(0)} checks/sec`);

      expect(duration).toBeLessThan(5000);
      expect(throughput).toBeGreaterThan(2000); // At least 2k checks/sec
    });

    it('[performance] should scale with number of unique keys', async () => {
      const project = env.projects[0];
      const keyCounts = [10, 100, 1000];
      const results: Array<{ keys: number; avgLatency: number }> = [];

      for (const numKeys of keyCounts) {
        clearAllRateLimits();

        const latencies: number[] = [];

        for (let i = 0; i < numKeys; i++) {
          const start = performance.now();
          rateLimitCombined(
            `scale-test-${i}`,
            project.id,
            { maxRequests: 1000, windowMs: 60000 },
            { maxRequests: 10000, windowMs: 60000 }
          );
          latencies.push(performance.now() - start);
        }

        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        results.push({ keys: numKeys, avgLatency });
      }

      console.log('\nRate limit scaling:');
      results.forEach((r) => {
        console.log(`  ${r.keys} keys: ${r.avgLatency.toFixed(3)}ms avg`);
      });

      // Should remain performant even with many keys
      results.forEach((r) => {
        expect(r.avgLatency).toBeLessThan(1);
      });
    });
  });

  describe('Validation Performance', () => {
    it('[performance] validation should be <5ms p99', async () => {
      const payload = {
        expertId: 'expert-123',
        projectId: 'project-123',
        confidence: 0.95,
        latencyMs: 150,
        outcome: 'success',
        metadata: {
          model: 'claude-3-opus',
          temperature: 0.7,
        },
      };

      const { stats } = await benchmark(async () => {
        TelemetryEventSchema.parse(payload);
      }, 1000);

      console.log(`\nValidation performance:
  Min: ${stats.min.toFixed(3)}ms
  P50: ${stats.median.toFixed(3)}ms
  P95: ${stats.p95.toFixed(3)}ms
  P99: ${stats.p99.toFixed(3)}ms
  Max: ${stats.max.toFixed(3)}ms`);

      assertPerformanceSLA(stats, {
        p99: 5,
      });
    });
  });

  describe('Full Request Flow Performance', () => {
    it('[performance] complete flow should be <100ms p99', async () => {
      const project = env.projects[0];

      // Warm cache
      const warmupReq = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(warmupReq);

      const { stats } = await benchmark(async () => {
        // 1. Auth
        const request = createMockRequest({
          method: 'POST',
          headers: { Authorization: `Bearer ${project.apiKey}` },
          body: {
            expertId: 'expert-123',
            confidence: 0.95,
            latencyMs: 150,
          },
        });

        const authResult = await authenticateIrisRequest(request);

        // 2. Rate limit
        rateLimitCombined(
          '192.168.1.1',
          authResult.projectId,
          { maxRequests: 1000, windowMs: 60000 },
          { maxRequests: 10000, windowMs: 60000 }
        );

        // 3. Validate
        const body = await request.json();
        TelemetryEventSchema.parse(body);
      }, 100);

      console.log(`\nFull request flow performance:
  Min: ${stats.min.toFixed(2)}ms
  P50: ${stats.median.toFixed(2)}ms
  P95: ${stats.p95.toFixed(2)}ms
  P99: ${stats.p99.toFixed(2)}ms
  Max: ${stats.max.toFixed(2)}ms`);

      assertPerformanceSLA(stats, {
        p50: 10,
        p95: 50,
        p99: 100,
      });
    });

    it('[performance] should sustain 1000 req/sec throughput', async () => {
      const project = env.projects[0];
      const targetRPS = 1000;
      const durationSec = 1;
      const numRequests = targetRPS * durationSec;

      // Warm cache
      const warmupReq = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(warmupReq);

      clearAllRateLimits();

      const start = performance.now();

      const promises = Array(numRequests)
        .fill(null)
        .map(async (_, i) => {
          const request = createMockRequest({
            headers: { Authorization: `Bearer ${project.apiKey}` },
            body: {
              expertId: `expert-${i}`,
              confidence: 0.95,
            },
          });

          await authenticateIrisRequest(request);

          rateLimitCombined(
            `ip-${i % 10}`,
            project.id,
            { maxRequests: 100000, windowMs: 60000 },
            { maxRequests: 1000000, windowMs: 60000 }
          );
        });

      await Promise.all(promises);

      const duration = performance.now() - start;
      const actualRPS = numRequests / (duration / 1000);

      console.log(`\nThroughput test:
  Requests: ${numRequests}
  Duration: ${duration.toFixed(0)}ms
  Target RPS: ${targetRPS}
  Actual RPS: ${actualRPS.toFixed(0)}
  Success: ${actualRPS >= targetRPS ? '✓' : '✗'}`);

      // Should achieve target throughput (with 20% tolerance)
      expect(actualRPS).toBeGreaterThan(targetRPS * 0.8);
    });
  });

  describe('Concurrent Load Performance', () => {
    it('[performance] should handle 100 concurrent requests efficiently', async () => {
      const project = env.projects[0];
      const concurrency = 100;

      // Warm cache
      const warmupReq = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(warmupReq);

      const start = performance.now();
      const latencies: number[] = [];

      const promises = Array(concurrency)
        .fill(null)
        .map(async () => {
          const reqStart = performance.now();

          const request = createMockRequest({
            headers: { Authorization: `Bearer ${project.apiKey}` },
          });

          await authenticateIrisRequest(request);

          const latency = performance.now() - reqStart;
          latencies.push(latency);
        });

      await Promise.all(promises);

      const totalDuration = performance.now() - start;
      const stats = calculateStats(latencies);

      console.log(`\nConcurrent load (${concurrency} requests):
  Total duration: ${totalDuration.toFixed(0)}ms
  P50 latency: ${stats.median.toFixed(2)}ms
  P95 latency: ${stats.p95.toFixed(2)}ms
  P99 latency: ${stats.p99.toFixed(2)}ms`);

      // Individual requests should still be fast
      assertPerformanceSLA(stats, {
        p99: 100,
      });

      // Total time should be reasonable
      expect(totalDuration).toBeLessThan(1000);
    });

    it('[performance] should maintain performance under sustained concurrent load', async () => {
      const project = env.projects[0];
      const concurrency = 50;
      const iterations = 10;

      // Warm cache
      const warmupReq = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(warmupReq);

      const iterationStats: Stats[] = [];

      for (let iter = 0; iter < iterations; iter++) {
        const latencies: number[] = [];

        const promises = Array(concurrency)
          .fill(null)
          .map(async () => {
            const start = performance.now();

            const request = createMockRequest({
              headers: { Authorization: `Bearer ${project.apiKey}` },
            });

            await authenticateIrisRequest(request);

            latencies.push(performance.now() - start);
          });

        await Promise.all(promises);

        iterationStats.push(calculateStats(latencies));

        // Small delay between iterations
        await wait(10);
      }

      // Calculate overall stats
      const allP99s = iterationStats.map((s) => s.p99);
      const avgP99 = allP99s.reduce((a, b) => a + b, 0) / allP99s.length;
      const maxP99 = Math.max(...allP99s);

      console.log(`\nSustained concurrent load (${concurrency} concurrent, ${iterations} iterations):
  Average P99: ${avgP99.toFixed(2)}ms
  Max P99: ${maxP99.toFixed(2)}ms
  Stability: ${((1 - (maxP99 - avgP99) / avgP99) * 100).toFixed(1)}%`);

      // Performance should remain stable
      expect(avgP99).toBeLessThan(50);
      expect(maxP99).toBeLessThan(100);

      // Should not degrade significantly over time
      const variance = Math.max(...allP99s) - Math.min(...allP99s);
      expect(variance).toBeLessThan(50);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('[performance] should not leak memory over many requests', async () => {
      const project = env.projects[0];
      const numRequests = 1000;

      const memBefore = process.memoryUsage();

      for (let i = 0; i < numRequests; i++) {
        const request = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
        });

        await authenticateIrisRequest(request);

        rateLimitCombined(
          `ip-${i % 100}`,
          project.id,
          { maxRequests: 10000, windowMs: 60000 },
          { maxRequests: 100000, windowMs: 60000 }
        );
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memAfter = process.memoryUsage();
      const heapGrowth = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      console.log(`\nMemory usage (${numRequests} requests):
  Heap before: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB
  Heap after: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)} MB
  Growth: ${heapGrowth.toFixed(2)} MB`);

      // Heap growth should be minimal (< 10MB)
      expect(Math.abs(heapGrowth)).toBeLessThan(10);
    });
  });

  describe('Performance Summary', () => {
    it('[performance] should generate comprehensive performance report', async () => {
      const project = env.projects[0];

      console.log('\n=== PERFORMANCE SUMMARY ===\n');

      // 1. Auth Performance
      clearAuthCache();
      const warmupReq = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(warmupReq);

      const authBench = await benchmark(async () => {
        const request = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
        });
        await authenticateIrisRequest(request);
      }, 100);

      console.log(`1. Authentication (cached):
   P50: ${authBench.stats.median.toFixed(2)}ms
   P95: ${authBench.stats.p95.toFixed(2)}ms
   P99: ${authBench.stats.p99.toFixed(2)}ms
   Target: P99 < 50ms
   Status: ${authBench.stats.p99 < 50 ? '✓ PASS' : '✗ FAIL'}\n`);

      // 2. Rate Limit Performance
      clearAllRateLimits();
      const rateLimitBench = await benchmark(async () => {
        rateLimitCombined(
          '192.168.1.1',
          project.id,
          { maxRequests: 10000, windowMs: 60000 },
          { maxRequests: 100000, windowMs: 60000 }
        );
      }, 1000);

      console.log(`2. Rate Limiting:
   P50: ${rateLimitBench.stats.median.toFixed(3)}ms
   P95: ${rateLimitBench.stats.p95.toFixed(3)}ms
   P99: ${rateLimitBench.stats.p99.toFixed(3)}ms
   Target: P99 < 5ms
   Status: ${rateLimitBench.stats.p99 < 5 ? '✓ PASS' : '✗ FAIL'}\n`);

      // 3. Full Flow Performance
      const flowBench = await benchmark(async () => {
        const request = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
          body: {
            expertId: 'expert-123',
            confidence: 0.95,
          },
        });

        await authenticateIrisRequest(request);

        rateLimitCombined(
          '192.168.1.1',
          project.id,
          { maxRequests: 10000, windowMs: 60000 },
          { maxRequests: 100000, windowMs: 60000 }
        );

        const body = await request.json();
        TelemetryEventSchema.parse(body);
      }, 100);

      console.log(`3. Full Request Flow:
   P50: ${flowBench.stats.median.toFixed(2)}ms
   P95: ${flowBench.stats.p95.toFixed(2)}ms
   P99: ${flowBench.stats.p99.toFixed(2)}ms
   Target: P99 < 100ms
   Status: ${flowBench.stats.p99 < 100 ? '✓ PASS' : '✗ FAIL'}\n`);

      console.log('===========================\n');

      // All benchmarks should pass
      expect(authBench.stats.p99).toBeLessThan(50);
      expect(rateLimitBench.stats.p99).toBeLessThan(5);
      expect(flowBench.stats.p99).toBeLessThan(100);
    });
  });
});
