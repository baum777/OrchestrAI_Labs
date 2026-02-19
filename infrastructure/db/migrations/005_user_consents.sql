-- 005_user_consents.sql
-- DSGVO Compliance: Consent Management
-- Tracks user consent for data processing

BEGIN;

CREATE TABLE IF NOT EXISTS user_consents (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  consent_type    TEXT NOT NULL,
  granted         BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one consent record per user per type
  UNIQUE(user_id, consent_type)
);

-- Index for fast consent lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_type
  ON user_consents (user_id, consent_type);

-- Index for consent history
CREATE INDEX IF NOT EXISTS idx_user_consents_user_time
  ON user_consents (user_id, created_at DESC);

-- Consent types:
-- - 'data_processing': General data processing consent (DSGVO Art. 6)
-- - 'marketing': Marketing communications consent
-- - 'analytics': Analytics/tracking consent
-- - 'customer_data_access': Consent for agent to access customer data

COMMENT ON TABLE user_consents IS 'DSGVO-compliant consent tracking for user data processing';
COMMENT ON COLUMN user_consents.consent_type IS 'Type of consent: data_processing, marketing, analytics, customer_data_access';
COMMENT ON COLUMN user_consents.granted IS 'Whether consent is currently granted';
COMMENT ON COLUMN user_consents.granted_at IS 'Timestamp when consent was granted';
COMMENT ON COLUMN user_consents.revoked_at IS 'Timestamp when consent was revoked (right to withdraw)';

COMMIT;

