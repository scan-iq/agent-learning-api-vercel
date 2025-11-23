import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../../../lib/auth.js";
import { getSupabaseClient } from "../../../../lib/supabase.js";
import { rateLimitByApiKey, getRateLimitStatus } from "../../../../lib/rate-limit.js";
import { RateLimitError, NotFoundError } from "../../../../lib/errors.js";
import { UpdateOptimizationRunSchema } from "../../../../lib/schemas.js";
import type { OptimizationRunRow, OptimizationIterationRow } from "../../../../lib/types.supabase.js";

/**
 * GET /api/iris/optimization/runs/[id]
 * Get a single optimization run with its iterations
 *
 * Path Parameters:
 * - id: Run UUID
 *
 * Response includes:
 * - run: Full run details
 * - iterations: Array of iterations (sorted by iteration_number)
 * - stats: Aggregated statistics
 *
 * PATCH /api/iris/optimization/runs/[id]
 * Update an optimization run
 *
 * Request Body (all fields optional):
 * - status: Update run status
 * - final_score: Set final score
 * - best_params: Set best parameters
 * - metadata: Update metadata
 * - iterations_count: Update iteration count
 * - duration_ms: Set duration
 * - error_message: Set error message
 * - completed_at: Set completion timestamp
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
  const runId = req.query.id as string;

  // Validate run ID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!runId || !uuidRegex.test(runId)) {
    return res.status(400).json({
      error: "Invalid run ID format",
      hint: "Run ID must be a valid UUID",
      timestamp: new Date().toISOString(),
    });
  }

  // GET: Retrieve single run with iterations
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

        // Fetch run details
        const { data: run, error: runError } = await supabase
          .from<OptimizationRunRow>("optimization_runs")
          .select("*")
          .eq("id", runId)
          .eq("project_id", project.projectId)
          .single();

        if (runError || !run) {
          return res.status(404).json({
            error: "Optimization run not found",
            hint: "Check that the run ID is correct and belongs to your project",
            timestamp: new Date().toISOString(),
          });
        }

        // Fetch iterations
        const { data: iterations, error: iterationsError } = await supabase
          .from<OptimizationIterationRow>("optimization_iterations")
          .select("*")
          .eq("run_id", runId)
          .order("iteration_number", { ascending: true });

        if (iterationsError) {
          console.error("Failed to fetch iterations:", iterationsError);
          // Continue without iterations rather than failing
        }

        // Calculate iteration statistics
        const stats = iterations && iterations.length > 0 ? {
          totalIterations: iterations.length,
          bestScore: Math.max(...iterations.map(i => i.score)),
          worstScore: Math.min(...iterations.map(i => i.score)),
          averageScore: iterations.reduce((sum, i) => sum + i.score, 0) / iterations.length,
          averageDuration: iterations.filter(i => i.duration_ms).length > 0
            ? iterations.reduce((sum, i) => sum + (i.duration_ms || 0), 0) / iterations.filter(i => i.duration_ms).length
            : null,
        } : {
          totalIterations: 0,
          bestScore: null,
          worstScore: null,
          averageScore: null,
          averageDuration: null,
        };

        // Calculate ETag for caching
        const etag = `"${runId}-${run.updated_at}"`;

        // Check If-None-Match header
        const ifNoneMatch = req.headers["if-none-match"];
        if (ifNoneMatch === etag) {
          return res.status(304).end();
        }

        // Set cache headers (cache for 60 seconds)
        res.setHeader("Cache-Control", "private, max-age=60, must-revalidate");
        res.setHeader("ETag", etag);

        // Add performance metrics
        const latencyMs = Date.now() - startTime;
        res.setHeader("X-Response-Time", `${latencyMs}ms`);

        return res.status(200).json({
          run,
          iterations: iterations || [],
          stats,
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

  // PATCH: Update optimization run
  if (req.method === "PATCH") {
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
        const parsed = UpdateOptimizationRunSchema.safeParse(req.body);

        if (!parsed.success) {
          return res.status(400).json({
            error: "Invalid request body",
            issues: parsed.error.flatten(),
            timestamp: new Date().toISOString(),
          });
        }

        const updates = parsed.data;

        // Check if run exists and belongs to project
        const { data: existingRun, error: fetchError } = await supabase
          .from<OptimizationRunRow>("optimization_runs")
          .select("id, project_id")
          .eq("id", runId)
          .eq("project_id", project.projectId)
          .single();

        if (fetchError || !existingRun) {
          return res.status(404).json({
            error: "Optimization run not found",
            hint: "Check that the run ID is correct and belongs to your project",
            timestamp: new Date().toISOString(),
          });
        }

        // Update run
        const { data, error } = await supabase
          .from<OptimizationRunRow>("optimization_runs")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", runId)
          .select()
          .single();

        if (error) {
          console.error("Database error:", error);
          return res.status(500).json({
            error: "Failed to update optimization run",
            details: error.message,
            timestamp: new Date().toISOString(),
          });
        }

        // Add performance metrics
        const latencyMs = Date.now() - startTime;
        res.setHeader("X-Response-Time", `${latencyMs}ms`);

        return res.status(200).json({
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
    allowedMethods: ["GET", "PATCH"],
    timestamp: new Date().toISOString(),
  });
}
