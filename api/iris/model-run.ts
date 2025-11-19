/**
 * POST /api/iris/model-run
 * Log detailed LLM execution data to model_run_log table
 * Captures tokens, cost, reflexion, consensus participation
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../lib/auth.js";
import { getSupabaseClient } from "../../lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withIrisAuthVercel(req, res, async (project, req, res) => {
    try {
      const body = req.body as {
        expertId: string;
        version?: string;
        runId?: string;
        inputHash?: string;
        confidence?: number;
        latencyMs?: number;
        tokensIn?: number;
        tokensOut?: number;
        costUsd?: number;
        outcome?: string;
        reflexionUsed?: boolean;
        reflexionIds?: string[];
        consensusParticipation?: boolean;
        errorMessage?: string;
        metadata?: Record<string, any>;
      };

      if (!body.expertId) {
        return res.status(400).json({ error: "expertId is required" });
      }

      const supabase = getSupabaseClient();

      const { error } = await supabase.from("model_run_log").insert({
        tenant_id: null, // Optional - set if using multi-tenancy
        project: project.projectId,
        expert_id: body.expertId,
        version: body.version,
        run_id: body.runId,
        input_hash: body.inputHash,
        confidence: body.confidence,
        latency_ms: body.latencyMs,
        tokens_in: body.tokensIn,
        tokens_out: body.tokensOut,
        cost_usd: body.costUsd,
        outcome: body.outcome || "success",
        reflexion_used: body.reflexionUsed || false,
        reflexion_ids: body.reflexionIds || [],
        consensus_participation: body.consensusParticipation || false,
        error_message: body.errorMessage,
        metadata: body.metadata || {},
        timestamp: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to log model run: ${error.message}`);
      }

      return res.status(201).json({
        success: true,
        projectId: project.projectId,
        expertId: body.expertId,
        message: "Model run logged successfully",
      });
    } catch (error) {
      console.error("Model run logging error:", error);
      return res.status(500).json({
        error: "Failed to log model run",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
