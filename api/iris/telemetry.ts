import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../lib/auth.js";
import { logTelemetry } from "../../lib/iris-telemetry.js";
import { logEnhancedTelemetry } from "../../lib/enhanced-telemetry.js";
import { TelemetryEventSchema, EnhancedTelemetrySchema } from "../../lib/schemas.js";

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
      const parsedEnhanced = EnhancedTelemetrySchema.safeParse(req.body);
      const parsedBasic = TelemetryEventSchema.safeParse(req.body);

      if (!parsedEnhanced.success && !parsedBasic.success) {
        return res.status(400).json({
          error: "Invalid telemetry payload",
          issues: parsedEnhanced.success ? undefined : parsedEnhanced.error.flatten(),
        });
      }

      const body = (parsedEnhanced.success ? parsedEnhanced.data : parsedBasic.data)!;
      const { expertId, ...telemetryData } = body;

      // Use enhanced telemetry if additional fields are provided
      const hasEnhancedData = !!(
        ("agentType" in body && body.agentType) ||
        ("modelName" in body && body.modelName) ||
        ("reasoningSteps" in body && body.reasoningSteps) ||
        ("toolCalls" in body && body.toolCalls) ||
        ("causalChain" in body && body.causalChain) ||
        ("reflexionData" in body && body.reflexionData)
      );

      if (hasEnhancedData) {
        await logEnhancedTelemetry({
          expertId,
          projectId: project.projectId,
          ...telemetryData,
        });
      } else {
        // Simple telemetry for backwards compatibility
        await logTelemetry({
          expertId,
          projectId: project.projectId,
          confidence: body.confidence,
          latencyMs: body.latencyMs,
          outcome: body.outcome,
          eventType: body.eventType,
          metadata: body.metadata,
        });
      }

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
