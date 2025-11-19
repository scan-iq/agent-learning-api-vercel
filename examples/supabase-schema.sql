-- Iris Prime API - Supabase Schema
-- 
-- This schema supports the authentication and validation system

-- 1. Create project_config table for API key management
CREATE TABLE IF NOT EXISTS project_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create index for fast API key lookups
CREATE INDEX IF NOT EXISTS idx_project_config_api_key 
  ON project_config(api_key);

-- 3. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_project_config_updated_at ON project_config;
CREATE TRIGGER update_project_config_updated_at
  BEFORE UPDATE ON project_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security
ALTER TABLE project_config ENABLE ROW LEVEL SECURITY;

-- 6. Create policy for service role (full access)
DROP POLICY IF EXISTS "Service role has full access" ON project_config;
CREATE POLICY "Service role has full access"
  ON project_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Create policy for authenticated users (read own projects only)
DROP POLICY IF EXISTS "Users can read own projects" ON project_config;
CREATE POLICY "Users can read own projects"
  ON project_config
  FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT id FROM project_config
    WHERE created_by = auth.uid()
  ));

-- 8. Create event tables (if they don't exist)

-- Global metrics / telemetry
CREATE TABLE IF NOT EXISTS global_metrics_supabase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES project_config(id) ON DELETE CASCADE,
  agent_id TEXT,
  session_id TEXT,
  event TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_metrics_project 
  ON global_metrics_supabase(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_global_metrics_session 
  ON global_metrics_supabase(session_id) WHERE session_id IS NOT NULL;

-- Signature events
CREATE TABLE IF NOT EXISTS signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES project_config(id) ON DELETE CASCADE,
  signature_name TEXT NOT NULL,
  signature TEXT NOT NULL,
  input_fields JSONB NOT NULL,
  output_fields JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signature_events_project 
  ON signature_events(project_id, timestamp DESC);

-- Reflexion events
CREATE TABLE IF NOT EXISTS reflexion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES project_config(id) ON DELETE CASCADE,
  agent_id TEXT,
  session_id TEXT,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('correct', 'incorrect', 'partial')),
  reasoning TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reflexion_events_project 
  ON reflexion_events(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reflexion_events_verdict 
  ON reflexion_events(project_id, verdict);

-- Consensus events
CREATE TABLE IF NOT EXISTS consensus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES project_config(id) ON DELETE CASCADE,
  consensus_id TEXT NOT NULL,
  agent_id TEXT,
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
  reasoning TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consensus_events_project 
  ON consensus_events(project_id, consensus_id, timestamp DESC);

-- 9. Create view for project statistics
CREATE OR REPLACE VIEW project_statistics AS
SELECT
  pc.id AS project_id,
  pc.name AS project_name,
  COUNT(DISTINCT gm.session_id) AS total_sessions,
  COUNT(gm.id) AS total_events,
  COUNT(re.id) AS total_reflexions,
  COUNT(se.id) AS total_signatures,
  COUNT(ce.id) AS total_consensus_votes,
  pc.created_at,
  pc.updated_at
FROM project_config pc
LEFT JOIN global_metrics_supabase gm ON pc.id = gm.project_id
LEFT JOIN reflexion_events re ON pc.id = re.project_id
LEFT JOIN signature_events se ON pc.id = se.project_id
LEFT JOIN consensus_events ce ON pc.id = ce.project_id
GROUP BY pc.id, pc.name, pc.created_at, pc.updated_at;

-- 10. Grant permissions
GRANT SELECT ON project_statistics TO authenticated, service_role;

-- 11. Example: Insert a test project
-- INSERT INTO project_config (id, name, api_key, settings)
-- VALUES (
--   'proj_test_123',
--   'Test Project',
--   'sk_test_abc123def456',
--   '{"rateLimit": {"maxRequests": 1000, "windowMs": 60000}}'::jsonb
-- );

-- 12. Example: Query API key
-- SELECT id, name, settings 
-- FROM project_config 
-- WHERE api_key = 'sk_test_abc123def456';

COMMIT;
