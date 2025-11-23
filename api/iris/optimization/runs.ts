import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../../lib/auth.js";
import { getSupabaseClient } from "../../../lib/supabase.js";
import { rateLimitByApiKey, getRateLimitStatus } from "../../../lib/rate-limit.js";
import { RateLimitError, ValidationError, InternalServerError } from "../../../lib/errors.js";
import {
  CreateOptimizationRunSchema,
  ListOptimizationRunsSchema,
} from "../../../lib/schemas.js";
import type { OptimizationRunRow } from "../../../lib/types.supabase.js";

/**
 * GET /api/iris/optimization/runs
 * List optimization runs with filtering and pagination
 *
 * Query Parameters:
 * - project_id: Filter by project (optional, defaults to authenticated project)
 * - status: Filter by status (pending|running|completed|failed|cancelled)
 * - optimizer_type: Filter by optimizer type
 * - limit: Max results to return (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * - order_by: Sort field (created_at|final_score|duration_ms)
 * - order: Sort direction (asc|desc)
 *
 * POST /api/iris/optimization/runs
 * Create a new optimization run
 *
 * Request Body:
 * - run_name: Optional name for the run
 * - optimizer_type: Type of optimizer (required)
 * - config: Configuration object (required)
 * - search_space: Search space definition (optional)
 * - metadata: Additional metadata (optional)
 *
 * Response Headers:
 * - X-RateLimit-Limit: Rate limit maximum
 * - X-RateLimit-Remaining: Remaining requests
 * - X-RateLimit-Reset: Reset time (ISO 8601)
 * - Cache-Control: Caching policy (GET only)
 * - ETag: Resource version (GET only)
 *
 * Performance Target: p99 < 200ms
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseClient();

  // GET: List runs with filtering and pagination
  if (req.method === "GET") {
    return withIrisAuthVercel(req, res, async (project, _req, res) => {
      const startTime = Date.now();

      try {
        // Apply rate limiting
        rateLimitByApiKey(project.projectId, 1000, 60_000);

        // Add rate limit headers
        const rateLimitStatus = getRateLimitStatus(`apikey:${project.projectId}`, 1000);
        res.setHeader("X-RateLimit-Limit", rateLimitStatus.limit);
        res.setHeader("X-RateLimit-Remaining", rateLimitStatus.remaining);
        if (rateLimitStatus.reset) {
          res.setHeader("X-RateLimit-Reset", rateLimitStatus.reset);
        }

        // Parse and validate query parameters
        const parsed = ListOptimizationRunsSchema.safeParse({
          project_id: req.query.project_id,
          status: req.query.status,
          optimizer_type: req.query.optimizer_type,
          limit: req.query.limit,
          offset: req.query.offset,
          order_by: req.query.order_by,
          order: req.query.order,
        });

        if (!parsed.success) {
          return res.status(400).json({
            error: "Invalid query parameters",
            issues: parsed.error.flatten(),
            timestamp: new Date().toISOString(),
          });
        }

        const params = parsed.data;

        // Use project_id from filter or default to authenticated project
        const projectId = params.project_id || project.projectId;

        // Build query with proper column selection (avoid SELECT *)
        let query = supabase
          .from<OptimizationRunRow>("optimization_runs")
          .select(
            "id, project_id, run_name, optimizer_type, status, config, search_space, " +
            "final_score, best_params, metadata, iterations_count, duration_ms, " +
            "error_message, created_at, updated_at, started_at, completed_at",
            { count: "exact" }
          )
          .eq("project_id", projectId);

        // Apply filters
        if (params.status) {
          query = query.eq("status", params.status);
        }

        if (params.optimizer_type) {
          query = query.eq("optimizer_type", params.optimizer_type);
        }

        // Apply ordering
        const orderColumn = params.order_by;
        const ascending = params.order === "asc";
        query = query.order(orderColumn, { ascending, nullsFirst: false });

        // Apply pagination
        query = query.range(params.offset, params.offset + params.limit - 1);

        // Execute query
        const { data, error, count } = await query;

        if (error) {
          console.error("Database error:", error);
          return res.status(500).json({
            error: "Failed to fetch optimization runs",
            details: error.message,
            timestamp: new Date().toISOString(),
          });
        }

        // Calculate ETag for caching
        const etag = `"${Buffer.from(JSON.stringify(data)).toString("base64").substring(0, 32)}"`;

        // Check If-None-Match header
        const ifNoneMatch = req.headers["if-none-match"];
        if (ifNoneMatch === etag) {
          return res.status(304).end();
        }

        // Set cache headers (cache for 30 seconds)
        res.setHeader("Cache-Control", "private, max-age=30, must-revalidate");
        res.setHeader("ETag", etag);

        // Add performance metrics
        const latencyMs = Date.now() - startTime;
        res.setHeader("X-Response-Time", `${latencyMs}ms`);

        return res.status(200).json({
          runs: data || [],
          pagination: {
            limit: params.limit,
            offset: params.offset,
            total: count || 0,
            hasMore: (params.offset + params.limit) < (count || 0),
          },
          metadata: {
            latencyMs,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof RateLimitError) {
          return res.status(429).json({
            error: error.message,
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: error.details?.retryAfter,
            timestamp: new Date().toISOString(),
          });
        }

        console.error("Unexpected error:", error);
        return res.status(500).json({
          error: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // POST: Create new optimization run
  if (req.method === "POST") {
    return withIrisAuthVercel(req, res, async (project, _req, res) => {
      const startTime = Date.now();

      try {
        // Apply rate limiting (stricter for writes)
        rateLimitByApiKey(project.projectId, 500, 60_000);

        // Add rate limit headers
        const rateLimitStatus = getRateLimitStatus(`apikey:${project.projectId}`, 500);
        res.setHeader("X-RateLimit-Limit", rateLimitStatus.limit);
        res.setHeader("X-RateLimit-Remaining", rateLimitStatus.remaining);
        if (rateLimitStatus.reset) {
          res.setHeader("X-RateLimit-Reset", rateLimitStatus.reset);
        }

        // Validate request body
        const parsed = CreateOptimizationRunSchema.safeParse(req.body);

        if (!parsed.success) {
          return res.status(400).json({
            error: "Invalid request body",
            issues: parsed.error.flatten(),
            timestamp: new Date().toISOString(),
          });
        }

        const runData = parsed.data;

        // Create optimization run
        const { data, error } = await supabase
          .from<OptimizationRunRow>("optimization_runs")
          .insert({
            project_id: project.projectId,
            run_name: runData.run_name,
            optimizer_type: runData.optimizer_type,
            config: runData.config,
            search_space: runData.search_space,
            metadata: runData.metadata,
            status: "pending",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error("Database error:", error);
          return res.status(500).json({
            error: "Failed to create optimization run",
            details: error.message,
            timestamp: new Date().toISOString(),
          });
        }

        // Add performance metrics
        const latencyMs = Date.now() - startTime;
        res.setHeader("X-Response-Time", `${latencyMs}ms`);

        return res.status(201).json({
          run: data,
          metadata: {
            latencyMs,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof RateLimitError) {
          return res.status(429).json({
            error: error.message,
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: error.details?.retryAfter,
            timestamp: new Date().toISOString(),
          });
        }

        console.error("Unexpected error:", error);
        return res.status(500).json({
          error: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  return res.status(405).json({
    error: "Method not allowed",
    allowedMethods: ["GET", "POST"],
    timestamp: new Date().toISOString(),
  });
}
