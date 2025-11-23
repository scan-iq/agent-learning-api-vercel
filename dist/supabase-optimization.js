/**
 * Supabase helper functions for DSPy optimization tracking
 *
 * Provides type-safe database operations for optimization runs, iterations, and samples
 */
import { getSupabaseClient } from './supabase';
// =============================================================================
// CONVERSION UTILITIES (snake_case <-> camelCase)
// =============================================================================
/**
 * Convert database row (snake_case) to API type (camelCase)
 */
export function rowToOptimizationRun(row) {
    return {
        id: row.id,
        projectId: row.project_id,
        runName: row.run_name,
        optimizerType: row.optimizer_type,
        status: row.status,
        config: {
            optimizer: row.optimizer_type,
            ...row.config,
        }, // JSONB config field with required optimizer
        startTime: row.start_time,
        endTime: row.end_time || undefined,
        durationMs: row.duration_ms || undefined,
        initialScore: row.initial_score || undefined,
        finalScore: row.final_score || undefined,
        bestScore: row.best_score || undefined,
        improvement: row.improvement || undefined,
        improvementPct: row.improvement_pct || undefined,
        iterations: row.iterations,
        samplesEvaluated: row.samples_evaluated,
        successfulSamples: row.successful_samples,
        failedSamples: row.failed_samples,
        totalTokens: row.total_tokens || undefined,
        totalCostUsd: row.total_cost_usd || undefined,
        avgLatencyMs: row.avg_latency_ms || undefined,
        bestProgram: row.best_program || undefined,
        finalProgram: row.final_program || undefined,
        evaluationResults: row.evaluation_results || undefined,
        errorMessage: row.error_message || undefined,
        errorStack: row.error_stack || undefined,
        metadata: row.metadata,
        tags: row.tags,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
/**
 * Convert database iteration row to API type
 */
export function rowToOptimizationIteration(row) {
    return {
        id: row.id,
        runId: row.run_id,
        iteration: row.iteration,
        score: row.score,
        isBest: row.is_best,
        params: row.params,
        program: row.program || undefined,
        samplesInIteration: row.samples_in_iteration,
        successfulSamples: row.successful_samples,
        avgScore: row.avg_score || undefined,
        stdDev: row.std_dev || undefined,
        iterationStartTime: row.iteration_start_time,
        iterationEndTime: row.iteration_end_time || undefined,
        durationMs: row.duration_ms || undefined,
        tokensUsed: row.tokens_used || undefined,
        costUsd: row.cost_usd || undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
    };
}
/**
 * Convert database sample row to API type
 */
export function rowToOptimizationSample(row) {
    return {
        id: row.id,
        runId: row.run_id,
        iterationId: row.iteration_id || undefined,
        iteration: row.iteration,
        sampleIndex: row.sample_index,
        input: row.input,
        predictedOutput: row.predicted_output || undefined,
        expectedOutput: row.expected_output || undefined,
        score: row.score || undefined,
        isCorrect: row.is_correct || undefined,
        programHash: row.program_hash || undefined,
        latencyMs: row.latency_ms || undefined,
        tokensUsed: row.tokens_used || undefined,
        costUsd: row.cost_usd || undefined,
        errorMessage: row.error_message || undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
    };
}
// =============================================================================
// OPTIMIZATION RUN OPERATIONS
// =============================================================================
/**
 * Create a new optimization run
 */
export async function createOptimizationRun(request) {
    const supabase = getSupabaseClient();
    const insertData = {
        project_id: request.projectId,
        run_name: request.runName,
        optimizer_type: request.optimizerType,
        status: 'pending',
        config: request.config, // Config is validated by Zod schema
        initial_score: request.initialScore,
        metadata: request.metadata || {},
        tags: request.tags || [],
        iterations: 0,
        samples_evaluated: 0,
        successful_samples: 0,
        failed_samples: 0,
    };
    const { data, error } = await supabase
        .from('optimization_runs')
        .insert(insertData)
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to create optimization run: ${error.message}`);
    }
    return rowToOptimizationRun(data);
}
/**
 * Get optimization run by ID
 */
export async function getOptimizationRun(runId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('optimization_runs')
        .select('*')
        .eq('id', runId)
        .single();
    if (error) {
        if (error.code === 'PGRST116')
            return null; // Not found
        throw new Error(`Failed to get optimization run: ${error.message}`);
    }
    return rowToOptimizationRun(data);
}
/**
 * Update optimization run
 */
export async function updateOptimizationRun(runId, updates) {
    const supabase = getSupabaseClient();
    // Convert camelCase to snake_case
    const updateData = {};
    if (updates.status !== undefined)
        updateData.status = updates.status;
    if (updates.endTime !== undefined)
        updateData.end_time = updates.endTime;
    if (updates.finalScore !== undefined)
        updateData.final_score = updates.finalScore;
    if (updates.iterations !== undefined)
        updateData.iterations = updates.iterations;
    if (updates.samplesEvaluated !== undefined)
        updateData.samples_evaluated = updates.samplesEvaluated;
    if (updates.successfulSamples !== undefined)
        updateData.successful_samples = updates.successfulSamples;
    if (updates.failedSamples !== undefined)
        updateData.failed_samples = updates.failedSamples;
    if (updates.totalTokens !== undefined)
        updateData.total_tokens = updates.totalTokens;
    if (updates.totalCostUsd !== undefined)
        updateData.total_cost_usd = updates.totalCostUsd;
    if (updates.bestProgram !== undefined)
        updateData.best_program = updates.bestProgram;
    if (updates.finalProgram !== undefined)
        updateData.final_program = updates.finalProgram;
    if (updates.evaluationResults !== undefined)
        updateData.evaluation_results = updates.evaluationResults;
    if (updates.errorMessage !== undefined)
        updateData.error_message = updates.errorMessage;
    if (updates.errorStack !== undefined)
        updateData.error_stack = updates.errorStack;
    if (updates.metadata !== undefined)
        updateData.metadata = updates.metadata;
    if (updates.tags !== undefined)
        updateData.tags = updates.tags;
    const { data, error } = await supabase
        .from('optimization_runs')
        .update(updateData)
        .eq('id', runId)
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to update optimization run: ${error.message}`);
    }
    return rowToOptimizationRun(data);
}
/**
 * List optimization runs with filters and pagination
 */
