/**
 * Admin API for managing IRIS API keys
 *
 * Routes:
 * - GET    /api/admin/api-keys?projectId=xxx - List all keys for a project
 * - POST   /api/admin/api-keys - Create a new API key
 * - DELETE /api/admin/api-keys/:keyId - Revoke an API key
 * - POST   /api/admin/api-keys/:keyId/rotate - Rotate an API key
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
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
function isAdminRequest(req: VercelRequest): boolean {
  // Headers are case-insensitive, but Express/Vercel normalizes them to lowercase
  const adminKey = (req.headers["x-admin-key"] || req.headers["X-Admin-Key"]) as string;
  const expectedAdminKey = process.env.ADMIN_API_KEY;

  // Debug logging
  console.log("Auth check:", {
    hasAdminKey: !!adminKey,
    adminKeyPrefix: adminKey?.substring(0, 10),
    hasExpected: !!expectedAdminKey,
    expectedPrefix: expectedAdminKey?.substring(0, 10),
    headersKeys: Object.keys(req.headers),
  });

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
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  const corsHeaders = getCorsHeaders();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Check admin authentication
  if (!isAdminRequest(req)) {
    return res.status(401).json({
      error: "Unauthorized",
      hint: "Include X-Admin-Key header with valid admin key",
    });
  }

  const method = req.method;

  try {
    // GET /api/admin/api-keys?projectId=xxx - List keys for a project
    if (method === "GET") {
      const projectId = req.query.projectId as string;

      if (!projectId) {
        return res.status(400).json({
          error: "projectId query parameter is required",
        });
      }

      const keys = await listApiKeys(projectId);

      return res.status(200).json({
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
      });
    }

    // POST /api/admin/api-keys - Create a new API key
    if (method === "POST") {
      const { projectId, projectName, label } = req.body as {
        projectId?: string;
        projectName?: string;
        label?: string;
      };

      if (!projectId || !projectName || !label) {
        return res.status(400).json({
          error: "projectId, projectName, and label are required",
        });
      }

      const result = await createApiKey({ projectId, projectName, label });

      return res.status(201).json({
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
      });
    }

    // DELETE /api/admin/api-keys/:keyId - Revoke an API key
    if (method === "DELETE") {
      const { keyId } = req.body as { keyId?: string };

      if (!keyId) {
        return res.status(400).json({
          error: "keyId is required in request body",
        });
      }

      await revokeApiKey(keyId);

      return res.status(200).json({
        success: true,
        message: "API key revoked successfully",
      });
    }

    // PUT /api/admin/api-keys/:keyId/rotate - Rotate an API key
    if (method === "PUT") {
      const { keyId } = req.body as { keyId?: string };

      if (!keyId) {
        return res.status(400).json({
          error: "keyId is required in request body",
        });
      }

      const result = await rotateApiKey(keyId);

      return res.status(200).json({
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
      });
    }

    // Method not allowed
    return res.status(405).json({
      error: "Method not allowed",
      allowedMethods: ["GET", "POST", "DELETE", "PUT"],
    });
  } catch (error) {
    console.error("Admin API keys error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
