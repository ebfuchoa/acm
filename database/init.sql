CREATE TABLE IF NOT EXISTS schema_version (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO schema_version (version)
SELECT 'v1_initial'
WHERE NOT EXISTS (SELECT 1 FROM schema_version WHERE version = 'v1_initial');
