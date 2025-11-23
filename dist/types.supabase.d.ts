export interface DecisionDraftRow {
    id: string;
    status: "pending" | "approved" | "rejected";
    source?: string;
    type?: string;
    recommendation: string;
    rationale?: string;
    payload?: Record<string, any>;
    confidence?: number;
    created_at?: string;
    updated_at?: string;
}
export interface TelemetryRow {
    expert_id: string;
    project_id?: string;
    confidence?: number;
    latency_ms?: number;
    outcome?: string;
    event_type?: string;
    metadata?: Record<string, any>;
    created_at?: string;
}
export interface OptimizationRunRow {
    id: string;
    project_id: string;
    run_name?: string;
    optimizer_type: "bayesian" | "grid_search" | "random_search" | "genetic" | "gradient_descent";
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    config: Record<string, any>;
    search_space?: Record<string, any>;
    final_score?: number;
    best_params?: Record<string, any>;
    metadata?: Record<string, any>;
    iterations_count?: number;
    duration_ms?: number;
    error_message?: string;
    created_at?: string;
    updated_at?: string;
    started_at?: string;
    completed_at?: string;
}
export interface OptimizationIterationRow {
    id: string;
    run_id: string;
    iteration_number: number;
    params: Record<string, any>;
    score: number;
    metrics?: Record<string, any>;
    metadata?: Record<string, any>;
    duration_ms?: number;
    created_at?: string;
}
//# sourceMappingURL=types.supabase.d.ts.map