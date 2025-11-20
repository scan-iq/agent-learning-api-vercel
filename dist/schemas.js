import { z } from "zod";
export const TelemetryEventSchema = z.object({
    expertId: z.string().min(1),
    projectId: z.string().optional(),
    confidence: z.number().optional(),
    latencyMs: z.number().optional(),
    outcome: z.string().optional(),
    eventType: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});
export const EnhancedTelemetrySchema = TelemetryEventSchema.extend({
    agentType: z.string().optional(),
    modelName: z.string().optional(),
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    costUsd: z.number().optional(),
    reasoningSteps: z
        .array(z.object({
        step: z.number(),
        thought: z.string(),
        action: z.string().optional(),
        result: z.any().optional(),
    }))
        .optional(),
    toolCalls: z
        .array(z.object({
        tool: z.string(),
        args: z.record(z.any()),
        result: z.any().optional(),
        duration_ms: z.number().optional(),
    }))
        .optional(),
    causalChain: z
        .array(z.object({
        cause: z.string(),
        effect: z.string(),
        strength: z.number(),
    }))
        .optional(),
    reflexionData: z
        .object({
        selfCritique: z.string().optional(),
        improvements: z.array(z.string()).optional(),
        lessonsLearned: z.array(z.string()).optional(),
    })
        .optional(),
});
export const DecisionDraftStatusSchema = z.object({
    id: z.string().min(1),
    status: z.enum(["pending", "approved", "rejected"]),
});
