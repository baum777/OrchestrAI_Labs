-- 009_analytics_read_permission.sql
-- Add analytics.read permission to admin and reviewer roles for Analytics v1 Security Hardening.
-- Data migration only (no schema change).

BEGIN;

UPDATE role_permissions
SET permissions = permissions || '["analytics.read"]'::jsonb
WHERE role IN ('admin', 'reviewer')
  AND NOT (permissions @> '["analytics.read"]'::jsonb);

COMMIT;
