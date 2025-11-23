-- Create optimization_runs table for tracking optimization experiments
-- Supports filtering, pagination, and aggregations

CREATE TABLE IF NOT EXISTS public.optimization_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id text NOT NULL,

  -- Run identification
  run_name text,
  optimizer_type text NOT NULL CHECK (optimizer_type IN ('bayesian', 'grid_search', 'random_search', 'genetic', 'gradient_descent')),

  -- Status tracking
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- Configuration
  config jsonb NOT NULL DEFAULT '{}',
  search_space jsonb DEFAULT '{}',

  -- Results
  final_score numeric,
  best_params jsonb,
  metadata jsonb DEFAULT '{}',

  -- Metrics
  iterations_count integer DEFAULT 0,
  duration_ms bigint,
  error_message text,

  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,

  CONSTRAINT optimization_runs_pkey PRIMARY KEY (id)
);

-- Create optimization_iterations table for tracking individual iterations
CREATE TABLE IF NOT EXISTS public.optimization_iterations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,

  -- Iteration tracking
  iteration_number integer NOT NULL,

  -- Parameters and results
  params jsonb NOT NULL,
  score numeric NOT NULL,
  metrics jsonb DEFAULT '{}',

  -- Metadata
  metadata jsonb DEFAULT '{}',
  duration_ms integer,

  -- Timestamp
  created_at timestamp with time zone DEFAULT now(),

  CONSTRAINT optimization_iterations_pkey PRIMARY KEY (id),
  CONSTRAINT optimization_iterations_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.optimization_runs(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_optimization_runs_project_id ON public.optimization_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_status ON public.optimization_runs(status);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_optimizer_type ON public.optimization_runs(optimizer_type);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_created_at ON public.optimization_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_final_score ON public.optimization_runs(final_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_duration_ms ON public.optimization_runs(duration_ms);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_optimization_runs_project_status ON public.optimization_runs(project_id, status);

-- Indexes for iterations
CREATE INDEX IF NOT EXISTS idx_optimization_iterations_run_id ON public.optimization_iterations(run_id);
CREATE INDEX IF NOT EXISTS idx_optimization_iterations_iteration_number ON public.optimization_iterations(run_id, iteration_number);
CREATE INDEX IF NOT EXISTS idx_optimization_iterations_score ON public.optimization_iterations(score DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_optimization_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER optimization_runs_updated_at_trigger
  BEFORE UPDATE ON public.optimization_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_runs_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.optimization_runs IS 'Tracks optimization experiment runs with filtering and pagination support';
COMMENT ON TABLE public.optimization_iterations IS 'Individual iterations within optimization runs';
COMMENT ON COLUMN public.optimization_runs.optimizer_type IS 'Type of optimizer: bayesian, grid_search, random_search, genetic, gradient_descent';
COMMENT ON COLUMN public.optimization_runs.status IS 'Current status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN public.optimization_runs.final_score IS 'Best score achieved during optimization';
COMMENT ON COLUMN public.optimization_runs.best_params IS 'Parameters that achieved the best score';
