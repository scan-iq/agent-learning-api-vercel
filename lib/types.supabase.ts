// Lightweight Supabase types used for validation and IDE hints.
// Replace with generated types when Supabase codegen is wired.

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
