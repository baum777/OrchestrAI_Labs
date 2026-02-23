-- Migration: Prompt Audit Table
-- Purpose: Audit trail for prompt firewall decisions
-- NOTE: Do NOT store raw prompts here (policy compliance)

CREATE TABLE IF NOT EXISTS prompt_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_hash VARCHAR(64) NOT NULL, -- SHA-256 of prompt
    prompt_preview VARCHAR(200), -- Truncated first 200 chars (optional)
    risk_score INTEGER NOT NULL,
    blocked BOOLEAN NOT NULL,
    reasons JSONB NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'anonymous',
    user_id VARCHAR(64) NOT NULL DEFAULT 'anonymous',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX idx_prompt_audit_tenant ON prompt_audit(tenant_id, created_at);
CREATE INDEX idx_prompt_audit_blocked ON prompt_audit(blocked, created_at) WHERE blocked = true;
CREATE INDEX idx_prompt_audit_hash ON prompt_audit(prompt_hash);

-- Retention: 1 year (per retention_policy.yaml)
COMMENT ON TABLE prompt_audit IS 'Audit trail for prompt firewall decisions. Never store raw prompts.';
