import { z } from "zod";
export declare const TelemetryEventSchema: z.ZodObject<{
    expertId: z.ZodString;
    projectId: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    outcome: z.ZodOptional<z.ZodString>;
    eventType: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    expertId: string;
    projectId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    outcome?: string | undefined;
    confidence?: number | undefined;
    latencyMs?: number | undefined;
    eventType?: string | undefined;
}, {
    expertId: string;
    projectId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    outcome?: string | undefined;
    confidence?: number | undefined;
    latencyMs?: number | undefined;
    eventType?: string | undefined;
}>;
export declare const EnhancedTelemetrySchema: z.ZodObject<{
    expertId: z.ZodString;
    projectId: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    outcome: z.ZodOptional<z.ZodString>;
    eventType: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    agentType: z.ZodOptional<z.ZodString>;
    modelName: z.ZodOptional<z.ZodString>;
    promptTokens: z.ZodOptional<z.ZodNumber>;
    completionTokens: z.ZodOptional<z.ZodNumber>;
    totalTokens: z.ZodOptional<z.ZodNumber>;
    costUsd: z.ZodOptional<z.ZodNumber>;
    reasoningSteps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        step: z.ZodNumber;
        thought: z.ZodString;
        action: z.ZodOptional<z.ZodString>;
        result: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        step: number;
        thought: string;
        action?: string | undefined;
        result?: any;
    }, {
        step: number;
        thought: string;
        action?: string | undefined;
        result?: any;
    }>, "many">>;
    toolCalls: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tool: z.ZodString;
        args: z.ZodRecord<z.ZodString, z.ZodAny>;
        result: z.ZodOptional<z.ZodAny>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        tool: string;
        args: Record<string, any>;
        result?: any;
        duration_ms?: number | undefined;
    }, {
        tool: string;
        args: Record<string, any>;
        result?: any;
        duration_ms?: number | undefined;
    }>, "many">>;
    causalChain: z.ZodOptional<z.ZodArray<z.ZodObject<{
        cause: z.ZodString;
        effect: z.ZodString;
        strength: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        cause: string;
        effect: string;
        strength: number;
    }, {
        cause: string;
        effect: string;
        strength: number;
    }>, "many">>;
    reflexionData: z.ZodOptional<z.ZodObject<{
        selfCritique: z.ZodOptional<z.ZodString>;
        improvements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        lessonsLearned: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        selfCritique?: string | undefined;
        improvements?: string[] | undefined;
        lessonsLearned?: string[] | undefined;
    }, {
        selfCritique?: string | undefined;
        improvements?: string[] | undefined;
        lessonsLearned?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    expertId: string;
    projectId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    outcome?: string | undefined;
    confidence?: number | undefined;
    latencyMs?: number | undefined;
    eventType?: string | undefined;
    agentType?: string | undefined;
    modelName?: string | undefined;
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
    costUsd?: number | undefined;
    reasoningSteps?: {
        step: number;
        thought: string;
        action?: string | undefined;
        result?: any;
    }[] | undefined;
    toolCalls?: {
        tool: string;
        args: Record<string, any>;
        result?: any;
        duration_ms?: number | undefined;
    }[] | undefined;
    causalChain?: {
        cause: string;
        effect: string;
        strength: number;
    }[] | undefined;
    reflexionData?: {
        selfCritique?: string | undefined;
        improvements?: string[] | undefined;
        lessonsLearned?: string[] | undefined;
    } | undefined;
}, {
    expertId: string;
    projectId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    outcome?: string | undefined;
    confidence?: number | undefined;
    latencyMs?: number | undefined;
    eventType?: string | undefined;
    agentType?: string | undefined;
    modelName?: string | undefined;
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
    costUsd?: number | undefined;
    reasoningSteps?: {
        step: number;
        thought: string;
        action?: string | undefined;
        result?: any;
    }[] | undefined;
    toolCalls?: {
        tool: string;
        args: Record<string, any>;
        result?: any;
        duration_ms?: number | undefined;
    }[] | undefined;
    causalChain?: {
        cause: string;
        effect: string;
        strength: number;
    }[] | undefined;
    reflexionData?: {
        selfCritique?: string | undefined;
        improvements?: string[] | undefined;
        lessonsLearned?: string[] | undefined;
    } | undefined;
}>;
export declare const DecisionDraftStatusSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<["pending", "approved", "rejected"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "pending" | "approved" | "rejected";
}, {
    id: string;
    status: "pending" | "approved" | "rejected";
}>;
export type TelemetryEventInput = z.infer<typeof TelemetryEventSchema>;
export type EnhancedTelemetryInput = z.infer<typeof EnhancedTelemetrySchema>;
export type DecisionDraftStatusInput = z.infer<typeof DecisionDraftStatusSchema>;
//# sourceMappingURL=schemas.d.ts.map