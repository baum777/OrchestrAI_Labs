-- Bootstrap First Admin User
-- 
-- This script creates the first admin user after migration 007_user_roles.sql.
-- Run this script manually after the migration to create the initial admin user.
--
-- Usage:
--   1. Replace 'YOUR_ADMIN_USER_ID' with the actual user ID
--   2. Run: psql -d your_database -f 007_user_roles_bootstrap.sql
--
-- IMPORTANT: This is a one-time setup script. Do not run it multiple times
-- unless you want to create multiple admin users.

BEGIN;

-- Insert admin role for the first admin user
-- Replace 'YOUR_ADMIN_USER_ID' with the actual user ID
INSERT INTO user_roles (id, user_id, role, granted_by, granted_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'YOUR_ADMIN_USER_ID',  -- ⚠️ REPLACE THIS with actual user ID
  'admin',
  'system',              -- System bootstrap
  now(),
  now(),
  now()
)
ON CONFLICT (user_id, role) WHERE revoked_at IS NULL DO NOTHING;

-- Verify the admin role was created
SELECT 
  user_id,
  role,
  granted_at,
  granted_by
FROM user_roles
WHERE user_id = 'YOUR_ADMIN_USER_ID'  -- ⚠️ REPLACE THIS with actual user ID
  AND role = 'admin'
  AND revoked_at IS NULL;

COMMIT;

-- Break-Glass Procedure (Emergency Admin Access)
-- 
-- If you need to create an admin user in an emergency:
--
-- 1. Connect to the database directly (bypass application)
-- 2. Run this SQL:
--
--    INSERT INTO user_roles (id, user_id, role, granted_by, granted_at, created_at, updated_at)
--    VALUES (
--      gen_random_uuid(),
--      'emergency_admin_user_id',
--      'admin',
--      'break_glass',
--      now(),
--      now(),
--      now()
--    )
--    ON CONFLICT (user_id, role) WHERE revoked_at IS NULL DO UPDATE SET
--      revoked_at = NULL,
--      updated_at = now();
--
-- 3. Document the break-glass action in your incident log
-- 4. Review and revoke the emergency admin role after resolving the issue

