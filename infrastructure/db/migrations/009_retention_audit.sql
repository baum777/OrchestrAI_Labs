-- Migration: Retention Audit Table
-- Purpose: Store audit proofs for data retention operations

CREATE TABLE IF NOT EXISTS retention_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(64) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    batch_checksum VARCHAR(64) NOT NULL, -- SHA-256 hex
    record_count INTEGER NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    triggered_by VARCHAR(16) NOT NULL CHECK (triggered_by IN ('cron', 'manual', 'api')),
    dry_run BOOLEAN NOT NULL DEFAULT false,
    verification_hash VARCHAR(128), -- Optional HMAC for tamper detection
    archive_location VARCHAR(512),
    policy_version VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_retention_audit_category ON retention_audit(category);
CREATE INDEX idx_retention_audit_deleted_at ON retention_audit(deleted_at);
CREATE INDEX idx_retention_audit_dry_run ON retention_audit(dry_run) WHERE dry_run = false;

-- Comment for documentation
COMMENT ON TABLE retention_audit IS 'Audit trail for data retention operations with cryptographic proof';
