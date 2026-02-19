/**
 * User Roles Service
 * 
 * RBAC: Role and Permission Management
 * Implements ISO 27001: A.9.2.1 (User registration), A.9.2.3 (Privileged access management)
 * 
 * Role Hierarchy: admin > reviewer > user
 * - admin: Full access to all operations
 * - reviewer: Can approve/reject reviews, read projects/decisions
 * - user: Standard user permissions (create decisions, request reviews)
 * - partner: External reviewer (can approve/reject, read-only access)
 */

import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../db/db.module";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";
import type { Permission } from "@agent-system/shared";
import type { PermissionResolver } from "@agent-system/governance/policy/policy-engine";

export type UserRole = "admin" | "reviewer" | "user" | "partner";

export interface UserRoleRecord {
  id: string;
  userId: string;
  role: UserRole;
  grantedBy: string | null;
  grantedAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissionRecord {
  id: string;
  userId: string;
  permission: Permission;
  grantedBy: string | null;
  grantedAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

@Injectable()
export class UserRolesService implements PermissionResolver {
  private readonly clock: Clock;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    clock?: Clock
  ) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Get all active roles for a user
   */
  async getRoles(userId: string): Promise<UserRole[]> {
    const { rows } = await this.pool.query<{ role: UserRole }>(
      `
      SELECT role
      FROM user_roles
      WHERE user_id = $1 AND revoked_at IS NULL
      ORDER BY granted_at DESC
      `,
      [userId]
    );
    return rows.map(r => r.role);
  }

  /**
   * Get all permissions for a user (from roles + explicit permissions)
   */
  async getPermissions(userId: string): Promise<Permission[]> {
    // Get permissions from roles
    const rolePermissions = await this.getPermissionsFromRoles(userId);
    
    // Get explicit permissions
    const explicitPermissions = await this.getExplicitPermissions(userId);
    
    // Combine and deduplicate
    const allPermissions = new Set<Permission>([...rolePermissions, ...explicitPermissions]);
    return Array.from(allPermissions);
  }

  /**
   * Get permissions from user's roles
   */
  private async getPermissionsFromRoles(userId: string): Promise<Permission[]> {
    const { rows } = await this.pool.query<{ permissions: Permission[] }>(
      `
      SELECT rp.permissions
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = $1 AND ur.revoked_at IS NULL
      `,
      [userId]
    );
    
    // Flatten permissions from all roles
    const allPermissions = new Set<Permission>();
    for (const row of rows) {
      const perms = row.permissions as Permission[];
      perms.forEach(p => allPermissions.add(p));
    }
    return Array.from(allPermissions);
  }

  /**
   * Get explicit permissions (not from roles)
   */
  private async getExplicitPermissions(userId: string): Promise<Permission[]> {
    const { rows } = await this.pool.query<{ permission: Permission }>(
      `
      SELECT permission
      FROM user_permissions
      WHERE user_id = $1 AND revoked_at IS NULL
      `,
      [userId]
    );
    return rows.map(r => r.permission);
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const roles = await this.getRoles(userId);
    return roles.includes(role);
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Check if user has all required permissions
   */
  async hasAllPermissions(userId: string, requiredPermissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getPermissions(userId);
    return requiredPermissions.every(p => userPermissions.includes(p));
  }

  /**
   * Assign a role to a user
   */
  async assignRole(
    userId: string,
    role: UserRole,
    grantedBy: string
  ): Promise<UserRoleRecord> {
    const now = this.clock.now().toISOString();
    const id = `role_${userId}_${role}_${Date.now()}`;
    
    // Revoke existing role if active
    await this.pool.query(
      `
      UPDATE user_roles
      SET revoked_at = $1, updated_at = $1
      WHERE user_id = $2 AND role = $3 AND revoked_at IS NULL
      `,
      [now, userId, role]
    );
    
    // Insert new role assignment
    await this.pool.query(
      `
      INSERT INTO user_roles (id, user_id, role, granted_by, granted_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $5, $5)
      `,
      [id, userId, role, grantedBy, now]
    );
    
    return {
      id,
      userId,
      role,
      grantedBy,
      grantedAt: now,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Revoke a role from a user
   */
  async revokeRole(userId: string, role: UserRole): Promise<void> {
    const now = this.clock.now().toISOString();
    await this.pool.query(
      `
      UPDATE user_roles
      SET revoked_at = $1, updated_at = $1
      WHERE user_id = $2 AND role = $3 AND revoked_at IS NULL
      `,
      [now, userId, role]
    );
  }

  /**
   * Grant an explicit permission to a user
   */
  async grantPermission(
    userId: string,
    permission: Permission,
    grantedBy: string
  ): Promise<UserPermissionRecord> {
    const now = this.clock.now().toISOString();
    const id = `perm_${userId}_${permission}_${Date.now()}`;
    
    // Revoke existing permission if active
    await this.pool.query(
      `
      UPDATE user_permissions
      SET revoked_at = $1, updated_at = $1
      WHERE user_id = $2 AND permission = $3 AND revoked_at IS NULL
      `,
      [now, userId, permission]
    );
    
    // Insert new permission
    await this.pool.query(
      `
      INSERT INTO user_permissions (id, user_id, permission, granted_by, granted_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $5, $5)
      `,
      [id, userId, permission, grantedBy, now]
    );
    
    return {
      id,
      userId,
      permission,
      grantedBy,
      grantedAt: now,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Revoke an explicit permission from a user
   */
  async revokePermission(userId: string, permission: Permission): Promise<void> {
    const now = this.clock.now().toISOString();
    await this.pool.query(
      `
      UPDATE user_permissions
      SET revoked_at = $1, updated_at = $1
      WHERE user_id = $2 AND permission = $3 AND revoked_at IS NULL
      `,
      [now, userId, permission]
    );
  }

  /**
   * Get role hierarchy level (for comparison)
   * Returns: 3 (admin), 2 (reviewer/partner), 1 (user)
   */
  getRoleHierarchyLevel(role: UserRole): number {
    switch (role) {
      case "admin":
        return 3;
      case "reviewer":
      case "partner":
        return 2;
      case "user":
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Check if role1 can perform actions of role2 (hierarchy check)
   */
  canPerformRole(role1: UserRole, role2: UserRole): boolean {
    const level1 = this.getRoleHierarchyLevel(role1);
    const level2 = this.getRoleHierarchyLevel(role2);
    return level1 >= level2;
  }
}

