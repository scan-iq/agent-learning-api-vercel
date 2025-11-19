/**
 * API Key Authentication for iris-prime-api
 *
 * Validates API keys against Supabase project_config table
 * Supports Bearer token authentication
 */
import type { AuthContext, ProjectConfig } from './types.js';
/**
 * Extract API key from Authorization header
 * Supports: "Bearer <key>" and "<key>"
 * Works with both Web API Request and Vercel Request objects
 */
export declare function extractApiKey(request: Request | any): string | null;
/**
 * Validate API key against Supabase and return project info
 *
 * @param apiKey - API key from request
 * @returns Project configuration if valid
 * @throws UnauthorizedError if invalid
 */
export declare function validateApiKey(apiKey: string): Promise<ProjectConfig>;
/**
 * Require authentication - extracts and validates API key
 * Returns project ID or throws
 *
 * @param request - HTTP request
 * @returns Project ID
 * @throws UnauthorizedError if authentication fails
 */
export declare function requireAuth(request: Request): Promise<string>;
/**
 * Get full auth context (project config and settings)
 *
 * @param request - HTTP request
 * @returns Auth context with project info
 */
export declare function getAuthContext(request: Request): Promise<AuthContext>;
/**
 * Optional auth - returns project ID if authenticated, null otherwise
 * Does not throw errors
 */
export declare function optionalAuth(request: Request): Promise<string | null>;
/**
 * Clear API key cache
 * Useful for testing or when project configs change
 */
export declare function clearAuthCache(): void;
/**
 * Get cache statistics (for monitoring)
 */
export declare function getAuthCacheStats(): {
    size: number;
    entries: Array<{
        projectId: string;
        expiresAt: string;
    }>;
};
/**
 * Middleware helper for API routes
 * Returns authenticated project ID
 */
export declare function withAuth(request: Request, handler: (projectId: string, request: Request) => Promise<Response>): Promise<Response>;
/**
 * Create a new API key for a project
 * This should be called from admin endpoints only
 */
export declare function createApiKey(projectId: string, projectName: string, settings?: Record<string, any>): Promise<string>;
/**
 * Revoke an API key
 */
export declare function revokeApiKey(apiKey: string): Promise<void>;
/**
 * Rotate API key for a project
 * Returns new API key
 */
export declare function rotateApiKey(projectId: string): Promise<string>;
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
export declare function authenticateIrisRequest(request: Request): Promise<{
    projectId: string;
    projectName: string;
    keyId: string;
}>;
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
export declare function withIrisAuth(request: Request, handler: (project: {
    projectId: string;
    projectName: string;
    keyId: string;
}, request: Request) => Promise<Response>): Promise<Response>;
//# sourceMappingURL=auth.d.ts.map