export async function listOptimizationRuns(filters) {
    const supabase = getSupabaseClient();
    let query = supabase
        .from('optimization_runs')
        .select('*', { count: 'exact' })
        .eq('project_id', filters.projectId);
    // Apply filters
    if (filters.status) {
        if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status);
        }
        else {
            query = query.eq('status', filters.status);
        }
    }
    if (filters.optimizerType) {
        if (Array.isArray(filters.optimizerType)) {
            query = query.in('optimizer_type', filters.optimizerType);
        }
        else {
            query = query.eq('optimizer_type', filters.optimizerType);
        }
    }
    if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
    }
    if (filters.minScore !== undefined) {
        query = query.gte('final_score', filters.minScore);
    }
    if (filters.maxScore !== undefined) {
        query = query.lte('final_score', filters.maxScore);
    }
    if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
    }
    // Apply ordering
    const orderBy = filters.orderBy || 'created_at';
    const orderDirection = filters.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);
    const { data, error, count } = await query;
    if (error) {
        throw new Error(`Failed to list optimization runs: ${error.message}`);
    }
    const runs = (data || []).map((row) => rowToOptimizationRun(row));
    const total = count || 0;
    return {
        data: runs,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
    };
}
/**
 * Delete optimization run (cascades to iterations and samples)
 */
export async function deleteOptimizationRun(runId) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('optimization_runs').delete().eq('id', runId);
    if (error) {
        throw new Error(`Failed to delete optimization run: ${error.message}`);
    }
}
// =============================================================================
// ITERATION OPERATIONS
// =============================================================================
/**
 * Create optimization iteration
 */
export async function createOptimizationIteration(request) {
    const supabase = getSupabaseClient();
    const insertData = {
        run_id: request.runId,
        iteration: request.iteration,
        score: request.score,
        params: request.params,
        program: request.program,
        samples_in_iteration: request.samplesInIteration || 0,
        successful_samples: request.successfulSamples || 0,
        avg_score: request.avgScore,
        std_dev: request.stdDev,
        iteration_start_time: request.iterationStartTime,
        iteration_end_time: request.iterationEndTime,
        duration_ms: request.durationMs,
        tokens_used: request.tokensUsed,
        cost_usd: request.costUsd,
        metadata: request.metadata || {},
    };
    const { data, error } = await supabase
        .from('optimization_iterations')
        .insert(insertData)
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to create optimization iteration: ${error.message}`);
    }
    return rowToOptimizationIteration(data);
}
/**
 * Get iterations for a run
 */
export async function getOptimizationIterations(runId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('optimization_iterations')
        .select('*')
        .eq('run_id', runId)
        .order('iteration', { ascending: true });
    if (error) {
        throw new Error(`Failed to get optimization iterations: ${error.message}`);
    }
    return (data || []).map((row) => rowToOptimizationIteration(row));
}
/**
 * Get best iteration for a run
 */
export async function getBestIteration(runId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('optimization_iterations')
        .select('*')
        .eq('run_id', runId)
        .eq('is_best', true)
        .single();
    if (error) {
        if (error.code === 'PGRST116')
            return null;
        throw new Error(`Failed to get best iteration: ${error.message}`);
    }
    return rowToOptimizationIteration(data);
}
// =============================================================================
// SAMPLE OPERATIONS
// =============================================================================
/**
 * Create optimization sample
 */
export async function createOptimizationSample(request) {
    const supabase = getSupabaseClient();
    const insertData = {
        run_id: request.runId,
        iteration_id: request.iterationId,
        iteration: request.iteration,
        sample_index: request.sampleIndex,
        input: request.input,
        predicted_output: request.predictedOutput,
        expected_output: request.expectedOutput,
        score: request.score,
        is_correct: request.isCorrect,
        program_hash: request.programHash,
        latency_ms: request.latencyMs,
        tokens_used: request.tokensUsed,
        cost_usd: request.costUsd,
        error_message: request.errorMessage,
        metadata: request.metadata || {},
    };
    const { data, error } = await supabase
        .from('optimization_samples')
        .insert(insertData)
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to create optimization sample: ${error.message}`);
    }
    return rowToOptimizationSample(data);
}
/**
 * Get samples for a run
 */
