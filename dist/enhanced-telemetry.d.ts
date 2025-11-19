/**
 * Enhanced IRIS Telemetry with agentdb and agentic-flow integration
 * Captures rich telemetry data for advanced analytics
 */
export interface EnhancedTelemetryEvent {
    expertId: string;
    projectId?: string;
    confidence?: number;
    latencyMs?: number;
    outcome?: string;
    eventType?: string;
    agentType?: string;
    modelName?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd?: number;
    reasoningSteps?: Array<{
        step: number;
        thought: string;
        action?: string;
        result?: string;
    }>;
    toolCalls?: Array<{
        tool: string;
        args: Record<string, any>;
        result?: any;
        duration_ms?: number;
    }>;
    errorDetails?: {
        type: string;
        message: string;
        stack?: string;
        context?: Record<string, any>;
    };
    contextWindow?: number;
    temperature?: number;
    topP?: number;
    reasoningQualityScore?: number;
    causalChain?: Array<{
        cause: string;
        effect: string;
        strength: number;
    }>;
    reflexionData?: {
        selfCritique?: string;
        improvements?: string[];
        lessonsLearned?: string[];
    };
    parentTraceId?: string;
    traceDepth?: number;
    tags?: string[];
    metadata?: Record<string, any>;
}
/**
 * Log enhanced telemetry event
 */
export declare function logEnhancedTelemetry(event: EnhancedTelemetryEvent): Promise<void>;
/**
 * Get comprehensive analytics for a project using agentdb patterns
 */
export declare function getProjectAnalytics(projectId: string, options?: {
    fromDate?: string;
    toDate?: string;
    limit?: number;
}): Promise<{
    projectId: string;
    totalEvents: number;
    timeRange: {
        from: any;
        to: any;
    };
    performance: {
        avgLatencyMs: number;
        avgConfidence: number;
        successRate: number;
    };
    tokens: {
        totalPromptTokens: any;
        totalCompletionTokens: any;
        totalTokens: any;
        totalCostUsd: any;
    };
    byAgentType: any;
    byModel: any;
    byOutcome: any;
    avgReasoningQuality: number;
    recentEvents: any[];
}>;
//# sourceMappingURL=enhanced-telemetry.d.ts.map