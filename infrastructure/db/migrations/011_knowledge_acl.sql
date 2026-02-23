-- Migration: Knowledge ACL and Search Audit Tables
-- Purpose: Row-level security for knowledge documents

CREATE TABLE IF NOT EXISTS knowledge_document_acl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    owner_user_id VARCHAR(64),
    read_roles TEXT[],
    write_roles TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS knowledge_search_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    query_hash VARCHAR(64) NOT NULL, -- SHA-256 of query, not raw query
    scope_filter TEXT NOT NULL, -- JSON of applied scope filters
    result_count INTEGER NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    blocked_attempt BOOLEAN NOT NULL DEFAULT false
);

-- Indexes
CREATE INDEX idx_knowledge_acl_lookup ON knowledge_document_acl(document_id, tenant_id);
CREATE INDEX idx_knowledge_acl_tenant ON knowledge_document_acl(tenant_id);
CREATE INDEX idx_knowledge_audit_tenant ON knowledge_search_audit(tenant_id, accessed_at);
CREATE INDEX idx_knowledge_audit_user ON knowledge_search_audit(user_id, accessed_at);
