/**
 * Admin API for managing IRIS API keys
 *
 * Routes:
 * - GET    /api/admin/api-keys?projectId=xxx - List all keys for a project
 * - POST   /api/admin/api-keys - Create a new API key
 * - DELETE /api/admin/api-keys/:keyId - Revoke an API key
 * - POST   /api/admin/api-keys/:keyId/rotate - Rotate an API key
 */

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
} from "../../lib/apiKeys.js";

/**
 * Admin authentication (simple for now - can be enhanced with proper admin auth)
 * TODO: Replace with proper admin authentication
 */
function isAdminRequest(req: Request): boolean {
  const adminKey = req.headers.get("X-Admin-Key");
  const expectedAdminKey = process.env.ADMIN_API_KEY;

  if (!expectedAdminKey) {
    console.warn("ADMIN_API_KEY not set - admin endpoints are disabled");
    return false;
  }

  return adminKey === expectedAdminKey;
}

/**
 * CORS headers for cross-origin requests
 */
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Main handler - routes requests based on method and path
 */
export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(),
    });
  }

  // Check admin authentication
  if (!isAdminRequest(req)) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        hint: "Include X-Admin-Key header with valid admin key",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(),
        },
      }
    );
  }

  const url = new URL(req.url);
  const method = req.method;

  try {
    // GET /api/admin/api-keys?projectId=xxx - List keys for a project
    if (method === "GET") {
      const projectId = url.searchParams.get("projectId");

      if (!projectId) {
        return new Response(
          JSON.stringify({
            error: "projectId query parameter is required",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(),
            },
          }
        );
      }

      const keys = await listApiKeys(projectId);

      return new Response(
        JSON.stringify({
          projectId,
          keys: keys.map((key) => ({
            id: key.id,
            projectId: key.project_id,
            projectName: key.project_name,
            prefix: key.api_key_prefix,
            label: key.label,
            lastUsedAt: key.last_used_at,
            usageCount: key.usage_count,
            isActive: key.is_active,
            createdAt: key.created_at,
            revokedAt: key.revoked_at,
          })),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(),
          },
        }
      );
    }

    // POST /api/admin/api-keys - Create a new API key
    if (method === "POST") {
      const body = (await req.json()) as {
        projectId?: string;
        projectName?: string;
        label?: string;
      };
      const { projectId, projectName, label } = body;

      if (!projectId || !projectName || !label) {
        return new Response(
          JSON.stringify({
            error: "projectId, projectName, and label are required",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(),
            },
          }
        );
      }

      const result = await createApiKey({ projectId, projectName, label });

      return new Response(
        JSON.stringify({
          success: true,
          apiKey: result.apiKey, // IMPORTANT: Only shown once!
          key: {
            id: result.record.id,
            projectId: result.record.project_id,
            projectName: result.record.project_name,
            prefix: result.record.api_key_prefix,
            label: result.record.label,
            createdAt: result.record.created_at,
          },
          warning: "Save this API key now - it will not be shown again!",
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(),
          },
        }
      );
    }

    // DELETE /api/admin/api-keys/:keyId - Revoke an API key
    if (method === "DELETE") {
      const body = (await req.json()) as { keyId?: string };
      const { keyId } = body;

      if (!keyId) {
        return new Response(
          JSON.stringify({
            error: "keyId is required in request body",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(),
            },
          }
        );
      }

      await revokeApiKey(keyId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "API key revoked successfully",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(),
          },
        }
      );
    }

    // PUT /api/admin/api-keys/:keyId/rotate - Rotate an API key
    if (method === "PUT") {
      const body = (await req.json()) as { keyId?: string };
      const { keyId } = body;

      if (!keyId) {
        return new Response(
          JSON.stringify({
            error: "keyId is required in request body",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(),
            },
          }
        );
      }

      const result = await rotateApiKey(keyId);

      return new Response(
        JSON.stringify({
          success: true,
          apiKey: result.apiKey, // IMPORTANT: Only shown once!
          key: {
            id: result.record.id,
            projectId: result.record.project_id,
            projectName: result.record.project_name,
            prefix: result.record.api_key_prefix,
            label: result.record.label,
            createdAt: result.record.created_at,
          },
          warning: "Save this new API key now - it will not be shown again!",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(),
          },
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
        allowedMethods: ["GET", "POST", "DELETE", "PUT"],
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(),
        },
      }
    );
  } catch (error) {
    console.error("Admin API keys error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(),
        },
      }
    );
  }
}
