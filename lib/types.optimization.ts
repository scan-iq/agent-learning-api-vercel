/**
 * TypeScript types for DSPy optimization tracking
 * Generated from database schema: migrations/001_optimization_runs.sql
 *
 * These types match the Supabase PostgreSQL schema exactly
 */

// =============================================================================
// ENUMS
// =============================================================================

export type OptimizationStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type OptimizerType =
  | 'miprov2'
  | 'bootstrap'
  | 'copro'
  | 'knn'
  | 'random'
  | 'custom';

// =============================================================================
// DATABASE ROW TYPES (snake_case to match PostgreSQL)
// =============================================================================

/**
 * Database row type for optimization_runs table
 */
export interface OptimizationRunRow {
  id: string; // UUID
  project_id: string;
  run_name: string;
  optimizer_type: string;
  status: OptimizationStatus;

  // Configuration
  config: Record<string, any>;

  // Timing metrics
  start_time: string; // ISO 8601 timestamp
  end_time: string | null;
  duration_ms: number | null; // Generated column

  // Performance metrics
  initial_score: number | null; // NUMERIC(7,4)
  final_score: number | null;
  best_score: number | null;
  improvement: number | null; // Generated column
  improvement_pct: number | null; // Generated column

  // Run statistics
  iterations: number;
  samples_evaluated: number;
  successful_samples: number;
  failed_samples: number;

  // Resource usage
  total_tokens: number | null;
  total_cost_usd: number | null; // NUMERIC(10,6)
  avg_latency_ms: number | null;

  // Results and artifacts
  best_program: Record<string, any> | null;
  final_program: Record<string, any> | null;
  evaluation_results: Record<string, any> | null;

  // Error handling
  error_message: string | null;
  error_stack: string | null;

  // Metadata
  metadata: Record<string, any>;
  tags: string[];

  // Audit fields
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for optimization_iterations table
 */
export interface OptimizationIterationRow {
  id: string; // UUID
  run_id: string; // UUID
  iteration: number;

  // Iteration metrics
  score: number; // NUMERIC(7,4)
  is_best: boolean;

  // Iteration details
  params: Record<string, any>;
  program: Record<string, any> | null;

  // Performance
  samples_in_iteration: number;
  successful_samples: number;
  avg_score: number | null;
  std_dev: number | null;

  // Timing
  iteration_start_time: string;
  iteration_end_time: string | null;
  duration_ms: number | null;

  // Resource usage
  tokens_used: number | null;
  cost_usd: number | null;

  // Metadata
  metadata: Record<string, any>;

  created_at: string;
}

/**
 * Database row type for optimization_samples table
 */
export interface OptimizationSampleRow {
  id: string; // UUID
  run_id: string; // UUID
  iteration_id: string | null; // UUID
  iteration: number;
  sample_index: number;

  // Sample data
  input: Record<string, any>;
  predicted_output: Record<string, any> | null;
  expected_output: Record<string, any> | null;

  // Evaluation
  score: number | null;
  is_correct: boolean | null;

  // Program used
  program_hash: string | null;

  // Timing and cost
  latency_ms: number | null;
  tokens_used: number | null;
  cost_usd: number | null;

  // Error handling
  error_message: string | null;

  // Metadata
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

// =============================================================================
// API TYPES (camelCase for TypeScript/JavaScript usage)
// =============================================================================

/**
 * API type for optimization run (camelCase)
 */
export interface OptimizationRun {
  id: string;
  projectId: string;
  runName: string;
  optimizerType: OptimizerType;
  status: OptimizationStatus;

  // Configuration
  config: OptimizationConfig;

  // Timing metrics
  startTime: string;
  endTime?: string;
  durationMs?: number;

  // Performance metrics
  initialScore?: number;
  finalScore?: number;
  bestScore?: number;
  improvement?: number;
  improvementPct?: number;

  // Run statistics
  iterations: number;
  samplesEvaluated: number;
  successfulSamples: number;
  failedSamples: number;

  // Resource usage
  totalTokens?: number;
  totalCostUsd?: number;
  avgLatencyMs?: number;

  // Results
  bestProgram?: any;
  finalProgram?: any;
  evaluationResults?: any;

  // Error handling
  errorMessage?: string;
  errorStack?: string;

  // Metadata
  metadata: Record<string, any>;
  tags: string[];

  // Audit
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

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

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
  // Optimizer-specific configs
  miprov2?: MIPROv2Config;
  bootstrap?: BootstrapConfig;
  [key: string]: any; // Allow additional custom configs
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

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

// =============================================================================
// HELPER FUNCTIONS RETURN TYPES
// =============================================================================

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

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Type for inserting new optimization run (omits generated/default fields)
 */
export type OptimizationRunInsert = Omit<
  OptimizationRunRow,
  'id' | 'duration_ms' | 'improvement' | 'improvement_pct' | 'created_at' | 'updated_at'
>;

/**
 * Type for updating optimization run (all fields optional except id)
 */
export type OptimizationRunUpdate = Partial<
  Omit<OptimizationRunRow, 'id' | 'duration_ms' | 'improvement' | 'improvement_pct' | 'created_at'>
>;

/**
 * Type for inserting new iteration (omits generated fields)
 */
export type OptimizationIterationInsert = Omit<
  OptimizationIterationRow,
  'id' | 'created_at'
>;

/**
 * Type for inserting new sample (omits generated fields)
 */
export type OptimizationSampleInsert = Omit<OptimizationSampleRow, 'id' | 'created_at'>;
