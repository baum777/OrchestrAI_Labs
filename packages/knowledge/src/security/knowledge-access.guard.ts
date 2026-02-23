import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ScopeValidator } from './scope-validator';
import { DocumentACL } from './document-acl';
import { Inject } from '@nestjs/common';
import { PG_POOL } from '../../../apps/api/src/db/db.module';
import type { Pool } from 'pg';

@Injectable()
export class KnowledgeAccessGuard implements CanActivate {
  constructor(
    private readonly scopeValidator: ScopeValidator,
    private readonly documentACL: DocumentACL,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.query?.tenantId || request.headers['x-tenant-id'];
    const userId = request.user?.id || request.headers['x-user-id'];
    const userRole = request.user?.role || request.headers['x-role'];

    if (!tenantId) {
      throw new UnauthorizedException('Missing tenant_id');
    }

    // Validate scope
    const scopeResult = this.scopeValidator.validate({
      tenantId,
      userId,
      role: userRole,
    });

    if (!scopeResult.valid) {
      throw new UnauthorizedException(scopeResult.error);
    }

    // Log the search attempt
    const queryHash = this.hashQuery(JSON.stringify(request.query));
    await this.pool.query(
      `INSERT INTO knowledge_search_audit
       (tenant_id, user_id, query_hash, scope_filter, result_count, blocked_attempt)
       VALUES ($1, $2, $3, $4, 0, false)`,
      [tenantId, userId || 'anonymous', queryHash, JSON.stringify(scopeResult.scopeFilter)]
    );

    // Attach scope filter to request for downstream use
    request.knowledgeScope = scopeResult.scopeFilter;

    return true;
  }

  private hashQuery(query: string): string {
    return Buffer.from(query).toString('base64').substring(0, 64);
  }
}
