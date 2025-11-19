/**
 * Enhanced IRIS Telemetry with agentdb and agentic-flow integration
 * Captures rich telemetry data for advanced analytics
 */

import { getSupabaseClient } from "./supabase.js";

export interface EnhancedTelemetryEvent {
  // Core fields (existing)
  expertId: string;
  projectId?: string;
  confidence?: number;
  latencyMs?: number;
  outcome?: string;
  eventType?: string;

  // Agent context
  agentType?: string; // 'explorer' | 'planner' | 'coder' | 'reviewer' | etc.
  modelName?: string; // 'claude-sonnet-4-5' | 'gpt-4' | etc.

  // Token usage & cost
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;

  // Reasoning & execution
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

  // Model parameters
  contextWindow?: number;
  temperature?: number;
  topP?: number;

  // Quality metrics
  reasoningQualityScore?: number; // 0-1 score from reasoning evaluation

  // Advanced tracking
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
  parentTraceId?: string; // For hierarchical tracing
  traceDepth?: number; // Depth in execution tree
  tags?: string[]; // For categorization

  // Flexible metadata
  metadata?: Record<string, any>;
}

/**
 * Log enhanced telemetry event
 */
export async function logEnhancedTelemetry(event: EnhancedTelemetryEvent): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("iris_telemetry").insert({
    // Core fields
    expert_id: event.expertId,
    project_id: event.projectId,
    confidence: event.confidence,
    latency_ms: event.latencyMs,
    outcome: event.outcome,
    event_type: event.eventType || "telemetry",

    // Agent context
    agent_type: event.agentType,
    model_name: event.modelName,

    // Token usage
    prompt_tokens: event.promptTokens,
    completion_tokens: event.completionTokens,
    total_tokens: event.totalTokens,
    cost_usd: event.costUsd,

    // Reasoning & execution
    reasoning_steps: event.reasoningSteps || [],
    tool_calls: event.toolCalls || [],
    error_details: event.errorDetails,

    // Model parameters
    context_window: event.contextWindow,
    temperature: event.temperature,
    top_p: event.topP,

    // Quality
    reasoning_quality_score: event.reasoningQualityScore,

    // Advanced
    causal_chain: event.causalChain || [],
    reflexion_data: event.reflexionData,
    parent_trace_id: event.parentTraceId,
    trace_depth: event.traceDepth || 0,
    tags: event.tags || [],

    // Metadata
    metadata: event.metadata || {},

    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to log telemetry: ${error.message}`);
  }
}

/**
 * Get comprehensive analytics for a project using agentdb patterns
 */
export async function getProjectAnalytics(projectId: string, options?: {
  fromDate?: string;
  toDate?: string;
  limit?: number;
}) {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("iris_telemetry")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (options?.fromDate) {
    query = query.gte("created_at", options.fromDate);
  }
  if (options?.toDate) {
    query = query.lte("created_at", options.toDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  } else {
    query = query.limit(1000);
  }

  const { data: telemetry, error } = await query;

  if (error) {
    throw new Error(`Failed to get analytics: ${error.message}`);
  }

  const events = telemetry || [];

  // Compute analytics
  return {
    projectId,
    totalEvents: events.length,
    timeRange: {
      from: events[events.length - 1]?.created_at,
      to: events[0]?.created_at,
    },

    // Performance metrics
    performance: {
      avgLatencyMs: events.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / events.length || 0,
      avgConfidence: events.reduce((sum, e) => sum + (e.confidence || 0), 0) / events.length || 0,
      successRate: events.filter(e => e.outcome === 'success').length / events.length || 0,
    },

    // Token usage
    tokens: {
      totalPromptTokens: events.reduce((sum, e) => sum + (e.prompt_tokens || 0), 0),
      totalCompletionTokens: events.reduce((sum, e) => sum + (e.completion_tokens || 0), 0),
      totalTokens: events.reduce((sum, e) => sum + (e.total_tokens || 0), 0),
      totalCostUsd: events.reduce((sum, e) => sum + (e.cost_usd || 0), 0),
    },

    // Agent distribution
    byAgentType: groupBy(events, 'agent_type'),
    byModel: groupBy(events, 'model_name'),
    byOutcome: groupBy(events, 'outcome'),

    // Quality
    avgReasoningQuality: events
      .filter(e => e.reasoning_quality_score)
      .reduce((sum, e) => sum + (e.reasoning_quality_score || 0), 0) /
      events.filter(e => e.reasoning_quality_score).length || 0,

    // Recent events
    recentEvents: events.slice(0, 20),
  };
}

function groupBy(array: any[], key: string) {
  return array.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
