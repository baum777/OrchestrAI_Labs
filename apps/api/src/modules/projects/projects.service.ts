import { Inject, Injectable } from "@nestjs/common";
import { PG_POOL } from "../../db/db.module";
import type { Pool } from "pg";
import type { ProjectPhase } from "@shared/types/project-phase";
import { ProjectPhaseStore } from "./project-phase.store";
import type { ActionLogger } from "@agent-runtime/orchestrator/orchestrator";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

export type PhaseHints = {
  focus: string;
  reviewChecklist: string[];
  commonRisks: string[];
};

export type ProjectContext = {
  projectId: string;
  phase: ProjectPhase;
  hints: PhaseHints;
};

@Injectable()
export class ProjectsService {
  private readonly clock: Clock;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly phaseStore: ProjectPhaseStore,
    clock?: Clock
  ) {
    this.clock = clock ?? new SystemClock();
  }

  async getContext(projectId: string): Promise<ProjectContext> {
    // Verify project exists
    const { rows } = await this.pool.query<{ id: string }>(
      `SELECT id FROM projects WHERE id = $1 LIMIT 1`,
      [projectId]
    );

    if (rows.length === 0) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const phase = await this.phaseStore.get(projectId);
    const hints = this.getPhaseHints(phase);

    return {
      projectId,
      phase,
      hints,
    };
  }

  async updatePhase(
    projectId: string,
    newPhase: ProjectPhase,
    logger: ActionLogger,
    agentId: string,
    userId: string,
    clientId?: string
  ): Promise<void> {
    // Verify project exists
    const { rows } = await this.pool.query<{ id: string }>(
      `SELECT id FROM projects WHERE id = $1 LIMIT 1`,
      [projectId]
    );

    if (rows.length === 0) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const oldPhase = await this.phaseStore.get(projectId);

    if (oldPhase === newPhase) {
      return; // No change
    }

    // Update phase (atomic DB update)
    await this.phaseStore.set(projectId, newPhase);

    // Audit logging (required)
    try {
      await logger.append({
        agentId,
        userId,
        projectId,
        clientId,
        action: "project.phase.update",
        input: { projectId, oldPhase, newPhase },
        output: { updated: true },
        ts: this.clock.now().toISOString(),
        blocked: false,
      });
    } catch (error) {
      // Rollback on logging failure
      await this.phaseStore.set(projectId, oldPhase);
      throw new Error(
        `AUDIT_LOG_WRITE_FAILED: Cannot update phase without audit log. ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private getPhaseHints(phase: ProjectPhase): PhaseHints {
    const hintsMap: Record<ProjectPhase, PhaseHints> = {
      discovery: {
        focus: "Problemverständnis, Hypothesen, Annahmen",
        reviewChecklist: [
          "Assumptions klar definiert?",
          "Alternativen geprüft?",
          "Scope-Definition vollständig?",
        ],
        commonRisks: [
          "Unklare Scope-Definition",
          "Fehlende Stakeholder-Inputs",
          "Unrealistische Annahmen",
        ],
      },
      design: {
        focus: "Lösungsarchitektur, Trade-offs",
        reviewChecklist: [
          "Alternativen dokumentiert?",
          "Risiken realistisch eingeschätzt?",
          "Trade-offs klar kommuniziert?",
        ],
        commonRisks: [
          "Overengineering",
          "Unklare Abhängigkeiten",
          "Fehlende Fallback-Strategien",
        ],
      },
      delivery: {
        focus: "Umsetzung, Timeline, Ressourcen",
        reviewChecklist: [
          "NextSteps konkret und umsetzbar?",
          "Abhängigkeiten klar?",
          "Ressourcen realistisch?",
        ],
        commonRisks: [
          "Unrealistische Deadlines",
          "Fehlende Ressourcen",
          "Unklare Verantwortlichkeiten",
        ],
      },
      review: {
        focus: "Outcome-Validierung",
        reviewChecklist: [
          "Erfolgskriterien messbar?",
          "Lessons Learned dokumentiert?",
          "Retrospektive durchgeführt?",
        ],
        commonRisks: [
          "Fehlende Retrospektive",
          "Unklare Erfolgsmessung",
          "Keine Dokumentation der Learnings",
        ],
      },
    };

    return hintsMap[phase];
  }
}

