-- Migration: 001_optimization_runs.sql
-- Description: Schema for tracking DSPy MIPROv2 optimization runs with performance optimizations
-- Author: Database Architect
-- Date: 2025-11-23
--
-- This migration creates tables for:
-- 1. optimization_runs - Main table for tracking optimization runs
-- 2. optimization_iterations - Detailed iteration-level metrics
-- 3. optimization_samples - Individual sample evaluations
-- 4. Indexes optimized for common query patterns
-- 5. RLS policies for multi-tenant isolation
-- 6. Helper functions and triggers

-- =============================================================================
-- TABLES
-- =============================================================================

-- Main optimization runs table
CREATE TABLE IF NOT EXISTS optimization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES project_config(id) ON DELETE CASCADE,
  run_name TEXT NOT NULL,
  optimizer_type TEXT NOT NULL, -- 'miprov2', 'bootstrap', 'copro', etc.
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- Configuration (optimizer params, model settings, etc.)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timing metrics
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN end_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000
      ELSE NULL
    END
  ) STORED,

  -- Performance metrics
  initial_score NUMERIC(7,4), -- e.g., 0.9876 (4 decimal places)
  final_score NUMERIC(7,4),
  best_score NUMERIC(7,4), -- Track best score achieved during run
  improvement NUMERIC(7,4) GENERATED ALWAYS AS (final_score - initial_score) STORED,
  improvement_pct NUMERIC(7,4) GENERATED ALWAYS AS (
    CASE
      WHEN initial_score > 0
      THEN ((final_score - initial_score) / initial_score) * 100
      ELSE NULL
    END
  ) STORED,

  -- Run statistics
  iterations INTEGER DEFAULT 0,
  samples_evaluated INTEGER DEFAULT 0,
  successful_samples INTEGER DEFAULT 0,
  failed_samples INTEGER DEFAULT 0,

  -- Resource usage
  total_tokens INTEGER,
  total_cost_usd NUMERIC(10,6), -- e.g., $12.345678
  avg_latency_ms INTEGER,

  -- Results and artifacts
  best_program JSONB, -- The best optimized program/prompt
  final_program JSONB, -- The final program (may differ from best)
  evaluation_results JSONB, -- Detailed evaluation metrics

  -- Error handling
  error_message TEXT,
  error_stack TEXT,

  -- Metadata and tags
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- For categorization/filtering

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_scores CHECK (
    (initial_score IS NULL OR (initial_score >= 0 AND initial_score <= 1)) AND
    (final_score IS NULL OR (final_score >= 0 AND final_score <= 1)) AND
    (best_score IS NULL OR (best_score >= 0 AND best_score <= 1))
  ),
  CONSTRAINT valid_timing CHECK (end_time IS NULL OR end_time >= start_time),
  CONSTRAINT valid_samples CHECK (
    samples_evaluated >= 0 AND
    successful_samples >= 0 AND
    failed_samples >= 0 AND
    samples_evaluated >= (successful_samples + failed_samples)
  )
);

-- Detailed iteration tracking
CREATE TABLE IF NOT EXISTS optimization_iterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES optimization_runs(id) ON DELETE CASCADE,
  iteration INTEGER NOT NULL,

  -- Iteration metrics
  score NUMERIC(7,4) NOT NULL,
  is_best BOOLEAN DEFAULT false, -- Flag for best iteration

  -- Iteration details
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  program JSONB, -- The program/prompt at this iteration

  -- Performance
  samples_in_iteration INTEGER DEFAULT 0,
  successful_samples INTEGER DEFAULT 0,
  avg_score NUMERIC(7,4),
  std_dev NUMERIC(7,4),

  -- Timing
  iteration_start_time TIMESTAMPTZ DEFAULT now(),
  iteration_end_time TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Resource usage
  tokens_used INTEGER,
  cost_usd NUMERIC(10,6),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_iteration_score CHECK (score >= 0 AND score <= 1),
  CONSTRAINT unique_run_iteration UNIQUE (run_id, iteration)
);

