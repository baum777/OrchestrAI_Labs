-- Migration: Capacity Quota Tables
-- Purpose: Store tenant quotas and track token usage

CREATE TABLE IF NOT EXISTS tenant_quotas (
    tenant_id VARCHAR(64) PRIMARY KEY,
    daily_tokens BIGINT NOT NULL DEFAULT 100000,
    max_concurrent INTEGER NOT NULL DEFAULT 10,
    max_queue_depth INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_usage_daily (
    tenant_id VARCHAR(64) NOT NULL,
    usage_date DATE NOT NULL,
    tokens_used BIGINT NOT NULL DEFAULT 0,
    tokens_remaining BIGINT NOT NULL DEFAULT 100000,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, usage_date)
);

CREATE TABLE IF NOT EXISTS capacity_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    violation_type VARCHAR(32) NOT NULL CHECK (violation_type IN ('rate_limit', 'token_cap', 'concurrent_limit', 'queue_full')),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    details JSONB,
    resolved BOOLEAN NOT NULL DEFAULT false
);

-- Indexes
CREATE INDEX idx_tenant_quotas_lookup ON tenant_quotas(tenant_id);
CREATE INDEX idx_token_usage_lookup ON token_usage_daily(tenant_id, usage_date);
CREATE INDEX idx_capacity_violations_tenant ON capacity_violations(tenant_id, occurred_at);

-- Default quotas for common roles
INSERT INTO tenant_quotas (tenant_id, daily_tokens, max_concurrent, max_queue_depth) VALUES
    ('default', 100000, 10, 100),
    ('premium', 500000, 50, 500),
    ('enterprise', 2000000, 200, 2000)
ON CONFLICT (tenant_id) DO NOTHING;
