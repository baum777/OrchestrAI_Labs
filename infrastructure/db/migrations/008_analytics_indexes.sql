-- 008_analytics_indexes.sql
-- Performance guardrails for Analytics v1 (action_logs queries).
-- Add indexes for: action, client_id (project_id, agent_id already indexed).

BEGIN;

-- Index on action for filtering by action type (escalation, skill.executed, etc.)
CREATE INDEX IF NOT EXISTS idx_action_logs_action
  ON action_logs (action);

-- Index on created_at for time-range queries (primary filter)
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at
  ON action_logs (created_at DESC);

-- Index on client_id for tenant-scoped analytics
CREATE INDEX IF NOT EXISTS idx_action_logs_client_time
  ON action_logs (client_id, created_at DESC);

COMMIT;
