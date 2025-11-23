/**
 * Example API endpoint for optimization runs
 *
 * This demonstrates how to integrate the optimization schema
 * with a Vercel serverless API endpoint.
 *
 * Routes:
 * - POST /api/optimization/runs - Create new run
 * - GET /api/optimization/runs - List runs
 * - GET /api/optimization/runs/:id - Get run details
 * - PATCH /api/optimization/runs/:id - Update run
 * - DELETE /api/optimization/runs/:id - Delete run
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createOptimizationRun,
  listOptimizationRuns,
  getOptimizationRun,
  updateOptimizationRun,
  deleteOptimizationRun,
  getOptimizationIterations,
  getTopRunsByScore,
} from '../../../lib/supabase-optimization';
import {
  CreateOptimizationRunSchema,
  UpdateOptimizationRunSchema,
  OptimizationRunFiltersSchema,
} from '../../../lib/schemas';
import { validateApiKey } from '../../../lib/auth';

/**
 * Main handler for optimization runs endpoint
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Authenticate request
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Missing or invalid authorization header',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
    }

    const apiKey = authHeader.substring(7);
    const authContext = await validateApiKey(apiKey);

    if (!authContext) {
      return res.status(401).json({
        error: {
          message: 'Invalid API key',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
    }

    // 2. Route based on HTTP method
    switch (req.method) {
      case 'POST':
        return await handleCreate(req, res, authContext.projectId);

      case 'GET':
        // Check if requesting specific run or list
        const { id, top } = req.query;
        if (id && typeof id === 'string') {
          return await handleGetById(req, res, authContext.projectId, id);
        } else if (top === 'true') {
          return await handleGetTopRuns(req, res, authContext.projectId);
        } else {
          return await handleList(req, res, authContext.projectId);
        }

      case 'PATCH':
        const runId = req.query.id;
        if (!runId || typeof runId !== 'string') {
          return res.status(400).json({
            error: {
              message: 'Run ID is required',
              code: 'INVALID_REQUEST',
              statusCode: 400,
            },
          });
        }
        return await handleUpdate(req, res, authContext.projectId, runId);

      case 'DELETE':
        const deleteId = req.query.id;
        if (!deleteId || typeof deleteId !== 'string') {
          return res.status(400).json({
            error: {
              message: 'Run ID is required',
              code: 'INVALID_REQUEST',
              statusCode: 400,
            },
          });
        }
        return await handleDelete(req, res, authContext.projectId, deleteId);

      default:
        return res.status(405).json({
          error: {
            message: 'Method not allowed',
            code: 'METHOD_NOT_ALLOWED',
            statusCode: 405,
          },
        });
    }
  } catch (error) {
    console.error('Error in optimization runs endpoint:', error);
    return res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
}

/**
 * POST /api/optimization/runs
 * Create a new optimization run
 */
