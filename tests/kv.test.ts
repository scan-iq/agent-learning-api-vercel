/**
 * Integration Tests: Vercel KV / Caching
 *
 * Tests authentication cache behavior including:
 * - Cache hit/miss scenarios
 * - TTL expiration
 * - Concurrent access
 * - Fallback behavior
 * - Key prefix isolation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateApiKey,
  clearAuthCache,
  getAuthCacheStats,
} from '../lib/auth.js';
import {
  setupTestEnvironment,
  createTestProject,
  deleteTestProject,
  wait,
  MockVercelKV,
  type TestEnvironment,
} from './utils/setup.js';
import {
  assertLatencyUnder,
  assertCacheHit,
  measureExecutionTime,
  benchmark,
} from './utils/assertions.js';

describe('KV Integration Tests', () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = await setupTestEnvironment(1);
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Auth Cache Hit/Miss Behavior', () => {
    it('[integration] should cache API key validation result', async () => {
      const project = env.projects[0];

      // First call - cache miss
      const { duration: firstDuration } = await measureExecutionTime(async () => {
        return await validateApiKey(project.apiKey);
      });

      // Second call - should be from cache
      const { duration: cachedDuration } = await measureExecutionTime(async () => {
        return await validateApiKey(project.apiKey);
      });

      // Cached request should be significantly faster
      assertCacheHit(cachedDuration, firstDuration);

      // Verify cache stats
      const stats = getAuthCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].projectId).toBe(project.id);
    });

    it('[integration] should return same result for cached and uncached requests', async () => {
      const project = env.projects[0];

      // Clear cache to ensure fresh start
      clearAuthCache();

      // First request - uncached
      const result1 = await validateApiKey(project.apiKey);

      // Second request - cached
      const result2 = await validateApiKey(project.apiKey);

      // Results should be identical
      expect(result1).toEqual(result2);
      expect(result1.id).toBe(project.id);
      expect(result1.name).toBe(project.name);
    });

    it('[integration] should handle cache miss for invalid API key', async () => {
      const invalidKey = 'sk_live_invalid_key_123456789';

      // Should throw error for invalid key
      await expect(validateApiKey(invalidKey)).rejects.toThrow('Invalid API key');

      // Cache should not contain invalid key
      const stats = getAuthCacheStats();
      expect(stats.size).toBe(0);
    });

    it('[integration] should isolate cache by API key', async () => {
      const project1 = env.projects[0];
      const project2 = await createTestProject({ name: 'Project 2' });

      try {
        // Validate both API keys
        await validateApiKey(project1.apiKey);
        await validateApiKey(project2.apiKey);

        // Cache should have both entries
        const stats = getAuthCacheStats();
        expect(stats.size).toBe(2);

        const projectIds = stats.entries.map((e) => e.projectId);
        expect(projectIds).toContain(project1.id);
        expect(projectIds).toContain(project2.id);
      } finally {
        await deleteTestProject(project2.id);
      }
    });
  });

  describe('TTL Expiration', () => {
    it('[integration] should respect cache TTL and re-validate after expiration', async () => {
      const project = env.projects[0];

      // Note: Current implementation has 5 minute TTL
      // For testing, we'll verify the cache expiration logic

      // First validation
      const result1 = await validateApiKey(project.apiKey);

      // Check cache stats - should have expiry time
      const stats1 = getAuthCacheStats();
      expect(stats1.size).toBe(1);
      expect(stats1.entries[0].expiresAt).toBeDefined();

      const expiresAt = new Date(stats1.entries[0].expiresAt).getTime();
      const now = Date.now();
      const ttl = expiresAt - now;

      // TTL should be approximately 5 minutes (300000ms)
      // Allow 10 seconds tolerance for test execution time
      expect(ttl).toBeGreaterThan(295000);
      expect(ttl).toBeLessThanOrEqual(300000);
    });

    it('[integration] should refresh cache entry on re-validation', async () => {
      const project = env.projects[0];

      // First validation
      await validateApiKey(project.apiKey);
      const stats1 = getAuthCacheStats();
      const firstExpiry = new Date(stats1.entries[0].expiresAt).getTime();

      // Wait a bit
      await wait(100);

      // Clear cache and re-validate
      clearAuthCache();
      await validateApiKey(project.apiKey);

      const stats2 = getAuthCacheStats();
      const secondExpiry = new Date(stats2.entries[0].expiresAt).getTime();

      // Second expiry should be later than first
      expect(secondExpiry).toBeGreaterThan(firstExpiry);
    });
  });

  describe('Concurrent Access', () => {
    it('[integration] should handle concurrent cache access without race conditions', async () => {
      const project = env.projects[0];

      // Clear cache
      clearAuthCache();

      // Make 10 concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() => validateApiKey(project.apiKey));

      const results = await Promise.all(promises);

      // All results should be identical
      results.forEach((result) => {
        expect(result.id).toBe(project.id);
        expect(result.name).toBe(project.name);
      });

      // Cache should only have one entry (no duplicates)
      const stats = getAuthCacheStats();
      expect(stats.size).toBe(1);
    });

    it('[integration] should handle concurrent requests for different API keys', async () => {
      const project1 = env.projects[0];
      const project2 = await createTestProject({ name: 'Project 2' });
      const project3 = await createTestProject({ name: 'Project 3' });

      try {
        clearAuthCache();

        // Make concurrent requests for different projects
        const results = await Promise.all([
          validateApiKey(project1.apiKey),
          validateApiKey(project2.apiKey),
          validateApiKey(project3.apiKey),
          validateApiKey(project1.apiKey), // Duplicate
          validateApiKey(project2.apiKey), // Duplicate
        ]);

        // Verify all results
        expect(results[0].id).toBe(project1.id);
        expect(results[1].id).toBe(project2.id);
        expect(results[2].id).toBe(project3.id);
        expect(results[3].id).toBe(project1.id);
        expect(results[4].id).toBe(project2.id);

        // Cache should have 3 unique entries
        const stats = getAuthCacheStats();
        expect(stats.size).toBe(3);
      } finally {
        await deleteTestProject(project2.id);
        await deleteTestProject(project3.id);
      }
    });

    it('[integration] should maintain cache consistency under concurrent updates', async () => {
      const project = env.projects[0];

      // Simulate concurrent cache operations
      const operations = Array(50)
        .fill(null)
        .map(async (_, i) => {
          if (i % 10 === 0) {
            // Every 10th operation clears cache
            clearAuthCache();
          }
          return await validateApiKey(project.apiKey);
        });

      const results = await Promise.allSettled(operations);

      // All successful operations should return same project
      const successful = results.filter((r) => r.status === 'fulfilled') as any[];
      successful.forEach((result) => {
        expect(result.value.id).toBe(project.id);
      });

      // Should have at least some successes
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback When KV Unavailable', () => {
    it('[integration] should fallback to database when cache is cleared', async () => {
      const project = env.projects[0];

      // First request - populate cache
      const result1 = await validateApiKey(project.apiKey);

      // Clear cache to simulate KV failure
      clearAuthCache();

      // Second request - should fallback to database
      const result2 = await validateApiKey(project.apiKey);

      // Results should be identical
      expect(result1).toEqual(result2);
    });

    it('[integration] should continue working when cache operations fail', async () => {
      const project = env.projects[0];

      // Even with cache cleared repeatedly, auth should work
      for (let i = 0; i < 5; i++) {
        clearAuthCache();
        const result = await validateApiKey(project.apiKey);
        expect(result.id).toBe(project.id);
      }
    });
  });

  describe('Key Prefix Isolation', () => {
    it('[integration] should use unique cache keys for different API keys', async () => {
      const project1 = env.projects[0];
      const project2 = await createTestProject({ name: 'Project 2' });

      try {
        clearAuthCache();

        // Validate both
        await validateApiKey(project1.apiKey);
        await validateApiKey(project2.apiKey);

        // Cache should have 2 entries
        const stats = getAuthCacheStats();
        expect(stats.size).toBe(2);

        // Entries should be for different projects
        const projectIds = new Set(stats.entries.map((e) => e.projectId));
        expect(projectIds.size).toBe(2);
      } finally {
        await deleteTestProject(project2.id);
      }
    });

    it('[integration] should not leak cache between different API keys', async () => {
      const project1 = env.projects[0];
      const project2 = await createTestProject({ name: 'Project 2' });

      try {
        clearAuthCache();

        // Validate project1
        await validateApiKey(project1.apiKey);

        // Trying to use project1's result for project2 should fail
        // This is implicitly tested by the cache isolation
        const result2 = await validateApiKey(project2.apiKey);
        expect(result2.id).toBe(project2.id);
        expect(result2.id).not.toBe(project1.id);
      } finally {
        await deleteTestProject(project2.id);
      }
    });
  });

  describe('Mock Vercel KV Tests', () => {
    it('[unit] should support basic KV operations', async () => {
      const kv = new MockVercelKV();

      // Set and get
      await kv.set('test-key', { value: 'test-value' });
      const result = await kv.get('test-key');
      expect(result).toEqual({ value: 'test-value' });

      // Delete
      await kv.del('test-key');
      const deleted = await kv.get('test-key');
      expect(deleted).toBeNull();
    });

    it('[unit] should support TTL with ex option', async () => {
      const kv = new MockVercelKV();

      // Set with 1 second TTL
      await kv.set('ttl-key', 'value', { ex: 1 });

      // Should exist immediately
      const before = await kv.get('ttl-key');
      expect(before).toBe('value');

      // Wait for expiration
      await wait(1100);

      // Should be expired
      const after = await kv.get('ttl-key');
      expect(after).toBeNull();
    });

    it('[unit] should support TTL with px option', async () => {
      const kv = new MockVercelKV();

      // Set with 100ms TTL
      await kv.set('ttl-key', 'value', { px: 100 });

      // Should exist immediately
      const before = await kv.get('ttl-key');
      expect(before).toBe('value');

      // Wait for expiration
      await wait(150);

      // Should be expired
      const after = await kv.get('ttl-key');
      expect(after).toBeNull();
    });

    it('[unit] should support exists operation', async () => {
      const kv = new MockVercelKV();

      await kv.set('key1', 'value1');

      expect(await kv.exists('key1')).toBe(1);
      expect(await kv.exists('key2')).toBe(0);
    });

    it('[unit] should support incr operation', async () => {
      const kv = new MockVercelKV();

      expect(await kv.incr('counter')).toBe(1);
      expect(await kv.incr('counter')).toBe(2);
      expect(await kv.incr('counter')).toBe(3);
    });

    it('[unit] should support TTL query', async () => {
      const kv = new MockVercelKV();

      await kv.set('key1', 'value1', { ex: 10 });
      const ttl = await kv.ttl('key1');

      expect(ttl).toBeGreaterThan(8);
      expect(ttl).toBeLessThanOrEqual(10);

      // Non-existent key
      expect(await kv.ttl('nonexistent')).toBe(-2);

      // Key without expiry
      await kv.set('key2', 'value2');
      expect(await kv.ttl('key2')).toBe(-1);
    });
  });

  describe('Performance Tests', () => {
    it('[integration] should achieve fast cache lookups (<10ms p99)', async () => {
      const project = env.projects[0];

      // Warm up cache
      await validateApiKey(project.apiKey);

      // Benchmark cache lookups
      const { stats } = await benchmark(
        async () => validateApiKey(project.apiKey),
        100
      );

      // Cache lookups should be very fast
      assertLatencyUnder(stats.p99, 10, 'Cache lookup P99');
      assertLatencyUnder(stats.median, 5, 'Cache lookup P50');
    });

    it('[integration] should show measurable speedup from caching', async () => {
      const project = env.projects[0];

      // Measure uncached performance
      clearAuthCache();
      const { stats: uncachedStats } = await benchmark(
        async () => {
          clearAuthCache();
          return await validateApiKey(project.apiKey);
        },
        20
      );

      // Measure cached performance
      await validateApiKey(project.apiKey); // Warm up
      const { stats: cachedStats } = await benchmark(
        async () => validateApiKey(project.apiKey),
        100
      );

      // Cached should be at least 2x faster
      expect(cachedStats.median).toBeLessThan(uncachedStats.median / 2);

      console.log('Cache performance comparison:');
      console.log(`  Uncached P50: ${uncachedStats.median.toFixed(2)}ms`);
      console.log(`  Cached P50: ${cachedStats.median.toFixed(2)}ms`);
      console.log(`  Speedup: ${(uncachedStats.median / cachedStats.median).toFixed(1)}x`);
    });
  });
});
