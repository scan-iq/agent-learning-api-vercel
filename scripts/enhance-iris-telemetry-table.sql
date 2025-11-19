-- Enhanced IRIS Telemetry Schema
-- Adds richer fields for agentic-flow and agentdb integration

-- Add new columns to existing table
ALTER TABLE iris_telemetry
  ADD COLUMN IF NOT EXISTS agent_type TEXT,
  ADD COLUMN IF NOT EXISTS model_name TEXT,
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,6),
  ADD COLUMN IF NOT EXISTS reasoning_steps JSONB,
  ADD COLUMN IF NOT EXISTS tool_calls JSONB,
  ADD COLUMN IF NOT EXISTS error_details JSONB,
  ADD COLUMN IF NOT EXISTS context_window INTEGER,
  ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS top_p DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS reasoning_quality_score DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS causal_chain JSONB,
  ADD COLUMN IF NOT EXISTS reflexion_data JSONB,
  ADD COLUMN IF NOT EXISTS parent_trace_id UUID,
  ADD COLUMN IF NOT EXISTS trace_depth INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Additional indexes for enhanced querying
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_agent_type ON iris_telemetry(agent_type);
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_model ON iris_telemetry(model_name);
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_outcome ON iris_telemetry(outcome);
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_parent_trace ON iris_telemetry(parent_trace_id);
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_tags ON iris_telemetry USING GIN(tags);

-- Comments
COMMENT ON COLUMN iris_telemetry.agent_type IS 'Type of agent: explorer, planner, coder, reviewer, etc.';
COMMENT ON COLUMN iris_telemetry.model_name IS 'LLM model used: claude-sonnet-4-5, gpt-4, etc.';
COMMENT ON COLUMN iris_telemetry.prompt_tokens IS 'Number of tokens in prompt';
COMMENT ON COLUMN iris_telemetry.completion_tokens IS 'Number of tokens in completion';
COMMENT ON COLUMN iris_telemetry.total_tokens IS 'Total tokens used';
COMMENT ON COLUMN iris_telemetry.cost_usd IS 'Estimated cost in USD';
COMMENT ON COLUMN iris_telemetry.reasoning_steps IS 'Array of reasoning steps from chain-of-thought';
COMMENT ON COLUMN iris_telemetry.tool_calls IS 'Tools/functions called during execution';
COMMENT ON COLUMN iris_telemetry.error_details IS 'Detailed error information if outcome was error';
COMMENT ON COLUMN iris_telemetry.reasoning_quality_score IS 'Quality score from reasoning evaluation';
COMMENT ON COLUMN iris_telemetry.causal_chain IS 'Causal relationships tracked by CausalMemoryGraph';
COMMENT ON COLUMN iris_telemetry.reflexion_data IS 'Self-reflection and learning data';
COMMENT ON COLUMN iris_telemetry.parent_trace_id IS 'Parent trace for hierarchical tracing';
COMMENT ON COLUMN iris_telemetry.trace_depth IS 'Depth in execution trace tree';
COMMENT ON COLUMN iris_telemetry.tags IS 'Array of tags for categorization and filtering';
