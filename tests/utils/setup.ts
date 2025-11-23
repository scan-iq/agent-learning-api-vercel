/**
 * Test Setup Utilities
 *
 * Provides helper functions for setting up test environments,
 * creating test data, and managing test lifecycle.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateApiKey, hashApiKey, getApiKeyPrefix } from '../../lib/apiKeys.js';
import { clearAuthCache } from '../../lib/auth.js';
import { clearAllRateLimits, stopCleanupTimer } from '../../lib/rate-limit.js';

export interface TestProject {
  id: string;
  name: string;
  apiKey: string;
  apiKeyHash: string;
}

export interface TestEnvironment {
  supabase: SupabaseClient;
  projects: TestProject[];
  cleanup: () => Promise<void>;
}

let testSupabaseClient: SupabaseClient | null = null;

/**
 * Get or create test Supabase client
 */
export function getTestSupabaseClient(): SupabaseClient {
  if (testSupabaseClient) {
    return testSupabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.TEST_SUPABASE_KEY || 'test-key';

  testSupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return testSupabaseClient;
}

/**
 * Setup test database
 * Creates necessary tables and indexes for testing
 */
export async function setupTestDatabase(): Promise<void> {
  const supabase = getTestSupabaseClient();

  // Create iris_api_keys table if it doesn't exist
  // Note: In real tests, this should be done via migrations
  // This is a simplified version for testing
  try {
    await supabase.from('iris_api_keys').select('id').limit(1);
  } catch (error) {
    console.warn('Test database may need setup. Ensure migrations are run.');
  }
}

/**
 * Clear all caches and rate limits
 * Useful for resetting state between tests
 */
export function clearAllCaches(): void {
  clearAuthCache();
  clearAllRateLimits();
}

/**
 * Create a test project with API key
 */
export async function createTestProject(options?: {
  name?: string;
  label?: string;
  isActive?: boolean;
}): Promise<TestProject> {
  const supabase = getTestSupabaseClient();
  const apiKey = generateApiKey();
  const apiKeyHash = hashApiKey(apiKey);
  const apiKeyPrefix = getApiKeyPrefix(apiKey);

  const projectId = `test-project-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const projectName = options?.name || `Test Project ${Date.now()}`;

  const { data, error } = await supabase
    .from('iris_api_keys')
    .insert({
      project_id: projectId,
      project_name: projectName,
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      label: options?.label || 'test-key',
      is_active: options?.isActive !== false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test project: ${error.message}`);
  }

  return {
    id: projectId,
    name: projectName,
    apiKey,
    apiKeyHash,
  };
}

/**
 * Generate a test API key without database insertion
 */
export function generateTestApiKey(): { apiKey: string; hash: string; prefix: string } {
  const apiKey = generateApiKey();
  return {
    apiKey,
    hash: hashApiKey(apiKey),
    prefix: getApiKeyPrefix(apiKey),
  };
}

/**
 * Delete test project
 */
export async function deleteTestProject(projectId: string): Promise<void> {
  const supabase = getTestSupabaseClient();
  await supabase.from('iris_api_keys').delete().eq('project_id', projectId);
}

/**
 * Setup complete test environment
 * Returns cleanup function to tear down environment
 */
export async function setupTestEnvironment(numProjects: number = 1): Promise<TestEnvironment> {
  await setupTestDatabase();
  clearAllCaches();

  const projects: TestProject[] = [];
  for (let i = 0; i < numProjects; i++) {
    const project = await createTestProject({
      name: `Test Project ${i + 1}`,
      label: `test-key-${i + 1}`,
    });
    projects.push(project);
  }

  const cleanup = async () => {
    // Delete all test projects
    for (const project of projects) {
      await deleteTestProject(project.id);
    }

    // Clear all caches and rate limits
    clearAllCaches();
    stopCleanupTimer();
  };

  return {
    supabase: getTestSupabaseClient(),
    projects,
    cleanup,
  };
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock Request object for testing
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
}): Request {
  const headers = new Headers(options.headers || {});
  const url = options.url || 'http://localhost:3000/api/test';
  const method = options.method || 'GET';

  let bodyInit: BodyInit | null = null;
  if (options.body) {
    bodyInit = JSON.stringify(options.body);
    headers.set('Content-Type', 'application/json');
  }

  return new Request(url, {
    method,
    headers,
    body: bodyInit,
  });
}

/**
 * Create a mock Vercel Request object for testing
 */
export function createMockVercelRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
}): any {
  return {
    method: options.method || 'GET',
    url: options.url || 'http://localhost:3000/api/test',
    headers: options.headers || {},
    body: options.body || {},
    query: {},
  };
}

/**
 * Create a mock Vercel Response object for testing
 */
export function createMockVercelResponse(): any {
  const response: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    status: function (code: number) {
      this.statusCode = code;
      return this;
    },
    json: function (data: any) {
      this.body = data;
      return this;
    },
    send: function (data: any) {
      this.body = data;
      return this;
    },
    setHeader: function (name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };
  return response;
}

/**
 * Mock Vercel KV for testing
 * Provides in-memory KV store with TTL support
 */
export class MockVercelKV {
  private store = new Map<string, { value: any; expiresAt: number | null }>();

  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: any, options?: { ex?: number; px?: number }): Promise<void> {
    let expiresAt: number | null = null;

    if (options?.ex) {
      expiresAt = Date.now() + options.ex * 1000;
    } else if (options?.px) {
      expiresAt = Date.now() + options.px;
    }

    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;

    const ttl = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get<number>(key);
    const newValue = (current || 0) + 1;
    await this.set(key, newValue);
    return newValue;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
