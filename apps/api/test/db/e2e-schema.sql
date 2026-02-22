-- E2E Test Schema for OrchestrAI Labs
-- Minimal schema subset required for E2E test suites:
--   - audit-logging
--   - consent-management
--   - rbac
--   - data-deletion
--   - golden-tasks

-- ========================================================
-- SECTION 1: Schema Creation (Idempotent)
-- ========================================================

-- Projects table (required by: golden-tasks, audit-logging, consent-management, rbac, data-deletion)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  phase TEXT DEFAULT 'discovery',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decisions table (required by: data-deletion, golden-tasks)
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
  assumptions JSONB DEFAULT '[]'::jsonb,
  alternatives JSONB DEFAULT '[]'::jsonb,
  risks JSONB DEFAULT '[]'::jsonb,
  success_criteria JSONB DEFAULT '[]'::jsonb,
  next_steps JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Review Requests table (required by: golden-tasks, data-deletion)
CREATE TABLE IF NOT EXISTS review_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id TEXT,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  payload_json JSONB DEFAULT null,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewer_roles JSONB DEFAULT '["senior"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  commit_token_hash TEXT,
  commit_token_used BOOLEAN DEFAULT false,
  commit_token_issued_at TIMESTAMPTZ
);

-- Action Logs table (required by: audit-logging, data-deletion, golden-tasks)
CREATE TABLE IF NOT EXISTS action_logs (
  id SERIAL PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  agent_id TEXT,
  action TEXT NOT NULL,
  input_json JSONB,
  output_json JSONB,
  reason TEXT,
  blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Consents table (required by: consent-management)
CREATE TABLE IF NOT EXISTS user_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

-- RBAC Tables (required by: rbac)
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'user', 'partner')),
  granted_by TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted_by TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL PRIMARY KEY CHECK (role IN ('admin', 'reviewer', 'user', 'partner')),
  permissions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================================
-- SECTION 2: Indexes for Test Performance
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_owner ON decisions(owner);
CREATE INDEX IF NOT EXISTS idx_review_requests_project_id ON review_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_user_id ON review_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_project_id ON action_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_action ON action_logs(action);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- ========================================================
-- SECTION 3: Seed Data for RBAC (Deterministic)
-- ========================================================

INSERT INTO role_permissions (role, permissions) VALUES
  ('admin', '["knowledge.read", "knowledge.search", "project.read", "project.update", "project.manage", "decision.create", "decision.read", "log.write", "review.request", "review.approve", "review.reject", "customer_data.read", "marketing.generate"]'::jsonb),
  ('reviewer', '["knowledge.read", "knowledge.search", "project.read", "decision.read", "review.request", "review.approve", "review.reject"]'::jsonb),
  ('user', '["knowledge.read", "knowledge.search", "project.read", "decision.create", "decision.read", "review.request"]'::jsonb),
  ('partner', '["knowledge.read", "knowledge.search", "project.read", "decision.read", "review.request", "review.approve", "review.reject"]'::jsonb)
ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = now();

-- ========================================================
-- SECTION 4: Deterministic Reset for Test Isolation
-- ========================================================
-- Use this section to reset all E2E test data between test runs
-- Run: TRUNCATE with RESTART IDENTITY CASCADE on all tables

-- Note: This is executed separately via the apply-e2e-schema.ts runner
-- when RESET=true is set, or before each test suite in beforeAll
