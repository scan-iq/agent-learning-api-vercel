/**
 * IRIS Telemetry - Direct Supabase implementation
 * Bypasses @foxruv/agent-learning-core to avoid Vercel bundling issues
 */
import { getSupabaseClient } from "./supabase.js";
/**
 * Log telemetry event to Supabase
 */
export async function logTelemetry(event) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("iris_telemetry").insert({
        expert_id: event.expertId,
        project_id: event.projectId,
        confidence: event.confidence,
        latency_ms: event.latencyMs,
        outcome: event.outcome,
        event_type: event.eventType || "telemetry",
        metadata: event.metadata || {},
        created_at: new Date().toISOString(),
    });
    if (error) {
        throw new Error(`Failed to log telemetry: ${error.message}`);
    }
}
/**
 * Get IRIS system data for a project
 */
export async function getIrisData(projectId) {
    const supabase = getSupabaseClient();
    // Get recent telemetry
    const { data: telemetry, error: telemetryError } = await supabase
        .from("iris_telemetry")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(100);
    if (telemetryError) {
        throw new Error(`Failed to get telemetry: ${telemetryError.message}`);
    }
    return {
        telemetry: telemetry || [],
        summary: {
            totalEvents: telemetry?.length || 0,
            avgConfidence: telemetry && telemetry.length > 0
                ? telemetry.reduce((sum, t) => sum + (t.confidence || 0), 0) / telemetry.length
                : 0,
        },
    };
}
