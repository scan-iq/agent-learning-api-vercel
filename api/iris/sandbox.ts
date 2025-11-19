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
import { withIrisAuthVercel } from '../../lib/auth.js';
import { rateLimit } from '../../lib/rate-limit.js';
import { getExecutor } from '../../lib/e2b-executor.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Apply rate limiting by IP
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
    rateLimit(`ip:${ip}`, 100, 60000);

    // Authenticate and execute with project context
    return withIrisAuthVercel(req, res, async (_project, req, res) => {
      const executor = getExecutor();

      // Handle GET - Get sandbox status
      if (req.method === 'GET') {
        const { sandboxId } = req.query;

        if (!sandboxId || typeof sandboxId !== 'string') {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'sandboxId query parameter is required',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
        }

        const sandbox = await executor.getSandbox(sandboxId);

        return res.status(200).json({
          sandboxId,
          active: sandbox !== null,
          totalActive: executor.getActiveSandboxCount(),
          timestamp: new Date().toISOString(),
        });
      }

      // Handle DELETE - Close sandbox(es)
      if (req.method === 'DELETE') {
        const { sandboxId, all } = req.query;

        // Close all sandboxes
        if (all === 'true') {
          await executor.closeAll();
          return res.status(200).json({
            message: 'All sandboxes closed',
            timestamp: new Date().toISOString(),
          });
        }

        // Close specific sandbox
        if (!sandboxId || typeof sandboxId !== 'string') {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'sandboxId query parameter is required',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
        }

        await executor.closeSandbox(sandboxId);
        return res.status(200).json({
          message: `Sandbox ${sandboxId} closed`,
          timestamp: new Date().toISOString(),
        });
      }

      // Method not allowed
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Only GET and DELETE requests are supported',
        statusCode: 405,
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error('Sandbox management error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
