-- IRIS API Keys Table
-- Supports multiple API keys per project with labels, usage tracking, and rotation

CREATE TABLE IF NOT EXISTS iris_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project identification
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,

  -- API key (hashed for security)
  api_key_hash TEXT NOT NULL UNIQUE,
  api_key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "sk_live_...")

  -- Metadata
  label TEXT NOT NULL, -- User-friendly label (e.g., "Production", "Staging", "CI/CD")

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,

  -- Ensure one label per project (optional constraint)
  CONSTRAINT unique_project_label UNIQUE (project_id, label)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_iris_api_keys_hash ON iris_api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_iris_api_keys_project ON iris_api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_iris_api_keys_active ON iris_api_keys(is_active) WHERE is_active = true;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_iris_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER iris_api_keys_updated_at
  BEFORE UPDATE ON iris_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_iris_api_keys_updated_at();

-- RLS Policies (if using Row Level Security)
-- ALTER TABLE iris_api_keys ENABLE ROW LEVEL SECURITY;

-- Grant access to service role (adjust as needed)
-- GRANT ALL ON iris_api_keys TO service_role;

-- Helper function to increment usage count atomically
CREATE OR REPLACE FUNCTION increment_usage_count(key_id UUID)
RETURNS BIGINT AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE iris_api_keys
  SET usage_count = usage_count + 1
  WHERE id = key_id
  RETURNING usage_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE iris_api_keys IS 'API keys for IRIS Prime projects with usage tracking and rotation support';
COMMENT ON COLUMN iris_api_keys.api_key_hash IS 'SHA-256 hash of the API key for secure storage';
COMMENT ON COLUMN iris_api_keys.api_key_prefix IS 'First 8 characters of the API key for display purposes (e.g., sk_live_AbCd...)';
COMMENT ON COLUMN iris_api_keys.label IS 'User-friendly label to identify the key purpose';
COMMENT ON COLUMN iris_api_keys.usage_count IS 'Number of times this API key has been used';
COMMENT ON COLUMN iris_api_keys.last_used_at IS 'Timestamp of last successful authentication with this key';