export async function getOptimizationSamples(runId, iteration, limit = 100) {
    const supabase = getSupabaseClient();
    let query = supabase
        .from('optimization_samples')
        .select('*')
        .eq('run_id', runId)
        .order('iteration', { ascending: true })
        .order('sample_index', { ascending: true })
        .limit(limit);
    if (iteration !== undefined) {
        query = query.eq('iteration', iteration);
    }
    const { data, error } = await query;
    if (error) {
        throw new Error(`Failed to get optimization samples: ${error.message}`);
    }
    return (data || []).map((row) => rowToOptimizationSample(row));
}
// =============================================================================
// ANALYTICS & AGGREGATIONS
// =============================================================================
/**
 * Get run summary using database function
 */
export async function getOptimizationRunSummary(runId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_optimization_run_summary', {
        p_run_id: runId,
    });
    if (error) {
        throw new Error(`Failed to get run summary: ${error.message}`);
    }
    if (!data || data.length === 0)
        return null;
    const row = data[0];
    return {
        runId: row.run_id,
        runName: row.run_name,
        status: row.status,
        optimizerType: row.optimizer_type,
        initialScore: row.initial_score,
        finalScore: row.final_score,
        bestScore: row.best_score,
        improvement: row.improvement,
        improvementPct: row.improvement_pct,
        iterations: row.iterations,
        samplesEvaluated: row.samples_evaluated,
        durationMs: row.duration_ms,
        totalCostUsd: row.total_cost_usd,
        createdAt: row.created_at,
    };
}
/**
 * Get top runs by score for a project
 */
export async function getTopRunsByScore(projectId, limit = 10) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_top_runs_by_score', {
        p_project_id: projectId,
        p_limit: limit,
    });
    if (error) {
        throw new Error(`Failed to get top runs: ${error.message}`);
    }
    return data || [];
}
/**
 * Get analytics for a project
 */
export async function getOptimizationAnalytics(projectId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('optimization_run_analytics')
        .select('*')
        .eq('project_id', projectId);
    if (error) {
        throw new Error(`Failed to get optimization analytics: ${error.message}`);
    }
    return data || [];
}
/**
 * Refresh analytics materialized view
 */
export async function refreshOptimizationAnalytics() {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('refresh_optimization_analytics');
    if (error) {
        throw new Error(`Failed to refresh analytics: ${error.message}`);
    }
}
// =============================================================================
// BATCH OPERATIONS
// =============================================================================
/**
 * Batch create optimization samples (more efficient for large datasets)
 */
export async function batchCreateOptimizationSamples(samples) {
    const supabase = getSupabaseClient();
    const insertData = samples.map((s) => ({
        run_id: s.runId,
        iteration_id: s.iterationId,
        iteration: s.iteration,
        sample_index: s.sampleIndex,
        input: s.input,
        predicted_output: s.predictedOutput,
        expected_output: s.expectedOutput,
        score: s.score,
        is_correct: s.isCorrect,
        program_hash: s.programHash,
        latency_ms: s.latencyMs,
        tokens_used: s.tokensUsed,
        cost_usd: s.costUsd,
        error_message: s.errorMessage,
        metadata: s.metadata || {},
    }));
    const { data, error } = await supabase
        .from('optimization_samples')
        .insert(insertData)
        .select();
    if (error) {
        throw new Error(`Failed to batch create samples: ${error.message}`);
    }
    return (data || []).map((row) => rowToOptimizationSample(row));
}
/**
 * Update run progress (convenience function for common update pattern)
 */
export async function updateRunProgress(runId, progress) {
    const updates = {};
    if (progress.status)
        updates.status = progress.status;
    if (progress.iterations !== undefined)
        updates.iterations = progress.iterations;
    if (progress.samplesEvaluated !== undefined)
        updates.samplesEvaluated = progress.samplesEvaluated;
    if (progress.successfulSamples !== undefined)
        updates.successfulSamples = progress.successfulSamples;
    if (progress.failedSamples !== undefined)
        updates.failedSamples = progress.failedSamples;
    // Set end time if completed or failed
    if (progress.status === 'completed' || progress.status === 'failed') {
        updates.endTime = new Date().toISOString();
        if (progress.currentScore !== undefined) {
            updates.finalScore = progress.currentScore;
        }
    }
    await updateOptimizationRun(runId, updates);
}
