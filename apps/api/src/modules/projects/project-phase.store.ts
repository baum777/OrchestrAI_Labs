import { Inject, Injectable } from "@nestjs/common";
import { PG_POOL } from "../../db/db.module";
import type { Pool } from "pg";
import type { ProjectPhase } from "@shared/types/project-phase";

/**
 * DB-Backed Project Phase Store
 * 
 * Stores project phases in projects.phase column.
 * Restart-safe, atomic updates, audit log mandatory.
 */
@Injectable()
export class ProjectPhaseStore {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Get phase for projectId.
   * Returns 'discovery' as default if not set.
   */
  async get(projectId: string): Promise<ProjectPhase> {
    const { rows } = await this.pool.query<{ phase: ProjectPhase }>(
      `SELECT phase FROM projects WHERE id = $1 LIMIT 1`,
      [projectId]
    );

    if (rows.length === 0) {
      return "discovery"; // Default phase
    }

    return rows[0].phase;
  }

  /**
   * Set phase for projectId.
   * Atomic update, fails if project doesn't exist.
   */
  async set(projectId: string, phase: ProjectPhase): Promise<void> {
    const { rowCount } = await this.pool.query(
      `UPDATE projects SET phase = $1 WHERE id = $2`,
      [phase, projectId]
    );

    if (rowCount === 0) {
      throw new Error(`Project not found: ${projectId}`);
    }
  }

  /**
   * Check if project exists.
   */
  async has(projectId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ id: string }>(
      `SELECT id FROM projects WHERE id = $1 LIMIT 1`,
      [projectId]
    );

    return rows.length > 0;
  }
}

