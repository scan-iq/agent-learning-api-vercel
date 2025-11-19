import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../lib/auth.js";
import { initCoreSupabase } from "../../lib/supabase.js";
import { logTelemetry } from "@foxruv/agent-learning-core";

/**
 * POST /api/iris/telemetry
 * Authenticated endpoint - accepts telemetry data
 * Requires Authorization: Bearer <api-key> header
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      allowedMethods: ["POST"]
    });
  }

  return withIrisAuthVercel(req, res, async (project, req, res) => {
    try {
      await initCoreSupabase();

      const body = req.body as {
        expertId?: string;
        confidence?: number;
        latencyMs?: number;
        outcome?: string;
        [key: string]: unknown;
      };
      const { expertId, confidence, latencyMs, outcome, ...rest } = body;

      // Validate required fields
      if (!expertId) {
        return res.status(400).json({
          error: "expertId is required",
        });
      }

      // Call logTelemetry from core
      await logTelemetry({
        expertId,
        confidence,
        latencyMs,
        outcome,
        ...rest,
      });

      return res.status(201).json({
        success: true,
        projectId: project.projectId,
        projectName: project.projectName,
        expertId,
      });
    } catch (error) {
      console.error("Telemetry error:", error);
      return res.status(500).json({
        error: "Failed to log telemetry",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
