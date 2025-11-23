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
// =============================================================================
// OPTIMIZATION SCHEMAS (DSPy MIPROv2)
// =============================================================================
// Optimizer types (DSPy-specific)
export const OptimizerTypeSchema = z.enum([
    "miprov2",
    "bootstrap",
    "copro",
    "knn",
    "random",
    "custom",
]);
// Optimization status
export const OptimizationStatusSchema = z.enum([
    "pending",
    "running",
    "completed",
    "failed",
    "cancelled",
]);
// MIPROv2 configuration
export const MIPROv2ConfigSchema = z.object({
    metric: z.string(),
    num_candidates: z.number().int().positive().optional(),
    init_temperature: z.number().min(0).max(2).optional(),
    track_stats: z.boolean().optional(),
    teacher_settings: z
        .object({
        model: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        max_tokens: z.number().int().positive().optional(),
    })
        .optional(),
    prompt_model: z.string().optional(),
    task_model: z.string().optional(),
    num_trials: z.number().int().positive().optional(),
    max_bootstrapped_demos: z.number().int().nonnegative().optional(),
    max_labeled_demos: z.number().int().nonnegative().optional(),
    minibatch: z.boolean().optional(),
    minibatch_size: z.number().int().positive().optional(),
    minibatch_full_eval_steps: z.number().int().positive().optional(),
});
// Bootstrap configuration
export const BootstrapConfigSchema = z.object({
    metric: z.string().optional(),
    max_bootstrapped_demos: z.number().int().nonnegative().optional(),
    max_labeled_demos: z.number().int().nonnegative().optional(),
    max_rounds: z.number().int().positive().optional(),
    teacher_settings: z
        .object({
        model: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
    })
        .optional(),
});
// Generic optimization configuration
export const OptimizationConfigSchema = z.object({
    optimizer: OptimizerTypeSchema,
    metric: z.string().optional(),
    max_iterations: z.number().int().positive().optional(),
    timeout_seconds: z.number().int().positive().optional(),
    early_stopping: z
        .object({
        enabled: z.boolean(),
        patience: z.number().int().positive().optional(),
        min_delta: z.number().min(0).optional(),
    })
        .optional(),
    model_config: z
        .object({
        model: z.string(),
        temperature: z.number().min(0).max(2).optional(),
        max_tokens: z.number().int().positive().optional(),
        top_p: z.number().min(0).max(1).optional(),
    })
        .optional(),
    dataset_config: z
        .object({
        train_size: z.number().int().nonnegative().optional(),
        val_size: z.number().int().nonnegative().optional(),
        test_size: z.number().int().nonnegative().optional(),
        shuffle: z.boolean().optional(),
        seed: z.number().int().optional(),
    })
        .optional(),
    miprov2: MIPROv2ConfigSchema.optional(),
    bootstrap: BootstrapConfigSchema.optional(),
}).passthrough(); // Allow additional custom configs
// Create optimization run request
export const CreateOptimizationRunSchema = z.object({
    projectId: z.string().min(1),
    runName: z.string().min(1).max(255),
    optimizerType: OptimizerTypeSchema,
    config: OptimizationConfigSchema,
    initialScore: z.number().min(0).max(1).optional(),
    metadata: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
});
// Update optimization run request
export const UpdateOptimizationRunSchema = z.object({
    status: OptimizationStatusSchema.optional(),
    endTime: z.string().datetime().optional(),
    finalScore: z.number().min(0).max(1).optional(),
    iterations: z.number().int().nonnegative().optional(),
    samplesEvaluated: z.number().int().nonnegative().optional(),
    successfulSamples: z.number().int().nonnegative().optional(),
    failedSamples: z.number().int().nonnegative().optional(),
    totalTokens: z.number().int().nonnegative().optional(),
    totalCostUsd: z.number().min(0).optional(),
    bestProgram: z.any().optional(),
    finalProgram: z.any().optional(),
    evaluationResults: z.any().optional(),
    errorMessage: z.string().optional(),
    errorStack: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
});
// Create optimization iteration request
export const CreateOptimizationIterationSchema = z.object({
    runId: z.string().uuid(),
    iteration: z.number().int().nonnegative(),
    score: z.number().min(0).max(1),
    params: z.record(z.any()),
    program: z.any().optional(),
    samplesInIteration: z.number().int().nonnegative().optional(),
    successfulSamples: z.number().int().nonnegative().optional(),
    avgScore: z.number().min(0).max(1).optional(),
    stdDev: z.number().min(0).optional(),
    iterationStartTime: z.string().datetime().optional(),
    iterationEndTime: z.string().datetime().optional(),
    durationMs: z.number().int().nonnegative().optional(),
    tokensUsed: z.number().int().nonnegative().optional(),
    costUsd: z.number().min(0).optional(),
    metadata: z.record(z.any()).optional(),
});
// Create optimization sample request
export const CreateOptimizationSampleSchema = z.object({
    runId: z.string().uuid(),
    iterationId: z.string().uuid().optional(),
    iteration: z.number().int().nonnegative(),
    sampleIndex: z.number().int().nonnegative(),
    input: z.any(),
    predictedOutput: z.any().optional(),
    expectedOutput: z.any().optional(),
    score: z.number().min(0).max(1).optional(),
    isCorrect: z.boolean().optional(),
    programHash: z.string().optional(),
    latencyMs: z.number().int().nonnegative().optional(),
    tokensUsed: z.number().int().nonnegative().optional(),
    costUsd: z.number().min(0).optional(),
    errorMessage: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});
// Query filters for listing optimization runs
export const OptimizationRunFiltersSchema = z.object({
    projectId: z.string().min(1),
    status: z.union([OptimizationStatusSchema, z.array(OptimizationStatusSchema)]).optional(),
    optimizerType: z.union([OptimizerTypeSchema, z.array(OptimizerTypeSchema)]).optional(),
    tags: z.array(z.string()).optional(),
    minScore: z.number().min(0).max(1).optional(),
    maxScore: z.number().min(0).max(1).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.number().int().positive().max(100).default(20),
    offset: z.number().int().nonnegative().default(0),
    orderBy: z.enum(["created_at", "final_score", "improvement", "duration_ms"]).default("created_at"),
    orderDirection: z.enum(["asc", "desc"]).default("desc"),
});
