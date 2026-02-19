-- Rollback Migration: 007_user_roles.sql
--
-- This script rolls back the RBAC migration by dropping the user roles tables.
-- WARNING: This will DELETE ALL role and permission data!
--
-- Usage:
--   psql -d your_database -f 007_user_roles_rollback.sql
--
-- IMPORTANT: 
--   - Backup your database before running this script
--   - This operation is IRREVERSIBLE
--   - All user roles and permissions will be lost
--   - Consider exporting data first if you need to restore later

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_user_roles_user_active;
DROP INDEX IF EXISTS idx_user_roles_user_time;
DROP INDEX IF EXISTS idx_user_roles_role_active;
DROP INDEX IF EXISTS idx_user_permissions_user_active;
DROP INDEX IF EXISTS idx_user_permissions_permission_active;

-- Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;

-- Verify tables are dropped
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_roles', 'user_permissions', 'role_permissions');

-- Should return 0 rows

COMMIT;

-- Post-Rollback Checklist:
-- [ ] Verify all tables are dropped
-- [ ] Update application code to remove RBAC dependencies
-- [ ] Remove PolicyEngine PermissionResolver integration
-- [ ] Update API endpoints to remove authorization checks
-- [ ] Test application functionality
-- [ ] Document rollback in incident log

