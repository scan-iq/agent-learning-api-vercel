/**
 * IRIS Code Execution API Endpoint
 *
 * POST /api/iris/execute
 *
 * Executes TypeScript code in E2B sandbox with IRIS MCP server access.
 * Supports both one-off execution and persistent sandbox sessions.
 *
 * Authentication: Requires valid API key in Authorization header
 * Rate Limiting: 100 requests per minute per API key
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIrisAuthVercel } from '../../lib/auth.js';
import { rateLimit } from '../../lib/rate-limit.js';
import { getExecutor } from '../../lib/e2b-executor.js';
import type { CodeExecutionRequest, CodeExecutionResponse } from '../../lib/types.js';

/**
 * Main handler for code execution endpoint
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Only POST requests are supported',
        statusCode: 405,
        timestamp: new Date().toISOString(),
        path: req.url,
      });
    }

    // Apply rate limiting by IP
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
    rateLimit(`ip:${ip}`, 100, 60000);

    // Authenticate and execute with project context
    return withIrisAuthVercel(req, res, async (project, req, res) => {
      // Parse and validate request body
      const body = req.body as CodeExecutionRequest;

      if (!body.code || typeof body.code !== 'string') {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request body must include "code" field with TypeScript code to execute',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.url,
        });
      }

      // Validate code length (max 100KB)
      if (body.code.length > 100 * 1024) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Code size exceeds maximum allowed size of 100KB',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.url,
        });
      }

      // Get executor instance
      const executor = getExecutor();

      // Execute code in sandbox
      const result = await executor.executeCode(body.code, {
        projectId: body.projectId || project.projectId,
        sessionId: body.sessionId,
        context: body.context,
        sandboxId: body.sandboxId,
      });

      // Prepare response
      const response: CodeExecutionResponse = {
        success: result.success,
        result,
        sandboxId: result.metadata.sandboxId,
        timestamp: result.metadata.timestamp,
      };

      // Return results
      return res.status(200).json(response);
    });
  } catch (error) {
    console.error('Code execution error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Configuration for Vercel serverless function
 */
export const config = {
  api: {
    bodyParser: true, // Vercel handles JSON parsing
  },
  maxDuration: 300, // 5 minutes for code execution
};
