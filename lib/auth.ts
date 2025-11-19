/**
 * API Key Authentication for iris-prime-api
 *
 * Validates API keys against Supabase project_config table
 * Supports Bearer token authentication
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UnauthorizedError, logAuthFailure } from './errors.js';
import type { AuthContext, ProjectConfig } from './types.js';

/**
 * Supabase client singleton
 */
let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 */
function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

/**
 * In-memory cache for API key lookups (5 minute TTL)
 * Format: Map<apiKey, { projectConfig, expiresAt }>
 */
const apiKeyCache = new Map<string, { config: ProjectConfig; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extract API key from Authorization header
 * Supports: "Bearer <key>" and "<key>"
 * Works with both Web API Request and Vercel Request objects
 */
export function extractApiKey(request: Request | any): string | null {
  // Handle Web API Request (has headers.get method)
  const authHeader = typeof request.headers?.get === 'function'
    ? request.headers.get('Authorization') || request.headers.get('authorization')
    : request.headers?.['Authorization'] || request.headers?.['authorization'];

  if (!authHeader) {
    return null;
  }

  // Support "Bearer <key>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // Support plain key format
  return authHeader.trim();
}

/**
 * Validate API key against Supabase and return project info
 *
 * @param apiKey - API key from request
 * @returns Project configuration if valid
 * @throws UnauthorizedError if invalid
 */
export async function validateApiKey(apiKey: string): Promise<ProjectConfig> {
  if (!apiKey || apiKey.length === 0) {
    logAuthFailure('Empty API key');
    throw new UnauthorizedError('API key is required');
  }

  // Check cache first
  const cached = apiKeyCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  try {
    const supabase = getSupabaseClient();

    // Query project_config table for matching API key
    const { data, error } = await supabase
      .from('project_config')
      .select('id, name, api_key, settings, created_at, updated_at')
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      logAuthFailure('Invalid API key', { error: error?.message });
      throw new UnauthorizedError('Invalid API key', {
        hint: 'Check that your API key is correct',
      });
    }

    const projectConfig: ProjectConfig = {
      id: data.id,
      name: data.name,
      apiKey: data.api_key,
      apiKeyHash: '', // Not returned from DB for security
      settings: data.settings || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Cache the result
    apiKeyCache.set(apiKey, {
      config: projectConfig,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return projectConfig;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    logAuthFailure('API key validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new UnauthorizedError('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Require authentication - extracts and validates API key
 * Returns project ID or throws
 *
 * @param request - HTTP request
 * @returns Project ID
 * @throws UnauthorizedError if authentication fails
 */
export async function requireAuth(request: Request): Promise<string> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    logAuthFailure('Missing Authorization header');
    throw new UnauthorizedError('Authorization header is required', {
      hint: 'Include "Authorization: Bearer <your-api-key>" header',
    });
  }

  const projectConfig = await validateApiKey(apiKey);
  return projectConfig.id;
}

/**
 * Get full auth context (project config and settings)
 *
 * @param request - HTTP request
 * @returns Auth context with project info
 */
export async function getAuthContext(request: Request): Promise<AuthContext> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    throw new UnauthorizedError('Authorization header is required');
  }

  const projectConfig = await validateApiKey(apiKey);

  return {
    projectId: projectConfig.id,
    projectName: projectConfig.name,
    rateLimit: projectConfig.settings?.rateLimit || {
      maxRequests: 1000,
      windowMs: 60_000,
    },
  };
}

/**
 * Optional auth - returns project ID if authenticated, null otherwise
 * Does not throw errors
 */
export async function optionalAuth(request: Request): Promise<string | null> {
  try {
    return await requireAuth(request);
  } catch (error) {
    return null;
  }
}

/**
 * Clear API key cache
 * Useful for testing or when project configs change
 */
export function clearAuthCache(): void {
  apiKeyCache.clear();
}

/**
 * Get cache statistics (for monitoring)
 */
export function getAuthCacheStats(): {
  size: number;
  entries: Array<{ projectId: string; expiresAt: string }>;
} {
  const entries: Array<{ projectId: string; expiresAt: string }> = [];

  for (const [_, value] of apiKeyCache.entries()) {
    entries.push({
      projectId: value.config.id,
      expiresAt: new Date(value.expiresAt).toISOString(),
    });
  }

  return {
    size: apiKeyCache.size,
    entries,
  };
}

/**
 * Middleware helper for API routes
 * Returns authenticated project ID
 */
export async function withAuth(
  request: Request,
  handler: (projectId: string, request: Request) => Promise<Response>
): Promise<Response> {
  try {
    const projectId = await requireAuth(request);
    return await handler(projectId, request);
  } catch (error) {
    const { errorToResponse } = await import('./errors.js');
    return errorToResponse(error, new URL(request.url).pathname);
  }
}

/**
 * Create a new API key for a project
 * This should be called from admin endpoints only
 */
export async function createApiKey(
  projectId: string,
  projectName: string,
  settings?: Record<string, any>
): Promise<string> {
  const supabase = getSupabaseClient();

  // Generate a secure random API key
  const apiKey = generateSecureApiKey();

  const { error } = await supabase.from('project_config').insert({
    id: projectId,
    name: projectName,
    api_key: apiKey,
    settings: settings || {},
  });

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return apiKey;
}

/**
 * Generate a cryptographically secure API key
 */
function generateSecureApiKey(): string {
  // Generate 32 random bytes and encode as base64url
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  return Buffer.from(array)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(apiKey: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('project_config')
    .delete()
    .eq('api_key', apiKey);

  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }

  // Remove from cache
  apiKeyCache.delete(apiKey);
}

/**
 * Rotate API key for a project
 * Returns new API key
 */
export async function rotateApiKey(projectId: string): Promise<string> {
  const supabase = getSupabaseClient();

  // Get current project config
  const { data: project, error: fetchError } = await supabase
    .from('project_config')
    .select('*')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    throw new Error('Project not found');
  }

  // Generate new API key
  const newApiKey = generateSecureApiKey();

  // Update project
  const { error: updateError } = await supabase
    .from('project_config')
    .update({ api_key: newApiKey })
    .eq('id', projectId);

  if (updateError) {
    throw new Error(`Failed to rotate API key: ${updateError.message}`);
  }

  // Clear old key from cache
  apiKeyCache.delete(project.api_key);

  return newApiKey;
}

/**
 * NEW API KEY SYSTEM - Using iris_api_keys table
 * ================================================
 */

/**
 * Authenticate IRIS API request using the new iris_api_keys table
 *
 * This is the main authentication function for IRIS API routes.
 * It validates the API key, tracks usage, and returns project info.
 *
 * @param request - HTTP request with Authorization header
 * @returns Project info { projectId, projectName, keyId }
 * @throws UnauthorizedError if authentication fails
 */
export async function authenticateIrisRequest(request: Request): Promise<{
  projectId: string;
  projectName: string;
  keyId: string;
}> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    logAuthFailure('Missing Authorization header in IRIS request');
    throw new UnauthorizedError('Authorization header is required', {
      hint: 'Include "Authorization: Bearer <your-api-key>" header',
    });
  }

  // Import the new API key functions
  const { findProjectByApiKey, touchApiKeyUsage, isValidApiKeyFormat } = await import('./apiKeys.js');

  // Validate format first
  if (!isValidApiKeyFormat(apiKey)) {
    logAuthFailure('Invalid API key format');
    throw new UnauthorizedError('Invalid API key format', {
      hint: 'API keys should start with "sk_live_"',
    });
  }

  // Find project by API key
  const project = await findProjectByApiKey(apiKey);

  if (!project) {
    logAuthFailure('Invalid or inactive API key');
    throw new UnauthorizedError('Invalid or inactive API key', {
      hint: 'Check that your API key is correct and has not been revoked',
    });
  }

  // Track usage asynchronously (don't block the request)
  touchApiKeyUsage(project.keyId).catch((err) => {
    console.warn('Failed to track API key usage:', err);
  });

  return project;
}

