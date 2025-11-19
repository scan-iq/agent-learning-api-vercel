/**
 * POST /api/iris/consensus
 * Log multi-agent consensus decisions to consensus_lineage table
 * Supports agentic-flow's consensus patterns
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
        sectionTag?: string;
        taskId?: string;
        runId?: string;
        contributingExperts: Array<{ expertId: string; vote: any; confidence: number }>;
        winningVersion?: string;
        confidence?: number;
        finalDecision: Record<string, any>;
        disagreementScore?: number;
        reasoningChains?: Array<{ expertId: string; reasoning: string[] }>;
        metadata?: Record<string, any>;
      };

      if (!body.contributingExperts || !body.finalDecision) {
        return res.status(400).json({
          error: "contributingExperts and finalDecision are required",
        });
      }

      const supabase = getSupabaseClient();

      const { error } = await supabase.from("consensus_lineage").insert({
        tenant_id: null,
        project: project.projectId,
        section_tag: body.sectionTag,
        task_id: body.taskId,
        run_id: body.runId,
        contributing_experts: body.contributingExperts,
        winning_version: body.winningVersion,
        confidence: body.confidence,
        final_decision: body.finalDecision,
        disagreement_score: body.disagreementScore,
        reasoning_chains: body.reasoningChains || [],
        metadata: body.metadata || {},
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to log consensus: ${error.message}`);
      }

      return res.status(201).json({
        success: true,
        projectId: project.projectId,
        expertsCount: body.contributingExperts.length,
        message: "Consensus decision logged successfully",
      });
    } catch (error) {
      console.error("Consensus logging error:", error);
      return res.status(500).json({
        error: "Failed to log consensus",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
