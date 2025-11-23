import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../../lib/auth.js";
import { getSupabaseClient } from "../../../lib/supabase.js";
import { rateLimitByApiKey, getRateLimitStatus } from "../../../lib/rate-limit.js";
import { RateLimitError } from "../../../lib/errors.js";
import type { OptimizationRunRow } from "../../../lib/types.supabase.js";

/**
 * GET /api/iris/optimization/stats
 * Get aggregated statistics across optimization runs
 *
 * Query Parameters:
 * - project_id: Filter by project (optional, defaults to authenticated project)
 * - optimizer_type: Filter by optimizer type (optional)
 * - status: Filter by status (optional)
 * - start_date: Filter runs created after this date (ISO 8601)
 * - end_date: Filter runs created before this date (ISO 8601)
 *
 * Returns:
 * - totalRuns: Total number of runs matching filters
 * - successRate: Percentage of completed runs
 * - averageImprovement: Average score improvement (final_score)
 * - averageDuration: Average run duration in milliseconds
 * - byStatus: Count of runs by status
 * - byOptimizerType: Count and stats by optimizer type
 * - topPerformers: Top 10 runs by final_score
 * - recentTrends: Trend data over time
 *
 * Response Headers:
 * - X-RateLimit-Limit: Rate limit maximum
 * - X-RateLimit-Remaining: Remaining requests
 * - X-RateLimit-Reset: Reset time (ISO 8601)
 * - Cache-Control: Aggressive caching (5 minutes)
 *
 * Performance Target: p99 < 200ms
 * Cache Strategy: Aggressively cached (300s) as stats don't need real-time accuracy
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
      allowedMethods: ["GET"],
      timestamp: new Date().toISOString(),
    });
  }

  const supabase = getSupabaseClient();

  return withIrisAuthVercel(req, res, async (project, _req, res) => {
    const startTime = Date.now();

    try {
      // Apply rate limiting (more generous for stats as they're cached)
      rateLimitByApiKey(project.projectId, 1000, 60_000);

      // Add rate limit headers
      const rateLimitStatus = getRateLimitStatus(`apikey:${project.projectId}`, 1000);
      res.setHeader("X-RateLimit-Limit", rateLimitStatus.limit);
      res.setHeader("X-RateLimit-Remaining", rateLimitStatus.remaining);
      if (rateLimitStatus.reset) {
        res.setHeader("X-RateLimit-Reset", rateLimitStatus.reset);
      }

      // Parse query parameters
      const projectId = (req.query.project_id as string) || project.projectId;
      const optimizerType = req.query.optimizer_type as string | undefined;
      const status = req.query.status as string | undefined;
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;

      // Build base query
      let query = supabase
        .from<OptimizationRunRow>("optimization_runs")
        .select("*")
        .eq("project_id", projectId);

      // Apply filters
      if (optimizerType) {
        query = query.eq("optimizer_type", optimizerType);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      // Fetch all matching runs
      const { data: runs, error } = await query;

      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({
          error: "Failed to fetch optimization statistics",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Calculate aggregated statistics
      const totalRuns = runs?.length || 0;

      // Success rate calculation
      const completedRuns = runs?.filter(r => r.status === "completed") || [];
      const failedRuns = runs?.filter(r => r.status === "failed") || [];
      const successRate = totalRuns > 0
        ? (completedRuns.length / totalRuns) * 100
        : 0;

      // Average improvement (final_score)
      const runsWithScore = runs?.filter(r => r.final_score !== null && r.final_score !== undefined) || [];
      const averageImprovement = runsWithScore.length > 0
        ? runsWithScore.reduce((sum, r) => sum + (r.final_score || 0), 0) / runsWithScore.length
        : null;

      // Average duration
      const runsWithDuration = runs?.filter(r => r.duration_ms !== null && r.duration_ms !== undefined) || [];
      const averageDuration = runsWithDuration.length > 0
        ? runsWithDuration.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / runsWithDuration.length
        : null;

      // Count by status
      const byStatus = {
        pending: runs?.filter(r => r.status === "pending").length || 0,
        running: runs?.filter(r => r.status === "running").length || 0,
        completed: completedRuns.length,
        failed: failedRuns.length,
        cancelled: runs?.filter(r => r.status === "cancelled").length || 0,
      };

      // Stats by optimizer type
      const optimizerTypes = Array.from(new Set(runs?.map(r => r.optimizer_type) || []));
      const byOptimizerType = optimizerTypes.map(type => {
        const typeRuns = runs?.filter(r => r.optimizer_type === type) || [];
        const typeScores = typeRuns.filter(r => r.final_score !== null && r.final_score !== undefined);
        const typeDurations = typeRuns.filter(r => r.duration_ms !== null && r.duration_ms !== undefined);

        return {
          optimizerType: type,
          count: typeRuns.length,
          successRate: typeRuns.length > 0
            ? (typeRuns.filter(r => r.status === "completed").length / typeRuns.length) * 100
            : 0,
          averageScore: typeScores.length > 0
            ? typeScores.reduce((sum, r) => sum + (r.final_score || 0), 0) / typeScores.length
            : null,
          averageDuration: typeDurations.length > 0
            ? typeDurations.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / typeDurations.length
            : null,
        };
      });

      // Top performers (top 10 by final_score)
      const topPerformers = runs
        ?.filter(r => r.final_score !== null && r.final_score !== undefined)
        .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
        .slice(0, 10)
        .map(r => ({
          id: r.id,
          run_name: r.run_name,
          optimizer_type: r.optimizer_type,
          final_score: r.final_score,
          duration_ms: r.duration_ms,
          created_at: r.created_at,
        })) || [];

      // Recent trends (group by day for last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRuns = runs?.filter(r => {
        if (!r.created_at) return false;
        return new Date(r.created_at) >= thirtyDaysAgo;
      }) || [];

      // Group by date
      const trendMap = new Map<string, { date: string; count: number; completed: number; failed: number }>();
      recentRuns.forEach(run => {
        if (!run.created_at) return;
        const date = run.created_at.split("T")[0]; // Get YYYY-MM-DD
        const existing = trendMap.get(date) || { date, count: 0, completed: 0, failed: 0 };
        existing.count++;
        if (run.status === "completed") existing.completed++;
        if (run.status === "failed") existing.failed++;
        trendMap.set(date, existing);
      });

      const recentTrends = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate ETag based on query parameters and data
      const etag = `"stats-${projectId}-${runs?.length || 0}-${Date.now()}"`;

      // Check If-None-Match header
      const ifNoneMatch = req.headers["if-none-match"];
      if (ifNoneMatch === etag) {
        return res.status(304).end();
      }

      // Aggressive caching for stats (5 minutes)
      res.setHeader("Cache-Control", "private, max-age=300, must-revalidate");
      res.setHeader("ETag", etag);

      // Add performance metrics
      const latencyMs = Date.now() - startTime;
      res.setHeader("X-Response-Time", `${latencyMs}ms`);

      return res.status(200).json({
        statistics: {
          totalRuns,
          successRate: parseFloat(successRate.toFixed(2)),
          averageImprovement: averageImprovement ? parseFloat(averageImprovement.toFixed(4)) : null,
          averageDuration: averageDuration ? Math.round(averageDuration) : null,
        },
        byStatus,
        byOptimizerType,
        topPerformers,
        recentTrends,
        metadata: {
          filters: {
            projectId,
            optimizerType: optimizerType || null,
            status: status || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
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
