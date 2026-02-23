/**
 * Document ACL Manager
 *
 * Manages access control for individual knowledge documents.
 */

import { Injectable, Inject } from '@nestjs/common';
import { PG_POOL } from '../../../apps/api/src/db/db.module';
import type { Pool } from 'pg';

export interface ACLRule {
  documentId: string;
  tenantId: string;
  projectId?: string;
  ownerUserId?: string;
  readRoles: string[];
  writeRoles: string[];
}

@Injectable()
export class DocumentACL {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  /**
   * Set ACL for a document
   */
  async setACL(rule: ACLRule): Promise<void> {
    await this.pool.query(
      `INSERT INTO knowledge_document_acl
       (document_id, tenant_id, project_id, owner_user_id, read_roles, write_roles)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (document_id, tenant_id) DO UPDATE SET
         project_id = EXCLUDED.project_id,
         owner_user_id = EXCLUDED.owner_user_id,
         read_roles = EXCLUDED.read_roles,
         write_roles = EXCLUDED.write_roles,
         updated_at = NOW()`,
      [
        rule.documentId,
        rule.tenantId,
        rule.projectId || null,
        rule.ownerUserId || null,
        rule.readRoles,
        rule.writeRoles,
      ]
    );
  }

  /**
   * Check if user can read document
   */
  async canRead(documentId: string, tenantId: string, userId?: string, userRole?: string): Promise<boolean> {
    // First check tenant match
    const aclResult = await this.pool.query(
      `SELECT read_roles, owner_user_id FROM knowledge_document_acl
       WHERE document_id = $1 AND tenant_id = $2`,
      [documentId, tenantId]
    );

    if (aclResult.rows.length === 0) {
      // Document doesn't exist or has no ACL
      return false;
    }

    const acl = aclResult.rows[0];

    // Owner can always read
    if (acl.owner_user_id === userId) {
      return true;
    }

    // Check role-based access
    if (userRole && acl.read_roles.includes(userRole)) {
      return true;
    }

    return false;
  }

  /**
   * Get ACL for document
   */
  async getACL(documentId: string, tenantId: string): Promise<ACLRule | null> {
    const result = await this.pool.query(
      `SELECT document_id, tenant_id, project_id, owner_user_id, read_roles, write_roles
       FROM knowledge_document_acl WHERE document_id = $1 AND tenant_id = $2`,
      [documentId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      documentId: row.document_id,
      tenantId: row.tenant_id,
      projectId: row.project_id,
      ownerUserId: row.owner_user_id,
      readRoles: row.read_roles,
      writeRoles: row.write_roles,
    };
  }
}
