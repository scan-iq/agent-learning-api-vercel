import { withIrisAuth } from "../../lib/auth.js";
import { initCoreSupabase } from "../../lib/supabase.js";

/**
 * POST /api/iris/telemetry
 * Authenticated endpoint - accepts telemetry data
 * Requires Authorization: Bearer <api-key> header
 */
export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  return withIrisAuth(req, async (project, req) => {
    try {
      await initCoreSupabase();

      const body = (await req.json()) as {
        expertId?: string;
        confidence?: number;
        latencyMs?: number;
        outcome?: string;
        [key: string]: unknown;
      };
      const { expertId, confidence, latencyMs, outcome, ...rest } = body;

      // Validate required fields
      if (!expertId) {
        return new Response(
          JSON.stringify({
            error: "expertId is required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Import and call logTelemetry from core
      const { logTelemetry } = await import("@foxruv/agent-learning-core");

      await logTelemetry({
        expertId,
        confidence,
        latencyMs,
        outcome,
        ...rest,
      });

      return new Response(
        JSON.stringify({
          success: true,
          projectId: project.projectId,
          projectName: project.projectName,
          expertId,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Telemetry error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to log telemetry",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  });
}
