/**
 * TypeScript types for DSPy optimization tracking
 * Generated from database schema: migrations/001_optimization_runs.sql
 *
 * These types match the Supabase PostgreSQL schema exactly
 */
export type OptimizationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type OptimizerType = 'miprov2' | 'bootstrap' | 'copro' | 'knn' | 'random' | 'custom';
/**
 * Database row type for optimization_runs table
 */
export interface OptimizationRunRow {
    id: string;
    project_id: string;
    run_name: string;
    optimizer_type: string;
    status: OptimizationStatus;
    config: Record<string, any>;
    start_time: string;
    end_time: string | null;
    duration_ms: number | null;
    initial_score: number | null;
    final_score: number | null;
    best_score: number | null;
    improvement: number | null;
    improvement_pct: number | null;
    iterations: number;
    samples_evaluated: number;
    successful_samples: number;
    failed_samples: number;
    total_tokens: number | null;
    total_cost_usd: number | null;
    avg_latency_ms: number | null;
    best_program: Record<string, any> | null;
    final_program: Record<string, any> | null;
    evaluation_results: Record<string, any> | null;
    error_message: string | null;
    error_stack: string | null;
    metadata: Record<string, any>;
    tags: string[];
    created_at: string;
    updated_at: string;
}
/**
 * Database row type for optimization_iterations table
 */
export interface OptimizationIterationRow {
    id: string;
    run_id: string;
    iteration: number;
    score: number;
    is_best: boolean;
    params: Record<string, any>;
    program: Record<string, any> | null;
    samples_in_iteration: number;
    successful_samples: number;
    avg_score: number | null;
    std_dev: number | null;
    iteration_start_time: string;
    iteration_end_time: string | null;
    duration_ms: number | null;
    tokens_used: number | null;
    cost_usd: number | null;
    metadata: Record<string, any>;
    created_at: string;
}
/**
 * Database row type for optimization_samples table
 */
export interface OptimizationSampleRow {
    id: string;
    run_id: string;
    iteration_id: string | null;
    iteration: number;
    sample_index: number;
    input: Record<string, any>;
    predicted_output: Record<string, any> | null;
    expected_output: Record<string, any> | null;
    score: number | null;
    is_correct: boolean | null;
    program_hash: string | null;
    latency_ms: number | null;
    tokens_used: number | null;
    cost_usd: number | null;
    error_message: string | null;
    metadata: Record<string, any>;
    created_at: string;
}
/**
 * Materialized view type for optimization_run_analytics
 */
export interface OptimizationRunAnalyticsRow {
    project_id: string;
    optimizer_type: string;
    status: OptimizationStatus;
    total_runs: number;
    completed_runs: number;
    failed_runs: number;
    avg_final_score: number | null;
    max_final_score: number | null;
    avg_improvement: number | null;
    avg_duration_ms: number | null;
    total_samples_evaluated: number | null;
    total_tokens_used: number | null;
    total_cost_usd: number | null;
    first_run_at: string;
    last_run_at: string;
}
/**
 * API type for optimization run (camelCase)
 */
export interface OptimizationRun {
    id: string;
    projectId: string;
    runName: string;
    optimizerType: OptimizerType;
    status: OptimizationStatus;
    config: OptimizationConfig;
    startTime: string;
    endTime?: string;
    durationMs?: number;
    initialScore?: number;
    finalScore?: number;
    bestScore?: number;
    improvement?: number;
    improvementPct?: number;
    iterations: number;
    samplesEvaluated: number;
    successfulSamples: number;
    failedSamples: number;
    totalTokens?: number;
    totalCostUsd?: number;
    avgLatencyMs?: number;
    bestProgram?: any;
    finalProgram?: any;
    evaluationResults?: any;
    errorMessage?: string;
    errorStack?: string;
    metadata: Record<string, any>;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}
/**
 * API type for optimization iteration (camelCase)
 */
export interface OptimizationIteration {
    id: string;
    runId: string;
    iteration: number;
    score: number;
    isBest: boolean;
    params: Record<string, any>;
    program?: any;
    samplesInIteration: number;
    successfulSamples: number;
    avgScore?: number;
    stdDev?: number;
    iterationStartTime: string;
    iterationEndTime?: string;
    durationMs?: number;
    tokensUsed?: number;
    costUsd?: number;
    metadata: Record<string, any>;
    createdAt: string;
}
/**
 * API type for optimization sample (camelCase)
 */
export interface OptimizationSample {
    id: string;
    runId: string;
    iterationId?: string;
    iteration: number;
    sampleIndex: number;
    input: any;
    predictedOutput?: any;
    expectedOutput?: any;
    score?: number;
    isCorrect?: boolean;
    programHash?: string;
    latencyMs?: number;
    tokensUsed?: number;
    costUsd?: number;
    errorMessage?: string;
    metadata: Record<string, any>;
    createdAt: string;
}
/**
 * API type for run analytics (camelCase)
 */
export interface OptimizationRunAnalytics {
    projectId: string;
    optimizerType: string;
    status: OptimizationStatus;
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    avgFinalScore?: number;
    maxFinalScore?: number;
    avgImprovement?: number;
    avgDurationMs?: number;
    totalSamplesEvaluated?: number;
    totalTokensUsed?: number;
    totalCostUsd?: number;
    firstRunAt: string;
    lastRunAt: string;
}
/**
 * MIPROv2 optimizer configuration
 */
