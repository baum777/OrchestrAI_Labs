BEGIN;

-- Extend decisions domain to support structured draft/final lifecycle.
-- project_id stays ON DELETE SET NULL to preserve audit history when projects are removed.
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS owner_role TEXT NULL,
  ADD COLUMN IF NOT EXISTS assumptions JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS derivation TEXT NULL,
  ADD COLUMN IF NOT EXISTS risks JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS client_context TEXT NULL,
  ADD COLUMN IF NOT EXISTS comms_context TEXT NULL,
  ADD COLUMN IF NOT EXISTS client_implications TEXT NULL,
  ADD COLUMN IF NOT EXISTS goal TEXT NULL,
  ADD COLUMN IF NOT EXISTS success_criteria JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS next_steps JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS review_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS review_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS draft_id TEXT NULL;

UPDATE decisions
SET alternatives = '[]'::jsonb
WHERE alternatives IS NULL;

ALTER TABLE decisions
  ALTER COLUMN alternatives SET DEFAULT '[]'::jsonb,
  ALTER COLUMN alternatives SET NOT NULL;

UPDATE decisions
SET derivation = COALESCE(derivation, decision, rationale)
WHERE derivation IS NULL AND (decision IS NOT NULL OR rationale IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_decisions_status_time
  ON decisions (status, created_at DESC);

COMMIT;

