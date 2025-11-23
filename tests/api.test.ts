/**
 * Integration Tests: API Endpoints
 *
 * Tests API endpoints including:
 * - Authentication and authorization
 * - Input validation
 * - CRUD operations
 * - Error handling
 * - Race conditions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractApiKey,
  validateApiKey,
  authenticateIrisRequest,
  clearAuthCache,
} from '../lib/auth.js';
import {
  createApiKey,
  findProjectByApiKey,
  revokeApiKey,
  isValidApiKeyFormat,
  generateApiKey,
  hashApiKey,
} from '../lib/apiKeys.js';
import { TelemetryEventSchema, EnhancedTelemetrySchema } from '../lib/schemas.js';
import {
  setupTestEnvironment,
  createTestProject,
  deleteTestProject,
  createMockRequest,
  createMockVercelRequest,
  createMockVercelResponse,
  type TestEnvironment,
} from './utils/setup.js';
import {
  assertAuthSuccess,
  assertAuthFailure,
  assertValidationError,
  assertResponseSchema,
} from './utils/assertions.js';

describe('API Endpoint Tests', () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = await setupTestEnvironment(1);
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Authentication and Authorization', () => {
    it('[integration] should authenticate valid API key', async () => {
      const project = env.projects[0];

      const request = createMockRequest({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${project.apiKey}`,
        },
      });

      const result = await authenticateIrisRequest(request);

      expect(result.projectId).toBe(project.id);
      expect(result.projectName).toBe(project.name);
      expect(result.keyId).toBeDefined();
    });

    it('[integration] should reject invalid API key', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: {
          Authorization: 'Bearer sk_live_invalid_key_123456789',
        },
      });

      await expect(authenticateIrisRequest(request)).rejects.toThrow(/invalid or inactive/i);
    });

    it('[integration] should reject missing Authorization header', async () => {
      const request = createMockRequest({
        method: 'POST',
      });

      await expect(authenticateIrisRequest(request)).rejects.toThrow(/authorization.*required/i);
    });

    it('[unit] should extract API key from Bearer token', () => {
      const apiKey = 'sk_live_test123';
      const request = createMockRequest({
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const extracted = extractApiKey(request);
      expect(extracted).toBe(apiKey);
    });

    it('[unit] should extract API key without Bearer prefix', () => {
      const apiKey = 'sk_live_test123';
      const request = createMockRequest({
        headers: {
          Authorization: apiKey,
        },
      });

      const extracted = extractApiKey(request);
      expect(extracted).toBe(apiKey);
    });

    it('[unit] should handle case-insensitive Authorization header', () => {
      const apiKey = 'sk_live_test123';
      const request = createMockRequest({
        headers: {
          authorization: `Bearer ${apiKey}`, // lowercase
        },
      });

      const extracted = extractApiKey(request);
      expect(extracted).toBe(apiKey);
    });

    it('[integration] should reject revoked API key', async () => {
      const project = await createTestProject({ name: 'Revoke Test' });

      try {
        // Find the key ID
        const keyInfo = await findProjectByApiKey(project.apiKey);
        expect(keyInfo).not.toBeNull();

        // Revoke the key
        await revokeApiKey(keyInfo!.keyId);

        // Clear cache to force re-validation
        clearAuthCache();

        // Should reject revoked key
        const request = createMockRequest({
          headers: {
            Authorization: `Bearer ${project.apiKey}`,
          },
        });

        await expect(authenticateIrisRequest(request)).rejects.toThrow(/invalid or inactive/i);
      } finally {
        await deleteTestProject(project.id);
      }
    });
  });

  describe('Input Validation', () => {
    it('[unit] should validate telemetry event schema', () => {
      const validEvent = {
        expertId: 'expert-123',
        projectId: 'project-123',
        confidence: 0.95,
        latencyMs: 150,
        outcome: 'success',
      };

      const result = TelemetryEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expertId).toBe('expert-123');
      }
    });

    it('[unit] should reject invalid telemetry event', () => {
      const invalidEvent = {
        // Missing required expertId
        projectId: 'project-123',
        confidence: 0.95,
      };

      const result = TelemetryEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('[unit] should validate enhanced telemetry schema', () => {
      const validEnhanced = {
        expertId: 'expert-123',
        agentType: 'reflexion',
        modelName: 'claude-3-opus',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        reasoningSteps: [
          {
            step: 1,
            thought: 'Analyze the problem',
            action: 'search',
          },
        ],
      };

      const result = EnhancedTelemetrySchema.safeParse(validEnhanced);
      expect(result.success).toBe(true);
    });

    it('[unit] should accept basic telemetry without enhanced fields', () => {
      const basicEvent = {
        expertId: 'expert-123',
        confidence: 0.9,
      };

      const enhancedResult = EnhancedTelemetrySchema.safeParse(basicEvent);
      const basicResult = TelemetryEventSchema.safeParse(basicEvent);

      expect(basicResult.success).toBe(true);
      expect(enhancedResult.success).toBe(true); // Enhanced schema extends basic
    });

    it('[unit] should validate API key format', () => {
      expect(isValidApiKeyFormat('sk_live_' + 'a'.repeat(30))).toBe(true);
      expect(isValidApiKeyFormat('sk_live_short')).toBe(false);
      expect(isValidApiKeyFormat('invalid_prefix_' + 'a'.repeat(30))).toBe(false);
      expect(isValidApiKeyFormat('')).toBe(false);
    });
  });

  describe('API Key Management', () => {
    it('[integration] should create API key successfully', async () => {
      const projectId = `test-create-${Date.now()}`;
      const result = await createApiKey({
        projectId,
        projectName: 'Test Project',
        label: 'test-key',
      });

      try {
        expect(result.apiKey).toBeDefined();
        expect(result.apiKey).toMatch(/^sk_live_/);
        expect(result.record.project_id).toBe(projectId);
        expect(result.record.is_active).toBe(true);

        // Should be able to find by API key
        const found = await findProjectByApiKey(result.apiKey);
        expect(found).not.toBeNull();
        expect(found!.projectId).toBe(projectId);
      } finally {
        // Cleanup
        await deleteTestProject(projectId);
      }
    });

    it('[integration] should generate unique API keys', async () => {
      const keys = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const key = generateApiKey();
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }

      expect(keys.size).toBe(10);
    });

    it('[unit] should hash API keys consistently', () => {
      const apiKey = generateApiKey();
      const hash1 = hashApiKey(apiKey);
      const hash2 = hashApiKey(apiKey);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('[unit] should produce different hashes for different keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();

      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });

    it('[integration] should handle duplicate label error', async () => {
      const projectId = `test-dup-${Date.now()}`;
      const label = 'duplicate-test';

      const key1 = await createApiKey({
        projectId,
        projectName: 'Test',
        label,
      });

      try {
        // Try to create with same label
        await expect(
          createApiKey({
            projectId,
            projectName: 'Test',
            label,
          })
        ).rejects.toThrow(/already exists/i);
      } finally {
        await deleteTestProject(projectId);
      }
    });
  });

  describe('Error Handling', () => {
    it('[integration] should return 401 for unauthenticated requests', async () => {
      const request = createMockRequest({
        method: 'POST',
      });

      try {
        await authenticateIrisRequest(request);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toMatch(/authorization.*required/i);
      }
    });

    it('[integration] should provide helpful error messages', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid_format',
        },
      });

      try {
        await authenticateIrisRequest(request);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toMatch(/invalid.*key.*format/i);
        expect(error.details?.hint).toBeDefined();
      }
    });

    it('[unit] should validate required fields in telemetry', () => {
      const missingExpertId = {
        projectId: 'project-123',
        confidence: 0.9,
      };

      const result = TelemetryEventSchema.safeParse(missingExpertId);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = result.error.flatten();
        expect(errors.fieldErrors.expertId).toBeDefined();
      }
    });

    it('[unit] should validate field types in telemetry', () => {
      const wrongTypes = {
        expertId: 'expert-123',
        confidence: 'high', // Should be number
        latencyMs: 'fast', // Should be number
      };

      const result = TelemetryEventSchema.safeParse(wrongTypes);
      expect(result.success).toBe(false);
    });
  });

  describe('Race Conditions', () => {
    it('[integration] should handle concurrent API key creation', async () => {
      const projectId = `test-concurrent-${Date.now()}`;

      // Try to create multiple keys concurrently
      const promises = Array(5)
        .fill(null)
        .map((_, i) =>
          createApiKey({
            projectId,
            projectName: 'Concurrent Test',
            label: `key-${i}`,
          })
        );

      const results = await Promise.all(promises);

      try {
        // All should succeed with unique API keys
        const keys = results.map((r) => r.apiKey);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(5);

        // All should be findable
        for (const result of results) {
          const found = await findProjectByApiKey(result.apiKey);
          expect(found).not.toBeNull();
        }
      } finally {
        await deleteTestProject(projectId);
      }
    });

    it('[integration] should handle concurrent authentication requests', async () => {
      const project = env.projects[0];

      // Clear cache to force database lookups
      clearAuthCache();

      // Make 20 concurrent auth requests
      const promises = Array(20)
        .fill(null)
        .map(() =>
          authenticateIrisRequest(
            createMockRequest({
              headers: {
                Authorization: `Bearer ${project.apiKey}`,
              },
            })
          )
        );

      const results = await Promise.all(promises);

      // All should succeed with same project
      results.forEach((result) => {
        expect(result.projectId).toBe(project.id);
      });

      // Cache should only have one entry
      const cacheStats = require('../lib/auth.js').getAuthCacheStats();
      expect(cacheStats.size).toBe(1);
    });

    it('[integration] should handle concurrent revocations safely', async () => {
      const project = await createTestProject({ name: 'Revoke Race Test' });

      try {
        const keyInfo = await findProjectByApiKey(project.apiKey);
        expect(keyInfo).not.toBeNull();

        // Try to revoke concurrently
        const promises = Array(5)
          .fill(null)
          .map(() => revokeApiKey(keyInfo!.keyId));

        // Should not throw - idempotent operation
        await Promise.all(promises);

        // Key should be revoked
        clearAuthCache();
        const stillValid = await findProjectByApiKey(project.apiKey);
        expect(stillValid).toBeNull();
      } finally {
        await deleteTestProject(project.id);
      }
    });
  });

  describe('Query Performance', () => {
    it('[integration] should validate API key in reasonable time', async () => {
      const project = env.projects[0];

      const start = performance.now();
      await validateApiKey(project.apiKey);
      const duration = performance.now() - start;

      // First request (database query) should be under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('[integration] should benefit from caching on subsequent requests', async () => {
      const project = env.projects[0];

      // First request - uncached
      clearAuthCache();
      const start1 = performance.now();
      await validateApiKey(project.apiKey);
      const duration1 = performance.now() - start1;

      // Second request - cached
      const start2 = performance.now();
      await validateApiKey(project.apiKey);
      const duration2 = performance.now() - start2;

      // Cached should be faster
      expect(duration2).toBeLessThan(duration1);

      console.log(`Auth performance - Uncached: ${duration1.toFixed(2)}ms, Cached: ${duration2.toFixed(2)}ms`);
    });

    it('[integration] should handle batch operations efficiently', async () => {
      const numProjects = 10;
      const projects = await Promise.all(
        Array(numProjects)
          .fill(null)
          .map((_, i) =>
            createTestProject({
              name: `Batch Test ${i}`,
              label: `batch-key-${i}`,
            })
          )
      );

      try {
        const start = performance.now();

        // Validate all API keys
        await Promise.all(projects.map((p) => validateApiKey(p.apiKey)));

        const duration = performance.now() - start;
        const avgLatency = duration / numProjects;

        // Average should be reasonable
        expect(avgLatency).toBeLessThan(50);

        console.log(`Batch validation: ${avgLatency.toFixed(2)}ms per key (${numProjects} keys)`);
      } finally {
        // Cleanup
        await Promise.all(projects.map((p) => deleteTestProject(p.id)));
      }
    });
  });

  describe('Vercel Request/Response Compatibility', () => {
    it('[integration] should work with Vercel Request format', async () => {
      const project = env.projects[0];
      const { authenticateIrisRequestVercel } = require('../lib/auth.js');

      const req = createMockVercelRequest({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${project.apiKey}`,
        },
      });

      const result = await authenticateIrisRequestVercel(req);

      expect(result.projectId).toBe(project.id);
      expect(result.projectName).toBe(project.name);
    });

    it('[integration] should handle Vercel Response format', async () => {
      const project = env.projects[0];
      const { withIrisAuthVercel } = require('../lib/auth.js');

      const req = createMockVercelRequest({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${project.apiKey}`,
        },
        body: {
          expertId: 'test-expert',
        },
      });

      const res = createMockVercelResponse();

      await withIrisAuthVercel(req, res, async (projectInfo, req, res) => {
        return res.status(200).json({
          success: true,
          projectId: projectInfo.projectId,
        });
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.projectId).toBe(project.id);
    });

    it('[integration] should handle errors in Vercel format', async () => {
      const { withIrisAuthVercel } = require('../lib/auth.js');

      const req = createMockVercelRequest({
        method: 'POST',
        // Missing auth header
      });

      const res = createMockVercelResponse();

      await withIrisAuthVercel(req, res, async (project, req, res) => {
        return res.status(200).json({ success: true });
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });
});
