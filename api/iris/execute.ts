/**
 * IRIS Prime Code Execution API Endpoint
 *
 * POST /api/iris/execute
 *
 * Executes TypeScript code in E2B sandbox with IRIS Prime MCP server access.
 * Supports both one-off execution and persistent sandbox sessions.
 *
 * Authentication: Requires valid API key in Authorization header
 * Rate Limiting: 100 requests per minute per API key
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  requireAuth,
  parseJsonBody,
  handleApiError,
  rateLimit,
} from '../../lib';
import { getExecutor } from '../../lib/e2b-executor';
import type { CodeExecutionRequest, CodeExecutionResponse } from '../../lib/types';

/**
 * Main handler for code execution endpoint
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Only POST requests are supported',
        statusCode: 405,
        timestamp: new Date().toISOString(),
        path: req.url,
      });
      return;
    }

    // Apply rate limiting
    await rateLimit(req, res, {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    });

    // Authenticate request
    const auth = await requireAuth(req, res);
    if (!auth) {
      // requireAuth already sent error response
      return;
    }

    // Parse and validate request body
    const body = await parseJsonBody<CodeExecutionRequest>(req);

    if (!body.code || typeof body.code !== 'string') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Request body must include "code" field with TypeScript code to execute',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: req.url,
      });
      return;
    }

    // Validate code length (max 100KB)
    if (body.code.length > 100 * 1024) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Code size exceeds maximum allowed size of 100KB',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: req.url,
      });
      return;
    }

    // Get executor instance
    const executor = getExecutor();

    // Execute code in sandbox
    const result = await executor.executeCode(body.code, {
      projectId: body.projectId || auth.projectId,
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
    res.status(200).json(response);

  } catch (error) {
    handleApiError(error, req, res);
  }
}

/**
 * Configuration for Vercel serverless function
 */
export const config = {
  api: {
    bodyParser: false, // We use custom JSON parsing
  },
  maxDuration: 300, // 5 minutes for code execution
};
