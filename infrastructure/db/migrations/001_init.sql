-- 001_init.sql
-- Requires: PostgreSQL + (optional later) pgcrypto for uuid generation.
-- For MVP we store ids as text and generate in app.

BEGIN;

CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  client_id     TEXT,
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only action log (audit trail)
CREATE TABLE IF NOT EXISTS action_logs (
  id            BIGSERIAL PRIMARY KEY,
  project_id    TEXT REFERENCES projects(id) ON DELETE SET NULL,
  client_id     TEXT,
  user_id       TEXT NOT NULL,
  agent_id      TEXT NOT NULL,
  action        TEXT NOT NULL,
  input_json    JSONB NOT NULL,
  output_json   JSONB NOT NULL,
  blocked       BOOLEAN NOT NULL DEFAULT FALSE,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_logs_project_time
  ON action_logs (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_logs_agent_time
  ON action_logs (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_logs_user_time
  ON action_logs (user_id, created_at DESC);

-- Review workflow: request
CREATE TABLE IF NOT EXISTS review_requests (
  id              TEXT PRIMARY KEY,
  project_id       TEXT REFERENCES projects(id) ON DELETE SET NULL,
  client_id        TEXT,
  user_id          TEXT NOT NULL,
  agent_id         TEXT NOT NULL,
  permission       TEXT NOT NULL,
  payload_json     JSONB NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewer_roles   JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_review_requests_status_time
  ON review_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_requests_project_time
  ON review_requests (project_id, created_at DESC);

-- Review actions (history)
CREATE TABLE IF NOT EXISTS review_actions (
  id              BIGSERIAL PRIMARY KEY,
  review_id        TEXT NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
  reviewer_user_id TEXT NOT NULL,
  action           TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'comment')),
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_actions_review_time
  ON review_actions (review_id, created_at DESC);

-- Optional but very useful for consulting: decisions
CREATE TABLE IF NOT EXISTS decisions (
  id            TEXT PRIMARY KEY,
  project_id    TEXT REFERENCES projects(id) ON DELETE SET NULL,
  client_id     TEXT,
  title         TEXT NOT NULL,
  decision      TEXT NOT NULL,
  rationale     TEXT,
  alternatives  JSONB,
  owner         TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_project_time
  ON decisions (project_id, created_at DESC);

COMMIT;

