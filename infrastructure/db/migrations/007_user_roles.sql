-- 007_user_roles.sql
-- RBAC: User Roles and Permissions
-- Implements role-based access control with permission matrix
-- ISO 27001: A.9.2.1 (User registration), A.9.2.3 (Privileged access management)

BEGIN;

-- User roles table
-- Roles: admin, reviewer, user, partner
-- Hierarchy: admin > reviewer > user (admin can do everything reviewer can, etc.)
CREATE TABLE IF NOT EXISTS user_roles (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'user', 'partner')),
  granted_by      TEXT, -- User ID who granted this role
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one active role per user (soft-delete via revoked_at)
  UNIQUE(user_id, role) WHERE revoked_at IS NULL
);

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active
  ON user_roles (user_id) WHERE revoked_at IS NULL;

-- Index for role history
CREATE INDEX IF NOT EXISTS idx_user_roles_user_time
  ON user_roles (user_id, granted_at DESC);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_roles_role_active
  ON user_roles (role) WHERE revoked_at IS NULL;

-- User permissions table (explicit permissions, independent of roles)
-- Permissions are additive: user gets permissions from role + explicit permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  permission      TEXT NOT NULL, -- Permission string (e.g., 'customer_data.read', 'project.manage')
  granted_by      TEXT, -- User ID who granted this permission
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one active permission per user per permission type
  UNIQUE(user_id, permission) WHERE revoked_at IS NULL
);

-- Index for fast permission lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_active
  ON user_permissions (user_id) WHERE revoked_at IS NULL;

-- Index for permission-based queries
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_active
  ON user_permissions (permission) WHERE revoked_at IS NULL;

-- Role-to-permission mapping (default permissions per role)
-- This table defines which permissions each role has by default
CREATE TABLE IF NOT EXISTS role_permissions (
  role            TEXT NOT NULL PRIMARY KEY CHECK (role IN ('admin', 'reviewer', 'user', 'partner')),
  permissions     JSONB NOT NULL, -- Array of permission strings
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default role permissions
-- Admin: all permissions
INSERT INTO role_permissions (role, permissions) VALUES
  ('admin', '["knowledge.read", "knowledge.search", "project.read", "project.update", "project.manage", "decision.create", "decision.read", "log.write", "review.request", "review.approve", "review.reject", "customer_data.read", "marketing.generate"]'::jsonb),
  ('reviewer', '["knowledge.read", "knowledge.search", "project.read", "decision.read", "review.request", "review.approve", "review.reject"]'::jsonb),
  ('user', '["knowledge.read", "knowledge.search", "project.read", "decision.create", "decision.read", "review.request"]'::jsonb),
  ('partner', '["knowledge.read", "knowledge.search", "project.read", "decision.read", "review.request", "review.approve", "review.reject"]'::jsonb)
ON CONFLICT (role) DO NOTHING;

COMMENT ON TABLE user_roles IS 'User role assignments with audit trail (who granted, when)';
COMMENT ON TABLE user_permissions IS 'Explicit user permissions (additive to role permissions)';
COMMENT ON TABLE role_permissions IS 'Default permission matrix per role (role hierarchy: admin > reviewer > user)';
COMMENT ON COLUMN user_roles.role IS 'User role: admin (full access), reviewer (can approve/reject), user (standard), partner (external reviewer)';
COMMENT ON COLUMN user_permissions.permission IS 'Permission string matching Permission type from shared/src/types/agent.ts';

COMMIT;

