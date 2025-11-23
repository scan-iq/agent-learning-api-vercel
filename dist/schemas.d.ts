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
        result?: any;
        action?: string | undefined;
    }, {
        step: number;
        thought: string;
        result?: any;
        action?: string | undefined;
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
        result?: any;
        action?: string | undefined;
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
        result?: any;
        action?: string | undefined;
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
export declare const OptimizerTypeSchema: z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>;
export declare const OptimizationStatusSchema: z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>;
export declare const MIPROv2ConfigSchema: z.ZodObject<{
    metric: z.ZodString;
    num_candidates: z.ZodOptional<z.ZodNumber>;
    init_temperature: z.ZodOptional<z.ZodNumber>;
    track_stats: z.ZodOptional<z.ZodBoolean>;
    teacher_settings: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        model?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
    }, {
        model?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
    }>>;
    prompt_model: z.ZodOptional<z.ZodString>;
    task_model: z.ZodOptional<z.ZodString>;
    num_trials: z.ZodOptional<z.ZodNumber>;
    max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
    max_labeled_demos: z.ZodOptional<z.ZodNumber>;
    minibatch: z.ZodOptional<z.ZodBoolean>;
    minibatch_size: z.ZodOptional<z.ZodNumber>;
    minibatch_full_eval_steps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    metric: string;
    num_candidates?: number | undefined;
    init_temperature?: number | undefined;
    track_stats?: boolean | undefined;
    teacher_settings?: {
        model?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
    } | undefined;
    prompt_model?: string | undefined;
    task_model?: string | undefined;
    num_trials?: number | undefined;
    max_bootstrapped_demos?: number | undefined;
    max_labeled_demos?: number | undefined;
    minibatch?: boolean | undefined;
    minibatch_size?: number | undefined;
    minibatch_full_eval_steps?: number | undefined;
}, {
    metric: string;
    num_candidates?: number | undefined;
    init_temperature?: number | undefined;
    track_stats?: boolean | undefined;
    teacher_settings?: {
        model?: string | undefined;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
    } | undefined;
    prompt_model?: string | undefined;
    task_model?: string | undefined;
    num_trials?: number | undefined;
    max_bootstrapped_demos?: number | undefined;
    max_labeled_demos?: number | undefined;
    minibatch?: boolean | undefined;
    minibatch_size?: number | undefined;
    minibatch_full_eval_steps?: number | undefined;
}>;
export declare const BootstrapConfigSchema: z.ZodObject<{
    metric: z.ZodOptional<z.ZodString>;
    max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
    max_labeled_demos: z.ZodOptional<z.ZodNumber>;
    max_rounds: z.ZodOptional<z.ZodNumber>;
    teacher_settings: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        model?: string | undefined;
        temperature?: number | undefined;
    }, {
        model?: string | undefined;
        temperature?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    metric?: string | undefined;
    teacher_settings?: {
        model?: string | undefined;
        temperature?: number | undefined;
    } | undefined;
    max_bootstrapped_demos?: number | undefined;
    max_labeled_demos?: number | undefined;
    max_rounds?: number | undefined;
}, {
    metric?: string | undefined;
    teacher_settings?: {
        model?: string | undefined;
        temperature?: number | undefined;
    } | undefined;
    max_bootstrapped_demos?: number | undefined;
    max_labeled_demos?: number | undefined;
    max_rounds?: number | undefined;
}>;
export declare const OptimizationConfigSchema: z.ZodObject<{
    optimizer: z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>;
    metric: z.ZodOptional<z.ZodString>;
    max_iterations: z.ZodOptional<z.ZodNumber>;
    timeout_seconds: z.ZodOptional<z.ZodNumber>;
    early_stopping: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        patience: z.ZodOptional<z.ZodNumber>;
        min_delta: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        patience?: number | undefined;
        min_delta?: number | undefined;
    }, {
        enabled: boolean;
        patience?: number | undefined;
        min_delta?: number | undefined;
    }>>;
    model_config: z.ZodOptional<z.ZodObject<{
        model: z.ZodString;
        temperature: z.ZodOptional<z.ZodNumber>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
        top_p: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        model: string;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        top_p?: number | undefined;
    }, {
        model: string;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        top_p?: number | undefined;
    }>>;
    dataset_config: z.ZodOptional<z.ZodObject<{
        train_size: z.ZodOptional<z.ZodNumber>;
        val_size: z.ZodOptional<z.ZodNumber>;
        test_size: z.ZodOptional<z.ZodNumber>;
        shuffle: z.ZodOptional<z.ZodBoolean>;
        seed: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        train_size?: number | undefined;
        val_size?: number | undefined;
        test_size?: number | undefined;
        shuffle?: boolean | undefined;
        seed?: number | undefined;
    }, {
        train_size?: number | undefined;
        val_size?: number | undefined;
        test_size?: number | undefined;
        shuffle?: boolean | undefined;
        seed?: number | undefined;
    }>>;
    miprov2: z.ZodOptional<z.ZodObject<{
        metric: z.ZodString;
        num_candidates: z.ZodOptional<z.ZodNumber>;
        init_temperature: z.ZodOptional<z.ZodNumber>;
        track_stats: z.ZodOptional<z.ZodBoolean>;
        teacher_settings: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            temperature: z.ZodOptional<z.ZodNumber>;
            max_tokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        }, {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        }>>;
        prompt_model: z.ZodOptional<z.ZodString>;
        task_model: z.ZodOptional<z.ZodString>;
        num_trials: z.ZodOptional<z.ZodNumber>;
        max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
        max_labeled_demos: z.ZodOptional<z.ZodNumber>;
        minibatch: z.ZodOptional<z.ZodBoolean>;
        minibatch_size: z.ZodOptional<z.ZodNumber>;
        minibatch_full_eval_steps: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        metric: string;
        num_candidates?: number | undefined;
        init_temperature?: number | undefined;
        track_stats?: boolean | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        } | undefined;
        prompt_model?: string | undefined;
        task_model?: string | undefined;
        num_trials?: number | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        minibatch?: boolean | undefined;
        minibatch_size?: number | undefined;
        minibatch_full_eval_steps?: number | undefined;
    }, {
        metric: string;
        num_candidates?: number | undefined;
        init_temperature?: number | undefined;
        track_stats?: boolean | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        } | undefined;
        prompt_model?: string | undefined;
        task_model?: string | undefined;
        num_trials?: number | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        minibatch?: boolean | undefined;
        minibatch_size?: number | undefined;
        minibatch_full_eval_steps?: number | undefined;
    }>>;
    bootstrap: z.ZodOptional<z.ZodObject<{
        metric: z.ZodOptional<z.ZodString>;
        max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
        max_labeled_demos: z.ZodOptional<z.ZodNumber>;
        max_rounds: z.ZodOptional<z.ZodNumber>;
        teacher_settings: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            temperature: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model?: string | undefined;
            temperature?: number | undefined;
        }, {
            model?: string | undefined;
            temperature?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        metric?: string | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
        } | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        max_rounds?: number | undefined;
    }, {
        metric?: string | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
        } | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        max_rounds?: number | undefined;
    }>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    optimizer: z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>;
    metric: z.ZodOptional<z.ZodString>;
    max_iterations: z.ZodOptional<z.ZodNumber>;
    timeout_seconds: z.ZodOptional<z.ZodNumber>;
    early_stopping: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        patience: z.ZodOptional<z.ZodNumber>;
        min_delta: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        patience?: number | undefined;
        min_delta?: number | undefined;
    }, {
        enabled: boolean;
        patience?: number | undefined;
        min_delta?: number | undefined;
    }>>;
    model_config: z.ZodOptional<z.ZodObject<{
        model: z.ZodString;
        temperature: z.ZodOptional<z.ZodNumber>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
        top_p: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        model: string;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        top_p?: number | undefined;
    }, {
        model: string;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        top_p?: number | undefined;
    }>>;
    dataset_config: z.ZodOptional<z.ZodObject<{
        train_size: z.ZodOptional<z.ZodNumber>;
        val_size: z.ZodOptional<z.ZodNumber>;
        test_size: z.ZodOptional<z.ZodNumber>;
        shuffle: z.ZodOptional<z.ZodBoolean>;
        seed: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        train_size?: number | undefined;
        val_size?: number | undefined;
        test_size?: number | undefined;
        shuffle?: boolean | undefined;
        seed?: number | undefined;
    }, {
        train_size?: number | undefined;
        val_size?: number | undefined;
        test_size?: number | undefined;
        shuffle?: boolean | undefined;
        seed?: number | undefined;
    }>>;
    miprov2: z.ZodOptional<z.ZodObject<{
        metric: z.ZodString;
        num_candidates: z.ZodOptional<z.ZodNumber>;
        init_temperature: z.ZodOptional<z.ZodNumber>;
        track_stats: z.ZodOptional<z.ZodBoolean>;
        teacher_settings: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            temperature: z.ZodOptional<z.ZodNumber>;
            max_tokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        }, {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        }>>;
        prompt_model: z.ZodOptional<z.ZodString>;
        task_model: z.ZodOptional<z.ZodString>;
        num_trials: z.ZodOptional<z.ZodNumber>;
        max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
        max_labeled_demos: z.ZodOptional<z.ZodNumber>;
        minibatch: z.ZodOptional<z.ZodBoolean>;
        minibatch_size: z.ZodOptional<z.ZodNumber>;
        minibatch_full_eval_steps: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        metric: string;
        num_candidates?: number | undefined;
        init_temperature?: number | undefined;
        track_stats?: boolean | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        } | undefined;
        prompt_model?: string | undefined;
        task_model?: string | undefined;
        num_trials?: number | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        minibatch?: boolean | undefined;
        minibatch_size?: number | undefined;
        minibatch_full_eval_steps?: number | undefined;
    }, {
        metric: string;
        num_candidates?: number | undefined;
        init_temperature?: number | undefined;
        track_stats?: boolean | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        } | undefined;
        prompt_model?: string | undefined;
        task_model?: string | undefined;
        num_trials?: number | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        minibatch?: boolean | undefined;
        minibatch_size?: number | undefined;
        minibatch_full_eval_steps?: number | undefined;
    }>>;
    bootstrap: z.ZodOptional<z.ZodObject<{
        metric: z.ZodOptional<z.ZodString>;
        max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
        max_labeled_demos: z.ZodOptional<z.ZodNumber>;
        max_rounds: z.ZodOptional<z.ZodNumber>;
        teacher_settings: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            temperature: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model?: string | undefined;
            temperature?: number | undefined;
        }, {
            model?: string | undefined;
            temperature?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        metric?: string | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
        } | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        max_rounds?: number | undefined;
    }, {
        metric?: string | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
        } | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        max_rounds?: number | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    optimizer: z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>;
    metric: z.ZodOptional<z.ZodString>;
    max_iterations: z.ZodOptional<z.ZodNumber>;
    timeout_seconds: z.ZodOptional<z.ZodNumber>;
    early_stopping: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        patience: z.ZodOptional<z.ZodNumber>;
        min_delta: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        patience?: number | undefined;
        min_delta?: number | undefined;
    }, {
        enabled: boolean;
        patience?: number | undefined;
        min_delta?: number | undefined;
    }>>;
    model_config: z.ZodOptional<z.ZodObject<{
        model: z.ZodString;
        temperature: z.ZodOptional<z.ZodNumber>;
        max_tokens: z.ZodOptional<z.ZodNumber>;
        top_p: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        model: string;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        top_p?: number | undefined;
    }, {
        model: string;
        temperature?: number | undefined;
        max_tokens?: number | undefined;
        top_p?: number | undefined;
    }>>;
    dataset_config: z.ZodOptional<z.ZodObject<{
        train_size: z.ZodOptional<z.ZodNumber>;
        val_size: z.ZodOptional<z.ZodNumber>;
        test_size: z.ZodOptional<z.ZodNumber>;
        shuffle: z.ZodOptional<z.ZodBoolean>;
        seed: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        train_size?: number | undefined;
        val_size?: number | undefined;
        test_size?: number | undefined;
        shuffle?: boolean | undefined;
        seed?: number | undefined;
    }, {
        train_size?: number | undefined;
        val_size?: number | undefined;
        test_size?: number | undefined;
        shuffle?: boolean | undefined;
        seed?: number | undefined;
    }>>;
    miprov2: z.ZodOptional<z.ZodObject<{
        metric: z.ZodString;
        num_candidates: z.ZodOptional<z.ZodNumber>;
        init_temperature: z.ZodOptional<z.ZodNumber>;
        track_stats: z.ZodOptional<z.ZodBoolean>;
        teacher_settings: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            temperature: z.ZodOptional<z.ZodNumber>;
            max_tokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        }, {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        }>>;
        prompt_model: z.ZodOptional<z.ZodString>;
        task_model: z.ZodOptional<z.ZodString>;
        num_trials: z.ZodOptional<z.ZodNumber>;
        max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
        max_labeled_demos: z.ZodOptional<z.ZodNumber>;
        minibatch: z.ZodOptional<z.ZodBoolean>;
        minibatch_size: z.ZodOptional<z.ZodNumber>;
        minibatch_full_eval_steps: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        metric: string;
        num_candidates?: number | undefined;
        init_temperature?: number | undefined;
        track_stats?: boolean | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        } | undefined;
        prompt_model?: string | undefined;
        task_model?: string | undefined;
        num_trials?: number | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        minibatch?: boolean | undefined;
        minibatch_size?: number | undefined;
        minibatch_full_eval_steps?: number | undefined;
    }, {
        metric: string;
        num_candidates?: number | undefined;
        init_temperature?: number | undefined;
        track_stats?: boolean | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
        } | undefined;
        prompt_model?: string | undefined;
        task_model?: string | undefined;
        num_trials?: number | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        minibatch?: boolean | undefined;
        minibatch_size?: number | undefined;
        minibatch_full_eval_steps?: number | undefined;
    }>>;
    bootstrap: z.ZodOptional<z.ZodObject<{
        metric: z.ZodOptional<z.ZodString>;
        max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
        max_labeled_demos: z.ZodOptional<z.ZodNumber>;
        max_rounds: z.ZodOptional<z.ZodNumber>;
        teacher_settings: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            temperature: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model?: string | undefined;
            temperature?: number | undefined;
        }, {
            model?: string | undefined;
            temperature?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        metric?: string | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
        } | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        max_rounds?: number | undefined;
    }, {
        metric?: string | undefined;
        teacher_settings?: {
            model?: string | undefined;
            temperature?: number | undefined;
        } | undefined;
        max_bootstrapped_demos?: number | undefined;
        max_labeled_demos?: number | undefined;
        max_rounds?: number | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">>;
export declare const CreateOptimizationRunSchema: z.ZodObject<{
    projectId: z.ZodString;
    runName: z.ZodString;
    optimizerType: z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>;
    config: z.ZodObject<{
        optimizer: z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>;
        metric: z.ZodOptional<z.ZodString>;
        max_iterations: z.ZodOptional<z.ZodNumber>;
        timeout_seconds: z.ZodOptional<z.ZodNumber>;
        early_stopping: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            patience: z.ZodOptional<z.ZodNumber>;
            min_delta: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            patience?: number | undefined;
            min_delta?: number | undefined;
        }, {
            enabled: boolean;
            patience?: number | undefined;
            min_delta?: number | undefined;
        }>>;
        model_config: z.ZodOptional<z.ZodObject<{
            model: z.ZodString;
            temperature: z.ZodOptional<z.ZodNumber>;
            max_tokens: z.ZodOptional<z.ZodNumber>;
            top_p: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model: string;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
            top_p?: number | undefined;
        }, {
            model: string;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
            top_p?: number | undefined;
        }>>;
        dataset_config: z.ZodOptional<z.ZodObject<{
            train_size: z.ZodOptional<z.ZodNumber>;
            val_size: z.ZodOptional<z.ZodNumber>;
            test_size: z.ZodOptional<z.ZodNumber>;
            shuffle: z.ZodOptional<z.ZodBoolean>;
            seed: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            train_size?: number | undefined;
            val_size?: number | undefined;
            test_size?: number | undefined;
            shuffle?: boolean | undefined;
            seed?: number | undefined;
        }, {
            train_size?: number | undefined;
            val_size?: number | undefined;
            test_size?: number | undefined;
            shuffle?: boolean | undefined;
            seed?: number | undefined;
        }>>;
        miprov2: z.ZodOptional<z.ZodObject<{
            metric: z.ZodString;
            num_candidates: z.ZodOptional<z.ZodNumber>;
            init_temperature: z.ZodOptional<z.ZodNumber>;
            track_stats: z.ZodOptional<z.ZodBoolean>;
            teacher_settings: z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
                temperature: z.ZodOptional<z.ZodNumber>;
                max_tokens: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            }, {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            }>>;
            prompt_model: z.ZodOptional<z.ZodString>;
            task_model: z.ZodOptional<z.ZodString>;
            num_trials: z.ZodOptional<z.ZodNumber>;
            max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
            max_labeled_demos: z.ZodOptional<z.ZodNumber>;
            minibatch: z.ZodOptional<z.ZodBoolean>;
            minibatch_size: z.ZodOptional<z.ZodNumber>;
            minibatch_full_eval_steps: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            metric: string;
            num_candidates?: number | undefined;
            init_temperature?: number | undefined;
            track_stats?: boolean | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            } | undefined;
            prompt_model?: string | undefined;
            task_model?: string | undefined;
            num_trials?: number | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            minibatch?: boolean | undefined;
            minibatch_size?: number | undefined;
            minibatch_full_eval_steps?: number | undefined;
        }, {
            metric: string;
            num_candidates?: number | undefined;
            init_temperature?: number | undefined;
            track_stats?: boolean | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            } | undefined;
            prompt_model?: string | undefined;
            task_model?: string | undefined;
            num_trials?: number | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            minibatch?: boolean | undefined;
            minibatch_size?: number | undefined;
            minibatch_full_eval_steps?: number | undefined;
        }>>;
        bootstrap: z.ZodOptional<z.ZodObject<{
            metric: z.ZodOptional<z.ZodString>;
            max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
            max_labeled_demos: z.ZodOptional<z.ZodNumber>;
            max_rounds: z.ZodOptional<z.ZodNumber>;
            teacher_settings: z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
                temperature: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                model?: string | undefined;
                temperature?: number | undefined;
            }, {
                model?: string | undefined;
                temperature?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            metric?: string | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
            } | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            max_rounds?: number | undefined;
        }, {
            metric?: string | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
            } | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            max_rounds?: number | undefined;
        }>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        optimizer: z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>;
        metric: z.ZodOptional<z.ZodString>;
        max_iterations: z.ZodOptional<z.ZodNumber>;
        timeout_seconds: z.ZodOptional<z.ZodNumber>;
        early_stopping: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            patience: z.ZodOptional<z.ZodNumber>;
            min_delta: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            patience?: number | undefined;
            min_delta?: number | undefined;
        }, {
            enabled: boolean;
            patience?: number | undefined;
            min_delta?: number | undefined;
        }>>;
        model_config: z.ZodOptional<z.ZodObject<{
            model: z.ZodString;
            temperature: z.ZodOptional<z.ZodNumber>;
            max_tokens: z.ZodOptional<z.ZodNumber>;
            top_p: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model: string;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
            top_p?: number | undefined;
        }, {
            model: string;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
            top_p?: number | undefined;
        }>>;
        dataset_config: z.ZodOptional<z.ZodObject<{
            train_size: z.ZodOptional<z.ZodNumber>;
            val_size: z.ZodOptional<z.ZodNumber>;
            test_size: z.ZodOptional<z.ZodNumber>;
            shuffle: z.ZodOptional<z.ZodBoolean>;
            seed: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            train_size?: number | undefined;
            val_size?: number | undefined;
            test_size?: number | undefined;
            shuffle?: boolean | undefined;
            seed?: number | undefined;
        }, {
            train_size?: number | undefined;
            val_size?: number | undefined;
            test_size?: number | undefined;
            shuffle?: boolean | undefined;
            seed?: number | undefined;
        }>>;
        miprov2: z.ZodOptional<z.ZodObject<{
            metric: z.ZodString;
            num_candidates: z.ZodOptional<z.ZodNumber>;
            init_temperature: z.ZodOptional<z.ZodNumber>;
            track_stats: z.ZodOptional<z.ZodBoolean>;
            teacher_settings: z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
                temperature: z.ZodOptional<z.ZodNumber>;
                max_tokens: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            }, {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            }>>;
            prompt_model: z.ZodOptional<z.ZodString>;
            task_model: z.ZodOptional<z.ZodString>;
            num_trials: z.ZodOptional<z.ZodNumber>;
            max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
            max_labeled_demos: z.ZodOptional<z.ZodNumber>;
            minibatch: z.ZodOptional<z.ZodBoolean>;
            minibatch_size: z.ZodOptional<z.ZodNumber>;
            minibatch_full_eval_steps: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            metric: string;
            num_candidates?: number | undefined;
            init_temperature?: number | undefined;
            track_stats?: boolean | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            } | undefined;
            prompt_model?: string | undefined;
            task_model?: string | undefined;
            num_trials?: number | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            minibatch?: boolean | undefined;
            minibatch_size?: number | undefined;
            minibatch_full_eval_steps?: number | undefined;
        }, {
            metric: string;
            num_candidates?: number | undefined;
            init_temperature?: number | undefined;
            track_stats?: boolean | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            } | undefined;
            prompt_model?: string | undefined;
            task_model?: string | undefined;
            num_trials?: number | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            minibatch?: boolean | undefined;
            minibatch_size?: number | undefined;
            minibatch_full_eval_steps?: number | undefined;
        }>>;
        bootstrap: z.ZodOptional<z.ZodObject<{
            metric: z.ZodOptional<z.ZodString>;
            max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
            max_labeled_demos: z.ZodOptional<z.ZodNumber>;
            max_rounds: z.ZodOptional<z.ZodNumber>;
            teacher_settings: z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
                temperature: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                model?: string | undefined;
                temperature?: number | undefined;
            }, {
                model?: string | undefined;
                temperature?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            metric?: string | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
            } | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            max_rounds?: number | undefined;
        }, {
            metric?: string | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
            } | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            max_rounds?: number | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        optimizer: z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>;
        metric: z.ZodOptional<z.ZodString>;
        max_iterations: z.ZodOptional<z.ZodNumber>;
        timeout_seconds: z.ZodOptional<z.ZodNumber>;
        early_stopping: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            patience: z.ZodOptional<z.ZodNumber>;
            min_delta: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            patience?: number | undefined;
            min_delta?: number | undefined;
        }, {
            enabled: boolean;
            patience?: number | undefined;
            min_delta?: number | undefined;
        }>>;
        model_config: z.ZodOptional<z.ZodObject<{
            model: z.ZodString;
            temperature: z.ZodOptional<z.ZodNumber>;
            max_tokens: z.ZodOptional<z.ZodNumber>;
            top_p: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            model: string;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
            top_p?: number | undefined;
        }, {
            model: string;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
            top_p?: number | undefined;
        }>>;
        dataset_config: z.ZodOptional<z.ZodObject<{
            train_size: z.ZodOptional<z.ZodNumber>;
            val_size: z.ZodOptional<z.ZodNumber>;
            test_size: z.ZodOptional<z.ZodNumber>;
            shuffle: z.ZodOptional<z.ZodBoolean>;
            seed: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            train_size?: number | undefined;
            val_size?: number | undefined;
            test_size?: number | undefined;
            shuffle?: boolean | undefined;
            seed?: number | undefined;
        }, {
            train_size?: number | undefined;
            val_size?: number | undefined;
            test_size?: number | undefined;
            shuffle?: boolean | undefined;
            seed?: number | undefined;
        }>>;
        miprov2: z.ZodOptional<z.ZodObject<{
            metric: z.ZodString;
            num_candidates: z.ZodOptional<z.ZodNumber>;
            init_temperature: z.ZodOptional<z.ZodNumber>;
            track_stats: z.ZodOptional<z.ZodBoolean>;
            teacher_settings: z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
                temperature: z.ZodOptional<z.ZodNumber>;
                max_tokens: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            }, {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            }>>;
            prompt_model: z.ZodOptional<z.ZodString>;
            task_model: z.ZodOptional<z.ZodString>;
            num_trials: z.ZodOptional<z.ZodNumber>;
            max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
            max_labeled_demos: z.ZodOptional<z.ZodNumber>;
            minibatch: z.ZodOptional<z.ZodBoolean>;
            minibatch_size: z.ZodOptional<z.ZodNumber>;
            minibatch_full_eval_steps: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            metric: string;
            num_candidates?: number | undefined;
            init_temperature?: number | undefined;
            track_stats?: boolean | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            } | undefined;
            prompt_model?: string | undefined;
            task_model?: string | undefined;
            num_trials?: number | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            minibatch?: boolean | undefined;
            minibatch_size?: number | undefined;
            minibatch_full_eval_steps?: number | undefined;
        }, {
            metric: string;
            num_candidates?: number | undefined;
            init_temperature?: number | undefined;
            track_stats?: boolean | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            } | undefined;
            prompt_model?: string | undefined;
            task_model?: string | undefined;
            num_trials?: number | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            minibatch?: boolean | undefined;
            minibatch_size?: number | undefined;
            minibatch_full_eval_steps?: number | undefined;
        }>>;
        bootstrap: z.ZodOptional<z.ZodObject<{
            metric: z.ZodOptional<z.ZodString>;
            max_bootstrapped_demos: z.ZodOptional<z.ZodNumber>;
            max_labeled_demos: z.ZodOptional<z.ZodNumber>;
            max_rounds: z.ZodOptional<z.ZodNumber>;
            teacher_settings: z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
                temperature: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                model?: string | undefined;
                temperature?: number | undefined;
            }, {
                model?: string | undefined;
                temperature?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            metric?: string | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
            } | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            max_rounds?: number | undefined;
        }, {
            metric?: string | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
            } | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            max_rounds?: number | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">>;
    initialScore: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    runName: string;
    optimizerType: "custom" | "miprov2" | "bootstrap" | "copro" | "knn" | "random";
    config: {
        optimizer: "custom" | "miprov2" | "bootstrap" | "copro" | "knn" | "random";
        miprov2?: {
            metric: string;
            num_candidates?: number | undefined;
            init_temperature?: number | undefined;
            track_stats?: boolean | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            } | undefined;
            prompt_model?: string | undefined;
            task_model?: string | undefined;
            num_trials?: number | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            minibatch?: boolean | undefined;
            minibatch_size?: number | undefined;
            minibatch_full_eval_steps?: number | undefined;
        } | undefined;
        bootstrap?: {
            metric?: string | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
            } | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            max_rounds?: number | undefined;
        } | undefined;
        metric?: string | undefined;
        max_iterations?: number | undefined;
        timeout_seconds?: number | undefined;
        early_stopping?: {
            enabled: boolean;
            patience?: number | undefined;
            min_delta?: number | undefined;
        } | undefined;
        model_config?: {
            model: string;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
            top_p?: number | undefined;
        } | undefined;
        dataset_config?: {
            train_size?: number | undefined;
            val_size?: number | undefined;
            test_size?: number | undefined;
            shuffle?: boolean | undefined;
            seed?: number | undefined;
        } | undefined;
    } & {
        [k: string]: unknown;
    };
    metadata?: Record<string, any> | undefined;
    initialScore?: number | undefined;
    tags?: string[] | undefined;
}, {
    projectId: string;
    runName: string;
    optimizerType: "custom" | "miprov2" | "bootstrap" | "copro" | "knn" | "random";
    config: {
        optimizer: "custom" | "miprov2" | "bootstrap" | "copro" | "knn" | "random";
        miprov2?: {
            metric: string;
            num_candidates?: number | undefined;
            init_temperature?: number | undefined;
            track_stats?: boolean | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
                max_tokens?: number | undefined;
            } | undefined;
            prompt_model?: string | undefined;
            task_model?: string | undefined;
            num_trials?: number | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            minibatch?: boolean | undefined;
            minibatch_size?: number | undefined;
            minibatch_full_eval_steps?: number | undefined;
        } | undefined;
        bootstrap?: {
            metric?: string | undefined;
            teacher_settings?: {
                model?: string | undefined;
                temperature?: number | undefined;
            } | undefined;
            max_bootstrapped_demos?: number | undefined;
            max_labeled_demos?: number | undefined;
            max_rounds?: number | undefined;
        } | undefined;
        metric?: string | undefined;
        max_iterations?: number | undefined;
        timeout_seconds?: number | undefined;
        early_stopping?: {
            enabled: boolean;
            patience?: number | undefined;
            min_delta?: number | undefined;
        } | undefined;
        model_config?: {
            model: string;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
            top_p?: number | undefined;
        } | undefined;
        dataset_config?: {
            train_size?: number | undefined;
            val_size?: number | undefined;
            test_size?: number | undefined;
            shuffle?: boolean | undefined;
            seed?: number | undefined;
        } | undefined;
    } & {
        [k: string]: unknown;
    };
    metadata?: Record<string, any> | undefined;
    initialScore?: number | undefined;
    tags?: string[] | undefined;
}>;
export declare const UpdateOptimizationRunSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>>;
    endTime: z.ZodOptional<z.ZodString>;
    finalScore: z.ZodOptional<z.ZodNumber>;
    iterations: z.ZodOptional<z.ZodNumber>;
    samplesEvaluated: z.ZodOptional<z.ZodNumber>;
    successfulSamples: z.ZodOptional<z.ZodNumber>;
    failedSamples: z.ZodOptional<z.ZodNumber>;
    totalTokens: z.ZodOptional<z.ZodNumber>;
    totalCostUsd: z.ZodOptional<z.ZodNumber>;
    bestProgram: z.ZodOptional<z.ZodAny>;
    finalProgram: z.ZodOptional<z.ZodAny>;
    evaluationResults: z.ZodOptional<z.ZodAny>;
    errorMessage: z.ZodOptional<z.ZodString>;
    errorStack: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    status?: "pending" | "running" | "completed" | "failed" | "cancelled" | undefined;
    metadata?: Record<string, any> | undefined;
    totalCostUsd?: number | undefined;
    totalTokens?: number | undefined;
    tags?: string[] | undefined;
    endTime?: string | undefined;
    finalScore?: number | undefined;
    iterations?: number | undefined;
    samplesEvaluated?: number | undefined;
    successfulSamples?: number | undefined;
    failedSamples?: number | undefined;
    bestProgram?: any;
    finalProgram?: any;
    evaluationResults?: any;
    errorMessage?: string | undefined;
    errorStack?: string | undefined;
}, {
    status?: "pending" | "running" | "completed" | "failed" | "cancelled" | undefined;
    metadata?: Record<string, any> | undefined;
    totalCostUsd?: number | undefined;
    totalTokens?: number | undefined;
    tags?: string[] | undefined;
    endTime?: string | undefined;
    finalScore?: number | undefined;
    iterations?: number | undefined;
    samplesEvaluated?: number | undefined;
    successfulSamples?: number | undefined;
    failedSamples?: number | undefined;
    bestProgram?: any;
    finalProgram?: any;
    evaluationResults?: any;
    errorMessage?: string | undefined;
    errorStack?: string | undefined;
}>;
export declare const CreateOptimizationIterationSchema: z.ZodObject<{
    runId: z.ZodString;
    iteration: z.ZodNumber;
    score: z.ZodNumber;
    params: z.ZodRecord<z.ZodString, z.ZodAny>;
    program: z.ZodOptional<z.ZodAny>;
    samplesInIteration: z.ZodOptional<z.ZodNumber>;
    successfulSamples: z.ZodOptional<z.ZodNumber>;
    avgScore: z.ZodOptional<z.ZodNumber>;
    stdDev: z.ZodOptional<z.ZodNumber>;
    iterationStartTime: z.ZodOptional<z.ZodString>;
    iterationEndTime: z.ZodOptional<z.ZodString>;
    durationMs: z.ZodOptional<z.ZodNumber>;
    tokensUsed: z.ZodOptional<z.ZodNumber>;
    costUsd: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, any>;
    runId: string;
    iteration: number;
    score: number;
    metadata?: Record<string, any> | undefined;
    costUsd?: number | undefined;
    successfulSamples?: number | undefined;
    program?: any;
    samplesInIteration?: number | undefined;
    avgScore?: number | undefined;
    stdDev?: number | undefined;
    iterationStartTime?: string | undefined;
    iterationEndTime?: string | undefined;
    durationMs?: number | undefined;
    tokensUsed?: number | undefined;
}, {
    params: Record<string, any>;
    runId: string;
    iteration: number;
    score: number;
    metadata?: Record<string, any> | undefined;
    costUsd?: number | undefined;
    successfulSamples?: number | undefined;
    program?: any;
    samplesInIteration?: number | undefined;
    avgScore?: number | undefined;
    stdDev?: number | undefined;
    iterationStartTime?: string | undefined;
    iterationEndTime?: string | undefined;
    durationMs?: number | undefined;
    tokensUsed?: number | undefined;
}>;
export declare const CreateOptimizationSampleSchema: z.ZodObject<{
    runId: z.ZodString;
    iterationId: z.ZodOptional<z.ZodString>;
    iteration: z.ZodNumber;
    sampleIndex: z.ZodNumber;
    input: z.ZodAny;
    predictedOutput: z.ZodOptional<z.ZodAny>;
    expectedOutput: z.ZodOptional<z.ZodAny>;
    score: z.ZodOptional<z.ZodNumber>;
    isCorrect: z.ZodOptional<z.ZodBoolean>;
    programHash: z.ZodOptional<z.ZodString>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    tokensUsed: z.ZodOptional<z.ZodNumber>;
    costUsd: z.ZodOptional<z.ZodNumber>;
    errorMessage: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    runId: string;
    iteration: number;
    sampleIndex: number;
    metadata?: Record<string, any> | undefined;
    input?: any;
    latencyMs?: number | undefined;
    costUsd?: number | undefined;
    errorMessage?: string | undefined;
    score?: number | undefined;
    tokensUsed?: number | undefined;
    iterationId?: string | undefined;
    predictedOutput?: any;
    expectedOutput?: any;
    isCorrect?: boolean | undefined;
    programHash?: string | undefined;
}, {
    runId: string;
    iteration: number;
    sampleIndex: number;
    metadata?: Record<string, any> | undefined;
    input?: any;
    latencyMs?: number | undefined;
    costUsd?: number | undefined;
    errorMessage?: string | undefined;
    score?: number | undefined;
    tokensUsed?: number | undefined;
    iterationId?: string | undefined;
    predictedOutput?: any;
    expectedOutput?: any;
    isCorrect?: boolean | undefined;
    programHash?: string | undefined;
}>;
export declare const OptimizationRunFiltersSchema: z.ZodObject<{
    projectId: z.ZodString;
    status: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>, z.ZodArray<z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>, "many">]>>;
    optimizerType: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>, z.ZodArray<z.ZodEnum<["miprov2", "bootstrap", "copro", "knn", "random", "custom"]>, "many">]>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    minScore: z.ZodOptional<z.ZodNumber>;
    maxScore: z.ZodOptional<z.ZodNumber>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    orderBy: z.ZodDefault<z.ZodEnum<["created_at", "final_score", "improvement", "duration_ms"]>>;
    orderDirection: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    projectId: string;
    limit: number;
    orderBy: "created_at" | "duration_ms" | "final_score" | "improvement";
    offset: number;
    orderDirection: "asc" | "desc";
    status?: "pending" | "running" | "completed" | "failed" | "cancelled" | ("pending" | "running" | "completed" | "failed" | "cancelled")[] | undefined;
    optimizerType?: "custom" | "miprov2" | "bootstrap" | "copro" | "knn" | "random" | ("custom" | "miprov2" | "bootstrap" | "copro" | "knn" | "random")[] | undefined;
    tags?: string[] | undefined;
    minScore?: number | undefined;
    maxScore?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    projectId: string;
    status?: "pending" | "running" | "completed" | "failed" | "cancelled" | ("pending" | "running" | "completed" | "failed" | "cancelled")[] | undefined;
    limit?: number | undefined;
    orderBy?: "created_at" | "duration_ms" | "final_score" | "improvement" | undefined;
    optimizerType?: "custom" | "miprov2" | "bootstrap" | "copro" | "knn" | "random" | ("custom" | "miprov2" | "bootstrap" | "copro" | "knn" | "random")[] | undefined;
    tags?: string[] | undefined;
    minScore?: number | undefined;
    maxScore?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    offset?: number | undefined;
    orderDirection?: "asc" | "desc" | undefined;
}>;
export type CreateOptimizationRunInput = z.infer<typeof CreateOptimizationRunSchema>;
export type UpdateOptimizationRunInput = z.infer<typeof UpdateOptimizationRunSchema>;
export type CreateOptimizationIterationInput = z.infer<typeof CreateOptimizationIterationSchema>;
export type CreateOptimizationSampleInput = z.infer<typeof CreateOptimizationSampleSchema>;
export type OptimizationRunFiltersInput = z.infer<typeof OptimizationRunFiltersSchema>;
//# sourceMappingURL=schemas.d.ts.map