export interface MIPROv2Config {
    metric: string;
    num_candidates?: number;
    init_temperature?: number;
    track_stats?: boolean;
    teacher_settings?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    };
    prompt_model?: string;
    task_model?: string;
    num_trials?: number;
    max_bootstrapped_demos?: number;
    max_labeled_demos?: number;
    minibatch?: boolean;
    minibatch_size?: number;
    minibatch_full_eval_steps?: number;
}
/**
 * Bootstrap optimizer configuration
 */
export interface BootstrapConfig {
    metric?: string;
    max_bootstrapped_demos?: number;
    max_labeled_demos?: number;
    max_rounds?: number;
    teacher_settings?: {
        model?: string;
        temperature?: number;
    };
}
/**
 * Generic optimizer configuration
 */
export interface OptimizationConfig {
    optimizer: OptimizerType;
    metric?: string;
    max_iterations?: number;
    timeout_seconds?: number;
    early_stopping?: {
        enabled: boolean;
        patience?: number;
        min_delta?: number;
    };
    model_config?: {
        model: string;
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
    };
    dataset_config?: {
        train_size?: number;
        val_size?: number;
        test_size?: number;
        shuffle?: boolean;
        seed?: number;
    };
    miprov2?: MIPROv2Config;
    bootstrap?: BootstrapConfig;
    [key: string]: any;
}
/**
 * Request to create a new optimization run
 */
export interface CreateOptimizationRunRequest {
    projectId: string;
    runName: string;
    optimizerType: OptimizerType;
    config: OptimizationConfig;
    initialScore?: number;
    metadata?: Record<string, any>;
    tags?: string[];
}
/**
 * Request to update an optimization run
 */
export interface UpdateOptimizationRunRequest {
    status?: OptimizationStatus;
    endTime?: string;
    finalScore?: number;
    iterations?: number;
    samplesEvaluated?: number;
    successfulSamples?: number;
    failedSamples?: number;
    totalTokens?: number;
    totalCostUsd?: number;
    bestProgram?: any;
    finalProgram?: any;
    evaluationResults?: any;
    errorMessage?: string;
    errorStack?: string;
    metadata?: Record<string, any>;
    tags?: string[];
}
/**
 * Request to create an optimization iteration
 */
export interface CreateOptimizationIterationRequest {
    runId: string;
    iteration: number;
    score: number;
    params: Record<string, any>;
    program?: any;
    samplesInIteration?: number;
    successfulSamples?: number;
    avgScore?: number;
    stdDev?: number;
    iterationStartTime?: string;
    iterationEndTime?: string;
    durationMs?: number;
    tokensUsed?: number;
    costUsd?: number;
    metadata?: Record<string, any>;
}
/**
 * Request to create an optimization sample
 */
export interface CreateOptimizationSampleRequest {
    runId: string;
    iterationId?: string;
    iteration: number;
    sampleIndex: number;
    input: any;
    predictedOutput?: any;
    expectedOutput?: any;
    score?: number;
    isCorrect?: boolean;
    programHash?: string;
    latencyMs?: number;
    tokensUsed?: number;
    costUsd?: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
}
/**
 * Query filters for listing optimization runs
 */
export interface OptimizationRunFilters {
    projectId: string;
    status?: OptimizationStatus | OptimizationStatus[];
    optimizerType?: OptimizerType | OptimizerType[];
    tags?: string[];
    minScore?: number;
    maxScore?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'final_score' | 'improvement' | 'duration_ms';
    orderDirection?: 'asc' | 'desc';
}
/**
 * Paginated response for optimization runs
 */
export interface OptimizationRunsResponse {
    data: OptimizationRun[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
/**
 * Run summary response
 */
export interface OptimizationRunSummary {
    runId: string;
    runName: string;
    status: OptimizationStatus;
    optimizerType: OptimizerType;
    initialScore?: number;
    finalScore?: number;
    bestScore?: number;
    improvement?: number;
    improvementPct?: number;
    iterations: number;
    samplesEvaluated: number;
    durationMs?: number;
    totalCostUsd?: number;
    createdAt: string;
}
/**
 * Return type for get_optimization_run_summary function
 */
export interface OptimizationRunSummaryDb {
    run_id: string;
    run_name: string;
    status: OptimizationStatus;
    optimizer_type: string;
    initial_score: number | null;
    final_score: number | null;
    best_score: number | null;
    improvement: number | null;
    improvement_pct: number | null;
    iterations: number;
    samples_evaluated: number;
    duration_ms: number | null;
    total_cost_usd: number | null;
    created_at: string;
}
/**
 * Return type for get_top_runs_by_score function
 */
export interface TopRunByScore {
    run_id: string;
    run_name: string;
    optimizer_type: string;
    final_score: number;
    improvement: number;
    iterations: number;
    created_at: string;
}
/**
 * Type for inserting new optimization run (omits generated/default fields)
 */
export type OptimizationRunInsert = Omit<OptimizationRunRow, 'id' | 'duration_ms' | 'improvement' | 'improvement_pct' | 'created_at' | 'updated_at'>;
/**
 * Type for updating optimization run (all fields optional except id)
 */
export type OptimizationRunUpdate = Partial<Omit<OptimizationRunRow, 'id' | 'duration_ms' | 'improvement' | 'improvement_pct' | 'created_at'>>;
/**
 * Type for inserting new iteration (omits generated fields)
 */
export type OptimizationIterationInsert = Omit<OptimizationIterationRow, 'id' | 'created_at'>;
/**
 * Type for inserting new sample (omits generated fields)
 */
export type OptimizationSampleInsert = Omit<OptimizationSampleRow, 'id' | 'created_at'>;
//# sourceMappingURL=types.optimization.d.ts.map