-- Individual sample evaluations
CREATE TABLE IF NOT EXISTS optimization_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES optimization_runs(id) ON DELETE CASCADE,
  iteration_id UUID REFERENCES optimization_iterations(id) ON DELETE CASCADE,
  iteration INTEGER NOT NULL,
  sample_index INTEGER NOT NULL,

  -- Sample data
  input JSONB NOT NULL,
  predicted_output JSONB,
  expected_output JSONB,

  -- Evaluation
  score NUMERIC(7,4),
  is_correct BOOLEAN,

  -- Program used
  program_hash TEXT, -- Hash of the program for deduplication

  -- Timing and cost
  latency_ms INTEGER,
  tokens_used INTEGER,
  cost_usd NUMERIC(10,6),

  -- Error handling
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_sample_score CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  CONSTRAINT unique_run_iteration_sample UNIQUE (run_id, iteration, sample_index)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE (<200ms target)
-- =============================================================================

-- optimization_runs indexes
CREATE INDEX IF NOT EXISTS idx_optimization_runs_project_id
  ON optimization_runs(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_optimization_runs_status
  ON optimization_runs(project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_optimization_runs_optimizer_type
  ON optimization_runs(project_id, optimizer_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_optimization_runs_run_name
  ON optimization_runs(project_id, run_name);

-- GIN index for JSONB config queries (e.g., filtering by model, temperature)
CREATE INDEX IF NOT EXISTS idx_optimization_runs_config_gin
  ON optimization_runs USING GIN (config);

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_optimization_runs_metadata_gin
  ON optimization_runs USING GIN (metadata);

-- GIN index for tags array (e.g., filtering by tags)
CREATE INDEX IF NOT EXISTS idx_optimization_runs_tags_gin
  ON optimization_runs USING GIN (tags);

-- Composite index for performance queries (leaderboard, analytics)
CREATE INDEX IF NOT EXISTS idx_optimization_runs_performance
  ON optimization_runs(project_id, final_score DESC NULLS LAST, created_at DESC)
  WHERE status = 'completed';

-- optimization_iterations indexes
CREATE INDEX IF NOT EXISTS idx_optimization_iterations_run_id
  ON optimization_iterations(run_id, iteration);

CREATE INDEX IF NOT EXISTS idx_optimization_iterations_best
  ON optimization_iterations(run_id, score DESC)
  WHERE is_best = true;

-- GIN index for iteration params
CREATE INDEX IF NOT EXISTS idx_optimization_iterations_params_gin
  ON optimization_iterations USING GIN (params);

-- optimization_samples indexes
CREATE INDEX IF NOT EXISTS idx_optimization_samples_run_id
  ON optimization_samples(run_id, iteration, sample_index);

CREATE INDEX IF NOT EXISTS idx_optimization_samples_iteration_id
  ON optimization_samples(iteration_id);

CREATE INDEX IF NOT EXISTS idx_optimization_samples_program_hash
  ON optimization_samples(program_hash)
  WHERE program_hash IS NOT NULL;

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Update updated_at timestamp (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_optimization_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_optimization_runs_updated_at ON optimization_runs;
CREATE TRIGGER trigger_optimization_runs_updated_at
  BEFORE UPDATE ON optimization_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_runs_updated_at();

-- Auto-update run statistics when iterations change
CREATE OR REPLACE FUNCTION update_run_statistics_from_iterations()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the optimization_run with aggregated stats
  UPDATE optimization_runs
  SET
    iterations = (
      SELECT COALESCE(MAX(iteration), 0)
      FROM optimization_iterations
      WHERE run_id = NEW.run_id
    ),
    best_score = (
      SELECT MAX(score)
      FROM optimization_iterations
      WHERE run_id = NEW.run_id
    ),
    avg_latency_ms = (
      SELECT AVG(duration_ms)::INTEGER
      FROM optimization_iterations
      WHERE run_id = NEW.run_id AND duration_ms IS NOT NULL
    ),
    total_tokens = (
      SELECT SUM(tokens_used)
      FROM optimization_iterations
      WHERE run_id = NEW.run_id
    ),
    total_cost_usd = (
      SELECT SUM(cost_usd)
      FROM optimization_iterations
      WHERE run_id = NEW.run_id
    )
  WHERE id = NEW.run_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_run_statistics ON optimization_iterations;
CREATE TRIGGER trigger_update_run_statistics
  AFTER INSERT OR UPDATE ON optimization_iterations
  FOR EACH ROW
  EXECUTE FUNCTION update_run_statistics_from_iterations();

-- Mark best iteration when score improves
CREATE OR REPLACE FUNCTION mark_best_iteration()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset all is_best flags for this run
  UPDATE optimization_iterations
  SET is_best = false
  WHERE run_id = NEW.run_id;

  -- Set is_best for the iteration with highest score
  UPDATE optimization_iterations
  SET is_best = true
  WHERE run_id = NEW.run_id
    AND score = (
      SELECT MAX(score)
      FROM optimization_iterations
      WHERE run_id = NEW.run_id
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_best_iteration ON optimization_iterations;
CREATE TRIGGER trigger_mark_best_iteration
  AFTER INSERT OR UPDATE OF score ON optimization_iterations
  FOR EACH ROW
  EXECUTE FUNCTION mark_best_iteration();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE optimization_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_samples ENABLE ROW LEVEL SECURITY;

-- optimization_runs policies
DROP POLICY IF EXISTS "Service role has full access to optimization_runs" ON optimization_runs;
CREATE POLICY "Service role has full access to optimization_runs"
  ON optimization_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own project optimization_runs" ON optimization_runs;
CREATE POLICY "Users can manage own project optimization_runs"
  ON optimization_runs
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM project_config
      WHERE id = optimization_runs.project_id
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM project_config
      WHERE id = optimization_runs.project_id
    )
  );

-- optimization_iterations policies
DROP POLICY IF EXISTS "Service role has full access to optimization_iterations" ON optimization_iterations;
CREATE POLICY "Service role has full access to optimization_iterations"
  ON optimization_iterations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own project optimization_iterations" ON optimization_iterations;
CREATE POLICY "Users can manage own project optimization_iterations"
  ON optimization_iterations
  FOR ALL
  TO authenticated
  USING (
    run_id IN (
      SELECT id FROM optimization_runs
      WHERE project_id IN (
        SELECT id FROM project_config
      )
    )
  )
  WITH CHECK (
    run_id IN (
      SELECT id FROM optimization_runs
      WHERE project_id IN (
        SELECT id FROM project_config
      )
    )
  );

-- optimization_samples policies
DROP POLICY IF EXISTS "Service role has full access to optimization_samples" ON optimization_samples;
CREATE POLICY "Service role has full access to optimization_samples"
  ON optimization_samples
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own project optimization_samples" ON optimization_samples;
CREATE POLICY "Users can manage own project optimization_samples"
  ON optimization_samples
  FOR ALL
  TO authenticated
  USING (
    run_id IN (
      SELECT id FROM optimization_runs
      WHERE project_id IN (
        SELECT id FROM project_config
      )
    )
  )
  WITH CHECK (
    run_id IN (
      SELECT id FROM optimization_runs
      WHERE project_id IN (
        SELECT id FROM project_config
      )
    )
  );

-- =============================================================================
-- MATERIALIZED VIEW FOR ANALYTICS (Fast aggregations)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS optimization_run_analytics AS
SELECT
  or_main.project_id,
  or_main.optimizer_type,
  or_main.status,
  COUNT(DISTINCT or_main.id) AS total_runs,
  COUNT(DISTINCT CASE WHEN or_main.status = 'completed' THEN or_main.id END) AS completed_runs,
  COUNT(DISTINCT CASE WHEN or_main.status = 'failed' THEN or_main.id END) AS failed_runs,
  AVG(or_main.final_score) FILTER (WHERE or_main.status = 'completed') AS avg_final_score,
  MAX(or_main.final_score) FILTER (WHERE or_main.status = 'completed') AS max_final_score,
  AVG(or_main.improvement) FILTER (WHERE or_main.status = 'completed') AS avg_improvement,
  AVG(or_main.duration_ms) FILTER (WHERE or_main.status = 'completed') AS avg_duration_ms,
  SUM(or_main.samples_evaluated) AS total_samples_evaluated,
  SUM(or_main.total_tokens) AS total_tokens_used,
  SUM(or_main.total_cost_usd) AS total_cost_usd,
  MIN(or_main.created_at) AS first_run_at,
  MAX(or_main.created_at) AS last_run_at
FROM optimization_runs or_main
GROUP BY or_main.project_id, or_main.optimizer_type, or_main.status;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_optimization_run_analytics_pk
  ON optimization_run_analytics(project_id, optimizer_type, status);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_optimization_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY optimization_run_analytics;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get optimization run summary
CREATE OR REPLACE FUNCTION get_optimization_run_summary(p_run_id UUID)
RETURNS TABLE (
  run_id UUID,
  run_name TEXT,
  status TEXT,
  optimizer_type TEXT,
  initial_score NUMERIC,
  final_score NUMERIC,
  best_score NUMERIC,
  improvement NUMERIC,
  improvement_pct NUMERIC,
  iterations INTEGER,
  samples_evaluated INTEGER,
  duration_ms INTEGER,
  total_cost_usd NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    or_main.id,
    or_main.run_name,
    or_main.status,
    or_main.optimizer_type,
    or_main.initial_score,
    or_main.final_score,
    or_main.best_score,
    or_main.improvement,
    or_main.improvement_pct,
    or_main.iterations,
    or_main.samples_evaluated,
    or_main.duration_ms,
    or_main.total_cost_usd,
    or_main.created_at
  FROM optimization_runs or_main
  WHERE or_main.id = p_run_id;
END;
$$ LANGUAGE plpgsql;

-- Get top performing runs for a project
CREATE OR REPLACE FUNCTION get_top_runs_by_score(
  p_project_id TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  run_id UUID,
  run_name TEXT,
  optimizer_type TEXT,
  final_score NUMERIC,
  improvement NUMERIC,
  iterations INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    or_main.id,
    or_main.run_name,
    or_main.optimizer_type,
    or_main.final_score,
    or_main.improvement,
    or_main.iterations,
    or_main.created_at
  FROM optimization_runs or_main
  WHERE or_main.project_id = p_project_id
    AND or_main.status = 'completed'
    AND or_main.final_score IS NOT NULL
  ORDER BY or_main.final_score DESC, or_main.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON optimization_runs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON optimization_iterations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON optimization_samples TO authenticated, service_role;
GRANT SELECT ON optimization_run_analytics TO authenticated, service_role;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE optimization_runs IS 'Tracks DSPy optimization runs with metrics, configuration, and results';
COMMENT ON TABLE optimization_iterations IS 'Stores detailed metrics for each iteration within an optimization run';
COMMENT ON TABLE optimization_samples IS 'Records individual sample evaluations during optimization';
COMMENT ON MATERIALIZED VIEW optimization_run_analytics IS 'Aggregated analytics for optimization runs by project and optimizer type';

COMMENT ON COLUMN optimization_runs.config IS 'JSONB storing optimizer parameters, model settings, temperature, etc.';
COMMENT ON COLUMN optimization_runs.best_program IS 'The best performing program/prompt discovered during optimization';
COMMENT ON COLUMN optimization_runs.tags IS 'Array of tags for categorization and filtering (e.g., ["production", "experiment-1"])';
COMMENT ON COLUMN optimization_runs.improvement_pct IS 'Percentage improvement from initial to final score';

-- =============================================================================
-- ROLLBACK SCRIPT (commented out for safety)
-- =============================================================================

-- To rollback this migration, run:
/*
DROP MATERIALIZED VIEW IF EXISTS optimization_run_analytics CASCADE;
DROP FUNCTION IF EXISTS refresh_optimization_analytics() CASCADE;
DROP FUNCTION IF EXISTS get_optimization_run_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_top_runs_by_score(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS mark_best_iteration() CASCADE;
DROP FUNCTION IF EXISTS update_run_statistics_from_iterations() CASCADE;
DROP FUNCTION IF EXISTS update_optimization_runs_updated_at() CASCADE;
DROP TABLE IF EXISTS optimization_samples CASCADE;
DROP TABLE IF EXISTS optimization_iterations CASCADE;
DROP TABLE IF EXISTS optimization_runs CASCADE;
*/

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

COMMIT;
