-- 004_project_phases.sql
-- Add phase column to projects table for restart-safe persistence.

BEGIN;

-- Add phase column to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'discovery'
    CHECK (phase IN ('discovery', 'analysis', 'design', 'implementation', 'review', 'closed'));

-- Create index for phase queries
CREATE INDEX IF NOT EXISTS idx_projects_phase
  ON projects (phase);

COMMIT;

