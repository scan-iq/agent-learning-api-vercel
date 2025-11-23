/**
 * Supabase helper functions for DSPy optimization tracking
 *
 * Provides type-safe database operations for optimization runs, iterations, and samples
 */
import type { OptimizationRunRow, OptimizationIterationRow, OptimizationSampleRow, OptimizationRunAnalyticsRow, OptimizationRun, OptimizationIteration, OptimizationSample, OptimizationRunFilters, OptimizationRunsResponse, CreateOptimizationRunRequest, UpdateOptimizationRunRequest, CreateOptimizationIterationRequest, CreateOptimizationSampleRequest, OptimizationRunSummary, TopRunByScore } from './types.optimization';
/**
 * Convert database row (snake_case) to API type (camelCase)
 */
export declare function rowToOptimizationRun(row: OptimizationRunRow): OptimizationRun;
/**
 * Convert database iteration row to API type
 */
export declare function rowToOptimizationIteration(row: OptimizationIterationRow): OptimizationIteration;
/**
 * Convert database sample row to API type
 */
export declare function rowToOptimizationSample(row: OptimizationSampleRow): OptimizationSample;
/**
 * Create a new optimization run
 */
export declare function createOptimizationRun(request: CreateOptimizationRunRequest): Promise<OptimizationRun>;
/**
 * Get optimization run by ID
 */
export declare function getOptimizationRun(runId: string): Promise<OptimizationRun | null>;
/**
 * Update optimization run
 */
export declare function updateOptimizationRun(runId: string, updates: UpdateOptimizationRunRequest): Promise<OptimizationRun>;
/**
 * List optimization runs with filters and pagination
 */
export declare function listOptimizationRuns(filters: OptimizationRunFilters): Promise<OptimizationRunsResponse>;
/**
 * Delete optimization run (cascades to iterations and samples)
 */
export declare function deleteOptimizationRun(runId: string): Promise<void>;
/**
 * Create optimization iteration
 */
export declare function createOptimizationIteration(request: CreateOptimizationIterationRequest): Promise<OptimizationIteration>;
/**
 * Get iterations for a run
 */
export declare function getOptimizationIterations(runId: string): Promise<OptimizationIteration[]>;
/**
 * Get best iteration for a run
 */
export declare function getBestIteration(runId: string): Promise<OptimizationIteration | null>;
/**
 * Create optimization sample
 */
export declare function createOptimizationSample(request: CreateOptimizationSampleRequest): Promise<OptimizationSample>;
/**
 * Get samples for a run
 */
export declare function getOptimizationSamples(runId: string, iteration?: number, limit?: number): Promise<OptimizationSample[]>;
/**
 * Get run summary using database function
 */
export declare function getOptimizationRunSummary(runId: string): Promise<OptimizationRunSummary | null>;
/**
 * Get top runs by score for a project
 */
export declare function getTopRunsByScore(projectId: string, limit?: number): Promise<TopRunByScore[]>;
/**
 * Get analytics for a project
 */
export declare function getOptimizationAnalytics(projectId: string): Promise<OptimizationRunAnalyticsRow[]>;
/**
 * Refresh analytics materialized view
 */
export declare function refreshOptimizationAnalytics(): Promise<void>;
/**
 * Batch create optimization samples (more efficient for large datasets)
 */
export declare function batchCreateOptimizationSamples(samples: CreateOptimizationSampleRequest[]): Promise<OptimizationSample[]>;
/**
 * Update run progress (convenience function for common update pattern)
 */
export declare function updateRunProgress(runId: string, progress: {
    status?: 'running' | 'completed' | 'failed';
    iterations?: number;
    samplesEvaluated?: number;
    successfulSamples?: number;
    failedSamples?: number;
    currentScore?: number;
}): Promise<void>;
//# sourceMappingURL=supabase-optimization.d.ts.map