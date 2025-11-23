/**
 * End-to-End Tests
 *
 * Tests complete request flows including:
 * - Full auth → rate limit → validation → response flow
 * - Cache warming and invalidation
 * - Error recovery scenarios
 * - Multi-step workflows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setupTestEnvironment,
  createTestProject,
  deleteTestProject,
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
  getRateLimitStatus,
  stopCleanupTimer,
} from '../lib/rate-limit.js';
import {
  findProjectByApiKey,
  revokeApiKey,
  createApiKey,
} from '../lib/apiKeys.js';
import { TelemetryEventSchema } from '../lib/schemas.js';
import {
  assertAuthSuccess,
  assertAuthFailure,
  assertRateLimited,
  measureExecutionTime,
  assertLatencyUnder,
} from './utils/assertions.js';

describe('End-to-End Tests', () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = await setupTestEnvironment(1);
    clearAllRateLimits();
  });

  afterEach(async () => {
    await env.cleanup();
    clearAllRateLimits();
    stopCleanupTimer();
  });

  describe('Full Request Flow: Auth → Rate Limit → Validation → Response', () => {
    it('[e2e] should complete successful request flow', async () => {
      const project = env.projects[0];

      // Simulate complete API request flow
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/iris/telemetry',
        headers: {
          Authorization: `Bearer ${project.apiKey}`,
        },
        body: {
          expertId: 'expert-123',
          confidence: 0.95,
          latencyMs: 150,
          outcome: 'success',
        },
      });

      // Step 1: Authentication
      const { result: authResult, duration: authDuration } = await measureExecutionTime(
        async () => authenticateIrisRequest(request)
      );

      expect(authResult.projectId).toBe(project.id);
      assertLatencyUnder(authDuration, 100, 'Authentication');

      // Step 2: Rate Limiting
      const ip = '192.168.1.1';
      const { duration: rateLimitDuration } = await measureExecutionTime(async () => {
        rateLimitCombined(
          ip,
          authResult.projectId,
          { maxRequests: 100, windowMs: 60000 },
          { maxRequests: 1000, windowMs: 60000 }
        );
      });

      assertLatencyUnder(rateLimitDuration, 5, 'Rate limiting');

      // Step 3: Validation
      const body = await request.json();
      const { duration: validationDuration } = await measureExecutionTime(async () => {
        const result = TelemetryEventSchema.safeParse(body);
        expect(result.success).toBe(true);
        return result;
      });

      assertLatencyUnder(validationDuration, 5, 'Validation');

      // Total latency should be reasonable
      const totalDuration = authDuration + rateLimitDuration + validationDuration;
      assertLatencyUnder(totalDuration, 150, 'Total request');

      console.log(`E2E flow latencies:
  Auth: ${authDuration.toFixed(2)}ms
  Rate Limit: ${rateLimitDuration.toFixed(2)}ms
  Validation: ${validationDuration.toFixed(2)}ms
  Total: ${totalDuration.toFixed(2)}ms`);
    });

    it('[e2e] should handle complete flow with rate limiting', async () => {
      const project = env.projects[0];
      const ip = '192.168.1.100';
      const maxRequests = 5;

      // Make requests up to limit
      for (let i = 0; i < maxRequests; i++) {
        const request = createMockRequest({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${project.apiKey}`,
          },
          body: {
            expertId: `expert-${i}`,
          },
        });

        // Auth should succeed
        const authResult = await authenticateIrisRequest(request);
        expect(authResult.projectId).toBe(project.id);

        // Rate limit should allow
        expect(() =>
          rateLimitCombined(
            ip,
            authResult.projectId,
            { maxRequests, windowMs: 60000 },
            { maxRequests: 1000, windowMs: 60000 }
          )
        ).not.toThrow();
      }

      // Next request should be rate limited
      const request = createMockRequest({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${project.apiKey}`,
        },
      });

      const authResult = await authenticateIrisRequest(request);

      expect(() =>
        rateLimitCombined(
          ip,
          authResult.projectId,
          { maxRequests, windowMs: 60000 },
          { maxRequests: 1000, windowMs: 60000 }
        )
      ).toThrow(/rate limit/i);
    });

    it('[e2e] should reject invalid requests at validation step', async () => {
      const project = env.projects[0];

      const request = createMockRequest({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${project.apiKey}`,
        },
        body: {
          // Missing required expertId
          confidence: 0.9,
        },
      });

      // Auth passes
      await authenticateIrisRequest(request);

      // Validation fails
      const body = await request.json();
      const validation = TelemetryEventSchema.safeParse(body);

      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(validation.error.flatten().fieldErrors.expertId).toBeDefined();
      }
    });

    it('[e2e] should handle authentication failure early in flow', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid_key_123',
        },
        body: {
          expertId: 'expert-123',
        },
      });

      // Should fail at auth step
      await expect(authenticateIrisRequest(request)).rejects.toThrow();

      // Rate limiting and validation should not be reached
      // (This is implicit - if auth fails, the flow stops)
    });
  });

  describe('Cache Warming and Invalidation', () => {
    it('[e2e] should warm cache on first request', async () => {
      const project = env.projects[0];

      clearAuthCache();

      // First request - cache miss
      const request1 = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });

      const { duration: duration1 } = await measureExecutionTime(async () => {
        return await authenticateIrisRequest(request1);
      });

      // Second request - cache hit
      const request2 = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });

      const { duration: duration2 } = await measureExecutionTime(async () => {
        return await authenticateIrisRequest(request2);
      });

      // Cached request should be faster
      expect(duration2).toBeLessThan(duration1);

      console.log(`Cache warming: First=${duration1.toFixed(2)}ms, Second=${duration2.toFixed(2)}ms`);
    });

    it('[e2e] should invalidate cache when key is revoked', async () => {
      const project = await createTestProject({ name: 'Invalidation Test' });

      try {
        // Warm cache
        const request1 = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
        });
        await authenticateIrisRequest(request1);

        // Revoke key
        const keyInfo = await findProjectByApiKey(project.apiKey);
        expect(keyInfo).not.toBeNull();
        await revokeApiKey(keyInfo!.keyId);

        // Clear cache to simulate expiration
        clearAuthCache();

        // Should fail now
        const request2 = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
        });

        await expect(authenticateIrisRequest(request2)).rejects.toThrow(/invalid or inactive/i);
      } finally {
        await deleteTestProject(project.id);
      }
    });

    it('[e2e] should handle cache across multiple projects', async () => {
      const project1 = env.projects[0];
      const project2 = await createTestProject({ name: 'Multi Project Test' });

      try {
        clearAuthCache();

        // Authenticate both projects
        const req1 = createMockRequest({
          headers: { Authorization: `Bearer ${project1.apiKey}` },
        });
        const result1 = await authenticateIrisRequest(req1);

        const req2 = createMockRequest({
          headers: { Authorization: `Bearer ${project2.apiKey}` },
        });
        const result2 = await authenticateIrisRequest(req2);

        expect(result1.projectId).toBe(project1.id);
        expect(result2.projectId).toBe(project2.id);

        // Both should be cached now
        const { duration: cachedDuration1 } = await measureExecutionTime(async () => {
          const req = createMockRequest({
            headers: { Authorization: `Bearer ${project1.apiKey}` },
          });
          return await authenticateIrisRequest(req);
        });

        const { duration: cachedDuration2 } = await measureExecutionTime(async () => {
          const req = createMockRequest({
            headers: { Authorization: `Bearer ${project2.apiKey}` },
          });
          return await authenticateIrisRequest(req);
        });

        // Both should be fast
        assertLatencyUnder(cachedDuration1, 10, 'Project 1 cached');
        assertLatencyUnder(cachedDuration2, 10, 'Project 2 cached');
      } finally {
        await deleteTestProject(project2.id);
      }
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('[e2e] should recover from transient cache failures', async () => {
      const project = env.projects[0];

      // First request - populate cache
      const req1 = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(req1);

      // Simulate cache failure
      clearAuthCache();

      // Should still work (fallback to database)
      const req2 = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      const result = await authenticateIrisRequest(req2);

      expect(result.projectId).toBe(project.id);
    });

    it('[e2e] should recover from rate limit after window resets', async () => {
      const project = env.projects[0];
      const ip = '192.168.1.200';
      const maxRequests = 3;
      const windowMs = 200;

      // Hit rate limit
      for (let i = 0; i < maxRequests; i++) {
        rateLimitCombined(
          ip,
          project.id,
          { maxRequests, windowMs },
          { maxRequests: 1000, windowMs: 60000 }
        );
      }

      // Should be blocked
      expect(() =>
        rateLimitCombined(
          ip,
          project.id,
          { maxRequests, windowMs },
          { maxRequests: 1000, windowMs: 60000 }
        )
      ).toThrow();

      // Wait for window reset
      await wait(250);

      // Should work again
      expect(() =>
        rateLimitCombined(
          ip,
          project.id,
          { maxRequests, windowMs },
          { maxRequests: 1000, windowMs: 60000 }
        )
      ).not.toThrow();
    });

    it('[e2e] should handle concurrent requests during cache invalidation', async () => {
      const project = env.projects[0];

      // Warm cache
      const req = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(req);

      // Make concurrent requests while clearing cache
      const operations = Array(10)
        .fill(null)
        .map(async (_, i) => {
          if (i === 5) {
            // Clear cache in the middle
            clearAuthCache();
          }
          const request = createMockRequest({
            headers: { Authorization: `Bearer ${project.apiKey}` },
          });
          return await authenticateIrisRequest(request);
        });

      const results = await Promise.all(operations);

      // All should succeed
      results.forEach((result) => {
        expect(result.projectId).toBe(project.id);
      });
    });

    it('[e2e] should handle database connection issues gracefully', async () => {
      // Note: This test demonstrates the pattern
      // In real scenario, you'd need to mock the database connection

      const request = createMockRequest({
        headers: {
          Authorization: 'Bearer sk_live_nonexistent_key',
        },
      });

      // Should get a proper error, not crash
      await expect(authenticateIrisRequest(request)).rejects.toThrow();
    });
  });

  describe('Multi-Step Workflows', () => {
    it('[e2e] should handle API key creation and immediate use', async () => {
      const projectId = `test-workflow-${Date.now()}`;

      // Step 1: Create API key
      const { apiKey } = await createApiKey({
        projectId,
        projectName: 'Workflow Test',
        label: 'workflow-key',
      });

      try {
        // Step 2: Immediately use it (no cache yet)
        const request = createMockRequest({
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        const result = await authenticateIrisRequest(request);

        expect(result.projectId).toBe(projectId);

        // Step 3: Make authenticated request with rate limiting
        rateLimitCombined(
          '192.168.1.1',
          result.projectId,
          { maxRequests: 100, windowMs: 60000 },
          { maxRequests: 1000, windowMs: 60000 }
        );

        // Step 4: Verify rate limit status
        const status = getRateLimitStatus(`ip:192.168.1.1`, 100);
        expect(status.remaining).toBe(99);
      } finally {
        await deleteTestProject(projectId);
      }
    });

    it('[e2e] should handle burst traffic patterns', async () => {
      const project = env.projects[0];
      const maxRequests = 20;

      clearAuthCache();
      clearAllRateLimits();

      // Burst of requests
      const burst1 = Array(10)
        .fill(null)
        .map(async (_, i) => {
          const request = createMockRequest({
            headers: { Authorization: `Bearer ${project.apiKey}` },
            body: { expertId: `expert-${i}` },
          });

          const authResult = await authenticateIrisRequest(request);

          rateLimitCombined(
            `ip-burst-${i}`,
            authResult.projectId,
            { maxRequests, windowMs: 60000 },
            { maxRequests: 1000, windowMs: 60000 }
          );

          return authResult;
        });

      const results1 = await Promise.all(burst1);
      expect(results1.length).toBe(10);

      // Second burst (cache should help)
      const start = performance.now();

      const burst2 = Array(10)
        .fill(null)
        .map(async (_, i) => {
          const request = createMockRequest({
            headers: { Authorization: `Bearer ${project.apiKey}` },
          });
          return await authenticateIrisRequest(request);
        });

      const results2 = await Promise.all(burst2);
      const duration = performance.now() - start;

      expect(results2.length).toBe(10);

      // Average should be fast with caching
      const avgLatency = duration / 10;
      assertLatencyUnder(avgLatency, 20, 'Burst average');

      console.log(`Burst traffic: ${avgLatency.toFixed(2)}ms average per request`);
    });

    it('[e2e] should handle mixed success and failure scenarios', async () => {
      const validProject = env.projects[0];
      const invalidKey = 'sk_live_invalid_key_12345678901234567890';

      const requests = [
        // Valid requests
        createMockRequest({
          headers: { Authorization: `Bearer ${validProject.apiKey}` },
          body: { expertId: 'expert-1' },
        }),
        createMockRequest({
          headers: { Authorization: `Bearer ${validProject.apiKey}` },
          body: { expertId: 'expert-2' },
        }),
        // Invalid request
        createMockRequest({
          headers: { Authorization: `Bearer ${invalidKey}` },
        }),
        // Missing auth
        createMockRequest({
          body: { expertId: 'expert-3' },
        }),
        // Valid request
        createMockRequest({
          headers: { Authorization: `Bearer ${validProject.apiKey}` },
          body: { expertId: 'expert-4' },
        }),
      ];

      const results = await Promise.allSettled(
        requests.map((req) => authenticateIrisRequest(req))
      );

      // Check results
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('rejected');
      expect(results[3].status).toBe('rejected');
      expect(results[4].status).toBe('fulfilled');

      // Successful requests should have correct project ID
      const successful = results.filter((r) => r.status === 'fulfilled') as any[];
      successful.forEach((result) => {
        expect(result.value.projectId).toBe(validProject.id);
      });
    });
  });

  describe('Performance Under Load', () => {
    it('[e2e] should maintain performance under sustained load', async () => {
      const project = env.projects[0];
      const numRequests = 100;

      // Warm cache
      const warmupReq = createMockRequest({
        headers: { Authorization: `Bearer ${project.apiKey}` },
      });
      await authenticateIrisRequest(warmupReq);

      // Sustained load
      const start = performance.now();
      const latencies: number[] = [];

      for (let i = 0; i < numRequests; i++) {
        const reqStart = performance.now();

        const request = createMockRequest({
          headers: { Authorization: `Bearer ${project.apiKey}` },
        });

        await authenticateIrisRequest(request);

        rateLimitCombined(
          `ip-load-${i % 10}`, // 10 different IPs
          project.id,
          { maxRequests: 1000, windowMs: 60000 },
          { maxRequests: 10000, windowMs: 60000 }
        );

        latencies.push(performance.now() - reqStart);
      }

      const totalDuration = performance.now() - start;

      // Calculate percentiles
      const sorted = [...latencies].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      console.log(`Load test (${numRequests} requests):
  Total: ${totalDuration.toFixed(2)}ms
  Throughput: ${(numRequests / (totalDuration / 1000)).toFixed(0)} req/s
  P50: ${p50.toFixed(2)}ms
  P95: ${p95.toFixed(2)}ms
  P99: ${p99.toFixed(2)}ms`);

      // Performance targets
      assertLatencyUnder(p50, 10, 'P50');
      assertLatencyUnder(p95, 20, 'P95');
      assertLatencyUnder(p99, 50, 'P99');
    });
  });
});
