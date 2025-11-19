/**
 * IRIS Prime Sandbox Management API Endpoint
 *
 * Manage persistent E2B sandboxes for code execution sessions.
 *
 * GET    /api/iris/sandbox?sandboxId=xxx  - Get sandbox status
 * DELETE /api/iris/sandbox?sandboxId=xxx  - Close sandbox
 * DELETE /api/iris/sandbox?all=true       - Close all sandboxes
 *
 * Authentication: Requires valid API key in Authorization header
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  requireAuth,
  handleApiError,
  rateLimit,
} from '../../lib';
import { getExecutor } from '../../lib/e2b-executor';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // Apply rate limiting
    await rateLimit(req, res, {
      maxRequests: 100,
      windowMs: 60000,
    });

    // Authenticate request
    const auth = await requireAuth(req, res);
    if (!auth) {
      return;
    }

    const executor = getExecutor();

    // Handle GET - Get sandbox status
    if (req.method === 'GET') {
      const { sandboxId } = req.query;

      if (!sandboxId || typeof sandboxId !== 'string') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'sandboxId query parameter is required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const sandbox = await executor.getSandbox(sandboxId);

      res.status(200).json({
        sandboxId,
        active: sandbox !== null,
        totalActive: executor.getActiveSandboxCount(),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Handle DELETE - Close sandbox(es)
    if (req.method === 'DELETE') {
      const { sandboxId, all } = req.query;

      // Close all sandboxes
      if (all === 'true') {
        await executor.closeAll();
        res.status(200).json({
          message: 'All sandboxes closed',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Close specific sandbox
      if (!sandboxId || typeof sandboxId !== 'string') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'sandboxId query parameter is required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await executor.closeSandbox(sandboxId);
      res.status(200).json({
        message: `Sandbox ${sandboxId} closed`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Method not allowed
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET and DELETE requests are supported',
      statusCode: 405,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    handleApiError(error, req, res);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
