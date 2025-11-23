import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../../../../lib/auth.js";
import { getSupabaseClient } from "../../../../../lib/supabase.js";
import { rateLimitByApiKey, getRateLimitStatus } from "../../../../../lib/rate-limit.js";
import { RateLimitError } from "../../../../../lib/errors.js";
import { CreateOptimizationIterationSchema } from "../../../../../lib/schemas.js";
import type { OptimizationIterationRow, OptimizationRunRow } from "../../../../../lib/types.supabase.js";

/**
 * POST /api/iris/optimization/runs/[id]/iterations
 * Add a new iteration to an optimization run
 *
 * Path Parameters:
 * - id: Run UUID
 *
 * Request Body:
 * - iteration_number: Iteration number (integer)
 * - params: Parameters used in this iteration
 * - score: Score achieved
 * - metrics: Optional metrics object
 * - metadata: Optional metadata
 * - duration_ms: Optional duration in milliseconds
 *
 * Response Headers:
 * - X-RateLimit-Limit: Rate limit maximum
 * - X-RateLimit-Remaining: Remaining requests
 * - X-RateLimit-Reset: Reset time (ISO 8601)
 *
 * Performance Target: p99 < 200ms
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      allowedMethods: ["POST"],
      timestamp: new Date().toISOString(),
    });
  }

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

  return withIrisAuthVercel(req, res, async (project, _req, res) => {
    const startTime = Date.now();

    try {
      // Apply rate limiting (generous for iterations as they're frequent)
      rateLimitByApiKey(project.projectId, 2000, 60_000);

      // Add rate limit headers
      const rateLimitStatus = getRateLimitStatus(`apikey:${project.projectId}`, 2000);
      res.setHeader("X-RateLimit-Limit", rateLimitStatus.limit);
      res.setHeader("X-RateLimit-Remaining", rateLimitStatus.remaining);
      if (rateLimitStatus.reset) {
        res.setHeader("X-RateLimit-Reset", rateLimitStatus.reset);
      }

      // Validate request body
      const parsed = CreateOptimizationIterationSchema.safeParse({
        ...req.body,
        run_id: runId,
      });

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body",
          issues: parsed.error.flatten(),
          timestamp: new Date().toISOString(),
        });
      }

      const iterationData = parsed.data;

      // Check if run exists and belongs to project
      const { data: run, error: runError } = await supabase
        .from<OptimizationRunRow>("optimization_runs")
        .select("id, project_id, status, iterations_count, final_score, best_params")
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

      // Insert iteration
      const { data: iteration, error: insertError } = await supabase
        .from<OptimizationIterationRow>("optimization_iterations")
        .insert({
          run_id: runId,
          iteration_number: iterationData.iteration_number,
          params: iterationData.params,
          score: iterationData.score,
          metrics: iterationData.metrics,
          metadata: iterationData.metadata,
          duration_ms: iterationData.duration_ms,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Database error:", insertError);
        return res.status(500).json({
          error: "Failed to create iteration",
          details: insertError.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Update run with new iteration count and best score if needed
      const newIterationCount = (run.iterations_count || 0) + 1;
      const shouldUpdateBest = !run.final_score || iterationData.score > run.final_score;

      const updates: any = {
        iterations_count: newIterationCount,
        updated_at: new Date().toISOString(),
      };

      // Update status to running if it was pending
      if (run.status === "pending") {
        updates.status = "running";
        updates.started_at = new Date().toISOString();
      }

      // Update best score and params if this iteration is better
      if (shouldUpdateBest) {
        updates.final_score = iterationData.score;
        updates.best_params = iterationData.params;
      }

      await supabase
        .from<OptimizationRunRow>("optimization_runs")
        .update(updates)
        .eq("id", runId);

      // Add performance metrics
      const latencyMs = Date.now() - startTime;
      res.setHeader("X-Response-Time", `${latencyMs}ms`);

      return res.status(201).json({
        iteration,
        runUpdates: {
          iterations_count: newIterationCount,
          is_new_best: shouldUpdateBest,
          final_score: shouldUpdateBest ? iterationData.score : run.final_score,
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
