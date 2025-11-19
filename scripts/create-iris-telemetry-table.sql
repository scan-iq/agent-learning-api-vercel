-- IRIS Telemetry Table
-- Stores telemetry events from IRIS Prime agents across all projects

CREATE TABLE IF NOT EXISTS iris_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project and expert identification
  project_id TEXT NOT NULL,
  expert_id TEXT NOT NULL,

  -- Telemetry data
  confidence DECIMAL(5,4), -- 0.0000 to 1.0000
  latency_ms INTEGER,
  outcome TEXT, -- success, error, timeout, etc.
  event_type TEXT DEFAULT 'telemetry',

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_project ON iris_telemetry(project_id);
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_expert ON iris_telemetry(expert_id);
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_created ON iris_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iris_telemetry_project_created ON iris_telemetry(project_id, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE iris_telemetry IS 'Telemetry events from IRIS Prime AI agents';
COMMENT ON COLUMN iris_telemetry.expert_id IS 'Identifier for the expert/agent that generated this telemetry';
COMMENT ON COLUMN iris_telemetry.confidence IS 'Confidence score from 0 to 1';
COMMENT ON COLUMN iris_telemetry.latency_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN iris_telemetry.outcome IS 'Result status: success, error, timeout, etc.';
COMMENT ON COLUMN iris_telemetry.metadata IS 'Additional telemetry data in JSON format';
