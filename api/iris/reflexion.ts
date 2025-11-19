/**
 * POST /api/iris/reflexion
 * Log reflexion (self-reflection/learning) data to reflexion_bank table
 * Supports agentic-flow's reflexion patterns
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
        expertId?: string;
        reflexionType: string;
        context: Record<string, any>;
        outcome: Record<string, any>;
        success: boolean;
        confidence?: number;
        impactScore?: number;
      };

      if (!body.reflexionType || !body.context || !body.outcome || body.success === undefined) {
        return res.status(400).json({
          error: "reflexionType, context, outcome, and success are required",
        });
      }

      const supabase = getSupabaseClient();

      const { error } = await supabase.from("reflexion_bank").insert({
        tenant_id: null,
        project: project.projectId,
        expert_id: body.expertId || "unknown",
        reflexion_type: body.reflexionType,
        context: body.context,
        outcome: body.outcome,
        success: body.success,
        confidence: body.confidence,
        impact_score: body.impactScore || 0.5,
        reuse_count: 0,
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to log reflexion: ${error.message}`);
      }

      return res.status(201).json({
        success: true,
        projectId: project.projectId,
        reflexionType: body.reflexionType,
        message: "Reflexion logged successfully",
      });
    } catch (error) {
      console.error("Reflexion logging error:", error);
      return res.status(500).json({
        error: "Failed to log reflexion",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