async function handleCreate(
  req: VercelRequest,
  res: VercelResponse,
  projectId: string
) {
  try {
    // Validate request body
    const result = CreateOptimizationRunSchema.safeParse({
      ...req.body,
      projectId, // Override with authenticated project ID
    });

    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: result.error.errors,
        },
      });
    }

    // Create run
    const run = await createOptimizationRun(result.data);

    return res.status(201).json({
      success: true,
      data: run,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/optimization/runs
 * List optimization runs with filters
 */
async function handleList(
  req: VercelRequest,
  res: VercelResponse,
  projectId: string
) {
  try {
    // Parse query parameters
    const filters = {
      projectId,
      status: req.query.status,
      optimizerType: req.query.optimizerType,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      minScore: req.query.minScore ? parseFloat(req.query.minScore as string) : undefined,
      maxScore: req.query.maxScore ? parseFloat(req.query.maxScore as string) : undefined,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      orderBy: req.query.orderBy || 'created_at',
      orderDirection: req.query.orderDirection || 'desc',
    };

    // Validate filters
    const result = OptimizationRunFiltersSchema.safeParse(filters);

    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: result.error.errors,
        },
      });
    }

    // List runs
    const response = await listOptimizationRuns(result.data);

    return res.status(200).json({
      success: true,
      data: response.data,
      pagination: {
        total: response.total,
        limit: response.limit,
        offset: response.offset,
        hasMore: response.hasMore,
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/optimization/runs/:id
 * Get optimization run by ID with iterations
 */
async function handleGetById(
  req: VercelRequest,
  res: VercelResponse,
  projectId: string,
  runId: string
) {
  try {
    // Get run
    const run = await getOptimizationRun(runId);

    if (!run) {
      return res.status(404).json({
        error: {
          message: 'Run not found',
          code: 'NOT_FOUND',
          statusCode: 404,
        },
      });
    }

    // Verify project access
    if (run.projectId !== projectId) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          code: 'FORBIDDEN',
          statusCode: 403,
        },
      });
    }

    // Get iterations if requested
    const includeIterations = req.query.includeIterations === 'true';
    let iterations = undefined;

    if (includeIterations) {
      iterations = await getOptimizationIterations(runId);
    }

    return res.status(200).json({
      success: true,
      data: {
        run,
        iterations,
      },
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/optimization/runs?top=true
 * Get top runs by score
 */
async function handleGetTopRuns(
  req: VercelRequest,
  res: VercelResponse,
  projectId: string
) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const topRuns = await getTopRunsByScore(projectId, limit);

    return res.status(200).json({
      success: true,
      data: topRuns,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * PATCH /api/optimization/runs/:id
 * Update optimization run
 */
async function handleUpdate(
  req: VercelRequest,
  res: VercelResponse,
  projectId: string,
  runId: string
) {
  try {
    // Verify run exists and belongs to project
    const existingRun = await getOptimizationRun(runId);

    if (!existingRun) {
      return res.status(404).json({
        error: {
          message: 'Run not found',
          code: 'NOT_FOUND',
          statusCode: 404,
        },
      });
    }

    if (existingRun.projectId !== projectId) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          code: 'FORBIDDEN',
          statusCode: 403,
        },
      });
    }

    // Validate update data
    const result = UpdateOptimizationRunSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: result.error.errors,
        },
      });
    }

    // Update run
    const updatedRun = await updateOptimizationRun(runId, result.data);

    return res.status(200).json({
      success: true,
      data: updatedRun,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * DELETE /api/optimization/runs/:id
 * Delete optimization run (cascades to iterations and samples)
 */
async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  projectId: string,
  runId: string
) {
  try {
    // Verify run exists and belongs to project
    const existingRun = await getOptimizationRun(runId);

    if (!existingRun) {
      return res.status(404).json({
        error: {
          message: 'Run not found',
          code: 'NOT_FOUND',
          statusCode: 404,
        },
      });
    }

    if (existingRun.projectId !== projectId) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          code: 'FORBIDDEN',
          statusCode: 403,
        },
      });
    }

    // Delete run (cascades to iterations and samples)
    await deleteOptimizationRun(runId);

    return res.status(200).json({
      success: true,
      message: 'Run deleted successfully',
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Usage Examples:
 *
 * # Create run
 * curl -X POST https://your-api.vercel.app/api/optimization/runs \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "runName": "Experiment 1",
 *     "optimizerType": "miprov2",
 *     "config": {
 *       "optimizer": "miprov2",
 *       "metric": "accuracy",
 *       "miprov2": {
 *         "metric": "accuracy",
 *         "num_candidates": 10
 *       }
 *     },
 *     "tags": ["production"]
 *   }'
 *
 * # List runs
 * curl https://your-api.vercel.app/api/optimization/runs?status=completed&limit=10 \
 *   -H "Authorization: Bearer YOUR_API_KEY"
 *
 * # Get specific run
 * curl https://your-api.vercel.app/api/optimization/runs?id=RUN_ID \
 *   -H "Authorization: Bearer YOUR_API_KEY"
 *
 * # Update run
 * curl -X PATCH https://your-api.vercel.app/api/optimization/runs?id=RUN_ID \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "status": "completed",
 *     "finalScore": 0.92
 *   }'
 *
 * # Delete run
 * curl -X DELETE https://your-api.vercel.app/api/optimization/runs?id=RUN_ID \
 *   -H "Authorization: Bearer YOUR_API_KEY"
 *
 * # Get top runs
 * curl https://your-api.vercel.app/api/optimization/runs?top=true&limit=5 \
 *   -H "Authorization: Bearer YOUR_API_KEY"
 */
