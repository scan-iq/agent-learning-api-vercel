/**
 * Example: Admin API routes for managing projects and API keys
 * 
 * These endpoints should be protected by additional admin authentication
 */

import {
  createApiKey,
  rotateApiKey,
  revokeApiKey,
  errorToResponse,
  ValidationError,
} from '@iris-prime/api';

/**
 * POST /api/admin/projects
 * 
 * Create a new project with API key
 * 
 * Body: {
 *   projectId: string,
 *   projectName: string,
 *   settings?: { rateLimit?: { maxRequests, windowMs } }
 * }
 */
export async function createProject(request: Request): Promise<Response> {
  try {
    // TODO: Add admin authentication here
    // const adminUser = await requireAdminAuth(request);

    const body = await request.json();
    
    if (!body.projectId || !body.projectName) {
      throw new ValidationError('projectId and projectName are required');
    }

    // Create API key
    const apiKey = await createApiKey(
      body.projectId,
      body.projectName,
      body.settings
    );

    return new Response(JSON.stringify({
      success: true,
      projectId: body.projectId,
      apiKey,
      message: 'Project created successfully. Save this API key - it will not be shown again.',
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return errorToResponse(error, '/api/admin/projects');
  }
}

/**
 * POST /api/admin/projects/:projectId/rotate-key
 * 
 * Rotate API key for a project
 */
export async function rotateProjectKey(
  request: Request,
  projectId: string
): Promise<Response> {
  try {
    // TODO: Add admin authentication
    // TODO: Verify admin has access to this project

    const newApiKey = await rotateApiKey(projectId);

    return new Response(JSON.stringify({
      success: true,
      projectId,
      apiKey: newApiKey,
      message: 'API key rotated successfully. Update your applications with the new key.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return errorToResponse(error, `/api/admin/projects/${projectId}/rotate-key`);
  }
}

/**
 * DELETE /api/admin/api-keys/:apiKey
 * 
 * Revoke an API key
 */
export async function revokeKey(
  request: Request,
  apiKey: string
): Promise<Response> {
  try {
    // TODO: Add admin authentication
    
    await revokeApiKey(apiKey);

    return new Response(JSON.stringify({
      success: true,
      message: 'API key revoked successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return errorToResponse(error, `/api/admin/api-keys/${apiKey}`);
  }
}
