/**
 * IRIS Telemetry - Direct Supabase implementation
 * Bypasses @foxruv/agent-learning-core to avoid Vercel bundling issues
 */
export interface TelemetryEvent {
    expertId: string;
    confidence?: number;
    latencyMs?: number;
    outcome?: string;
    projectId?: string;
    eventType?: string;
    metadata?: Record<string, any>;
}
/**
 * Log telemetry event to Supabase
 */
export declare function logTelemetry(event: TelemetryEvent): Promise<void>;
/**
 * Get IRIS system data for a project
 */
export declare function getIrisData(projectId: string): Promise<{
    telemetry: any[];
    summary: {
        totalEvents: number;
        avgConfidence: number;
    };
}>;
//# sourceMappingURL=iris-telemetry.d.ts.map