/**
 * Middleware wrapper for IRIS API routes
 * Use this in your API handlers for automatic authentication
 *
 * @example
 * export default async function handler(req: Request) {
 *   return withIrisAuth(req, async (project, req) => {
 *     // Your authenticated handler logic here
 *     return new Response(JSON.stringify({ projectId: project.projectId }));
 *   });
 * }
 */
export async function withIrisAuth(
  request: Request,
  handler: (
    project: { projectId: string; projectName: string; keyId: string },
    request: Request
  ) => Promise<Response>
): Promise<Response> {
  try {
    const project = await authenticateIrisRequest(request);
    return await handler(project, request);
  } catch (error) {
    const { errorToResponse } = await import('./errors.js');
    return errorToResponse(error, new URL(request.url).pathname);
  }
}

/**
 * NEW VERCEL-COMPATIBLE WRAPPER
 * ================================
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Authenticate IRIS API request using Vercel Request/Response
 *
 * This version works with VercelRequest instead of Web API Request
 *
 * @param req - Vercel request with headers property
 * @returns Project info { projectId, projectName, keyId }
 * @throws UnauthorizedError if authentication fails
 */
export async function authenticateIrisRequestVercel(req: VercelRequest): Promise<{
  projectId: string;
  projectName: string;
  keyId: string;
}> {
  // Extract API key from Vercel request headers
  const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;

  if (!authHeader) {
    logAuthFailure('Missing Authorization header in IRIS request');
    throw new UnauthorizedError('Authorization header is required', {
      hint: 'Include "Authorization: Bearer <your-api-key>" header',
    });
  }

  // Support "Bearer <key>" format
  let apiKey: string;
  if (authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7).trim();
  } else {
    apiKey = authHeader.trim();
  }

  if (!apiKey) {
    logAuthFailure('Empty API key in Authorization header');
    throw new UnauthorizedError('API key is required', {
      hint: 'Include "Authorization: Bearer <your-api-key>" header',
    });
  }

  // Import the new API key functions
  const { findProjectByApiKey, touchApiKeyUsage, isValidApiKeyFormat } = await import('./apiKeys.js');

  // Validate format first
  if (!isValidApiKeyFormat(apiKey)) {
    logAuthFailure('Invalid API key format');
    throw new UnauthorizedError('Invalid API key format', {
      hint: 'API keys should start with "sk_live_"',
    });
  }

  // Find project by API key
  const project = await findProjectByApiKey(apiKey);

  if (!project) {
    logAuthFailure('Invalid or inactive API key');
    throw new UnauthorizedError('Invalid or inactive API key', {
      hint: 'Check that your API key is correct and has not been revoked',
    });
  }

  // Track usage asynchronously (don't block the request)
  touchApiKeyUsage(project.keyId).catch((err) => {
    console.warn('Failed to track API key usage:', err);
  });

  return project;
}

/**
 * Middleware wrapper for IRIS API routes (Vercel version)
 * Use this in your Vercel API handlers for automatic authentication
 *
 * @example
 * import type { VercelRequest, VercelResponse } from '@vercel/node';
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   return withIrisAuthVercel(req, res, async (project, req, res) => {
 *     return res.status(200).json({ projectId: project.projectId });
 *   });
 * }
 */
export async function withIrisAuthVercel(
  req: VercelRequest,
  res: VercelResponse,
  handler: (
    project: { projectId: string; projectName: string; keyId: string },
    req: VercelRequest,
    res: VercelResponse
  ) => Promise<void | VercelResponse>
): Promise<void | VercelResponse> {
  try {
    const project = await authenticateIrisRequestVercel(req);
    return await handler(project, req, res);
  } catch (error) {
    // Handle errors by sending JSON response
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: error.message,
        statusCode: 401,
        hint: error.details?.hint || 'Check your API key',
        timestamp: new Date().toISOString(),
      });
    }

    // Generic error handling
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return res.status(500).json({
      error: message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
}
