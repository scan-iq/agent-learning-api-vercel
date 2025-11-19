/**
 * GET /api/iris/analytics
 * Comprehensive analytics aggregating data from multiple tables
 * Returns rich insights for dashboard display
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../lib/auth.js";
import { getSupabaseClient } from "../../lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withIrisAuthVercel(req, res, async (project, _req, res) => {
    try {
      const supabase = getSupabaseClient();
      const projectId = project.projectId;

      // Get data from all relevant tables in parallel
      const [modelRuns, reflexions, consensus, telemetry] = await Promise.all([
        // Model runs
        supabase
          .from("model_run_log")
          .select("*")
          .eq("project", projectId)
          .order("timestamp", { ascending: false })
          .limit(100),

        // Reflexions
        supabase
          .from("reflexion_bank")
          .select("*")
          .eq("project", projectId)
          .order("created_at", { ascending: false })
          .limit(50),

        // Consensus decisions
        supabase
          .from("consensus_lineage")
          .select("*")
          .eq("project", projectId)
          .order("created_at", { ascending: false })
          .limit(50),

        // Basic telemetry
        supabase
          .from("iris_telemetry")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const runs = modelRuns.data || [];
      const reflexionData = reflexions.data || [];
      const consensusData = consensus.data || [];
      const telemetryData = telemetry.data || [];

      // Compute comprehensive analytics
      const analytics = {
        projectId,
        projectName: project.projectName,
        timestamp: new Date().toISOString(),

        // Overall metrics
        overview: {
          totalModelRuns: runs.length,
          totalReflexions: reflexionData.length,
          totalConsensusDecisions: consensusData.length,
          totalTelemetryEvents: telemetryData.length,
        },

        // Token usage & costs
        tokens: {
          totalTokensIn: runs.reduce((sum, r) => sum + (r.tokens_in || 0), 0),
          totalTokensOut: runs.reduce((sum, r) => sum + (r.tokens_out || 0), 0),
          totalCostUsd: runs.reduce((sum, r) => sum + (r.cost_usd || 0), 0),
          avgTokensPerRun: runs.length > 0
            ? runs.reduce((sum, r) => sum + (r.tokens_in || 0) + (r.tokens_out || 0), 0) / runs.length
            : 0,
        },

        // Performance metrics
        performance: {
          avgConfidence: runs.length > 0
            ? runs.reduce((sum, r) => sum + (r.confidence || 0), 0) / runs.length
            : 0,
          avgLatencyMs: runs.length > 0
            ? runs.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / runs.length
            : 0,
          successRate: runs.length > 0
            ? runs.filter(r => r.outcome === "success").length / runs.length
            : 0,
        },

        // Reflexion insights
        reflexion: {
          totalReflexions: reflexionData.length,
          successRate: reflexionData.length > 0
            ? reflexionData.filter(r => r.success).length / reflexionData.length
            : 0,
          avgImpactScore: reflexionData.length > 0
            ? reflexionData.reduce((sum, r) => sum + (r.impact_score || 0), 0) / reflexionData.length
            : 0,
          totalReuses: reflexionData.reduce((sum, r) => sum + (r.reuse_count || 0), 0),
          byType: groupBy(reflexionData, 'reflexion_type'),
        },

        // Consensus insights
        consensus: {
          totalDecisions: consensusData.length,
          avgConfidence: consensusData.length > 0
            ? consensusData.reduce((sum, c) => sum + (c.confidence || 0), 0) / consensusData.length
            : 0,
          avgDisagreement: consensusData.length > 0
            ? consensusData.reduce((sum, c) => sum + (c.disagreement_score || 0), 0) / consensusData.length
            : 0,
          avgExpertsPerDecision: consensusData.length > 0
            ? consensusData.reduce((sum, c) => sum + (c.contributing_experts?.length || 0), 0) / consensusData.length
            : 0,
        },

        // Recent activity
        recent: {
          modelRuns: runs.slice(0, 10).map(r => ({
            expertId: r.expert_id,
            outcome: r.outcome,
            confidence: r.confidence,
            tokensUsed: (r.tokens_in || 0) + (r.tokens_out || 0),
            costUsd: r.cost_usd,
            timestamp: r.timestamp,
          })),
          reflexions: reflexionData.slice(0, 10).map(r => ({
            type: r.reflexion_type,
            success: r.success,
            impactScore: r.impact_score,
            timestamp: r.created_at,
          })),
          consensusDecisions: consensusData.slice(0, 10).map(c => ({
            expertsCount: c.contributing_experts?.length || 0,
            confidence: c.confidence,
            disagreement: c.disagreement_score,
            timestamp: c.created_at,
          })),
        },
      };

      return res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      return res.status(500).json({
        error: "Failed to fetch analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

function groupBy(array: any[], key: string) {
  return array.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
