import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import crypto from "node:crypto";
import { PG_POOL } from "../../db/db.module";
import type { DecisionDraft, DecisionFinal } from "@shared/types/decision";
import type { ActionLogger } from "@agent-runtime/orchestrator/orchestrator";
import { logEscalation } from "../agents/escalation-log";

type DecisionRow = {
  id: string;
  project_id: string;
  client_id: string | null;
  title: string;
  owner: string;
  owner_role: string | null;
  status: "draft" | "final";
  assumptions: string[] | null;
  derivation: string | null;
  alternatives: string[] | null;
  risks: string[] | null;
  client_context: string | null;
  comms_context: string | null;
  client_implications: string | null;
  goal: string | null;
  success_criteria: string[] | null;
  next_steps: string[] | null;
  review_at: string | null;
  review_id: string | null;
  draft_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateDecisionDraftInput = {
  clientId?: string;
  title: string;
  owner: string;
  ownerRole?: string;
  assumptions?: string[];
  derivation?: string;
  alternatives?: string[];
  risks?: string[];
  clientContext?: string;
  commsContext?: string;
  clientImplications?: string;
  goal?: string;
  successCriteria?: string[];
  nextSteps?: string[];
  reviewAt?: string;
  draftId?: string;
};

@Injectable()
export class DecisionsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private mapRow(row: DecisionRow): DecisionDraft | DecisionFinal {
    return {
      id: row.id,
      projectId: row.project_id,
      clientId: row.client_id ?? undefined,
      title: row.title,
      owner: row.owner,
      ownerRole: row.owner_role ?? undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,

      assumptions: row.assumptions ?? [],
      derivation: row.derivation ?? undefined,
      alternatives: row.alternatives ?? [],
      risks: row.risks ?? [],

      clientContext: row.client_context ?? undefined,
      commsContext: row.comms_context ?? undefined,
      clientImplications: row.client_implications ?? undefined,

      goal: row.goal ?? undefined,
      successCriteria: row.success_criteria ?? [],
      nextSteps: row.next_steps ?? [],
      reviewAt: row.review_at ?? undefined,

      reviewId: row.review_id ?? undefined,
      draftId: row.draft_id ?? undefined,
    } as DecisionDraft | DecisionFinal;
  }

  async createDraft(projectId: string, input: CreateDecisionDraftInput): Promise<DecisionDraft> {
    const id = `dec_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const assumptions = input.assumptions ?? [];
    const alternatives = input.alternatives ?? [];
    const risks = input.risks ?? [];
    const successCriteria = input.successCriteria ?? [];
    const nextSteps = input.nextSteps ?? [];

    await this.pool.query(
      `
      INSERT INTO decisions
        (id, project_id, client_id, title, owner, owner_role, status,
         assumptions, derivation, alternatives, risks,
         client_context, comms_context, client_implications,
         goal, success_criteria, next_steps, review_at, review_id, draft_id,
         created_at, updated_at)
      VALUES
        ($1,$2,$3,$4,$5,$6,'draft',
         $7::jsonb,$8,$9::jsonb,$10::jsonb,
         $11,$12,$13,
         $14,$15::jsonb,$16::jsonb,$17::timestamptz,$18,$19,
         $20::timestamptz,$21::timestamptz)
      `,
      [
        id,
        projectId,
        input.clientId ?? null,
        input.title,
        input.owner,
        input.ownerRole ?? null,
        JSON.stringify(assumptions),
        input.derivation ?? null,
        JSON.stringify(alternatives),
        JSON.stringify(risks),
        input.clientContext ?? null,
        input.commsContext ?? null,
        input.clientImplications ?? null,
        input.goal ?? null,
        JSON.stringify(successCriteria),
        JSON.stringify(nextSteps),
        input.reviewAt ?? null,
        null,
        input.draftId ?? null,
        now,
        now,
      ]
    );

    const decision = await this.getById(id);
    if (decision.status !== "draft") {
      throw new Error("Failed to create draft decision");
    }
    return decision;
  }

  async getById(id: string): Promise<DecisionDraft | DecisionFinal> {
    const { rows } = await this.pool.query<DecisionRow>(
      `
      SELECT id, project_id, client_id, title, owner, owner_role, status,
             assumptions, derivation, alternatives, risks,
             client_context, comms_context, client_implications,
             goal, success_criteria, next_steps, review_at, review_id, draft_id,
             created_at, updated_at
      FROM decisions
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );
    if (rows.length === 0) throw new Error("Decision not found");
    return this.mapRow(rows[0]);
  }

  async listByProject(projectId: string): Promise<Array<DecisionDraft | DecisionFinal>> {
    const { rows } = await this.pool.query<DecisionRow>(
      `
      SELECT id, project_id, client_id, title, owner, owner_role, status,
             assumptions, derivation, alternatives, risks,
             client_context, comms_context, client_implications,
             goal, success_criteria, next_steps, review_at, review_id, draft_id,
             created_at, updated_at
      FROM decisions
      WHERE project_id = $1
      ORDER BY created_at DESC
      `,
      [projectId]
    );
    return rows.map((row) => this.mapRow(row));
  }

  async finalizeFromDraft(
    draftId: string,
    reviewId: string,
    options?: {
      logger?: ActionLogger;
      agentId?: string;
      userId?: string;
      projectId?: string;
      clientId?: string;
    }
  ): Promise<DecisionFinal> {
    // 1. Prüfe Decision existiert und ist draft
    const existing = await this.getById(draftId);
    if (existing.status !== "draft") {
      // Escalation: Governance violation attempt
      if (options?.logger) {
        await logEscalation(options.logger, {
          agentId: options.agentId ?? "unknown",
          userId: options.userId ?? "unknown",
          projectId: options.projectId ?? existing.projectId ?? undefined,
          clientId: options.clientId ?? existing.clientId ?? undefined,
          escalation: {
            reason: "finalize_invalid_status",
            details: { draftId, currentStatus: existing.status },
            context: { decisionId: draftId, toolName: "tool.decisions.finalizeFromDraft" },
          },
        });
      }
      throw new Error(`Cannot finalize decision: status is '${existing.status}', expected 'draft'`);
    }

    // 2. Prüfe Review existiert, approved, und projectId match
    const { rows: reviewRows } = await this.pool.query<{
      status: string;
      project_id: string | null;
    }>(
      `SELECT status, project_id FROM review_requests WHERE id = $1 LIMIT 1`,
      [reviewId]
    );
    if (reviewRows.length === 0) {
      // Escalation: Governance violation attempt
      if (options?.logger) {
        await logEscalation(options.logger, {
          agentId: options.agentId ?? "unknown",
          userId: options.userId ?? "unknown",
          projectId: options.projectId ?? existing.projectId ?? undefined,
          clientId: options.clientId ?? existing.clientId ?? undefined,
          escalation: {
            reason: "finalize_review_not_found",
            details: { draftId, reviewId },
            context: { decisionId: draftId, toolName: "tool.decisions.finalizeFromDraft" },
          },
        });
      }
      throw new Error(`Review not found: ${reviewId}`);
    }
    const review = reviewRows[0];
    if (review.status !== "approved") {
      // Escalation: Governance violation attempt
      if (options?.logger) {
        await logEscalation(options.logger, {
          agentId: options.agentId ?? "unknown",
          userId: options.userId ?? "unknown",
          projectId: options.projectId ?? existing.projectId ?? undefined,
          clientId: options.clientId ?? existing.clientId ?? undefined,
          escalation: {
            reason: "finalize_review_not_approved",
            details: { draftId, reviewId, reviewStatus: review.status },
            context: { decisionId: draftId, toolName: "tool.decisions.finalizeFromDraft" },
          },
        });
      }
      throw new Error(`Review not approved: status is '${review.status}', expected 'approved'`);
    }

    // 3. Prüfe projectId match (wenn beide gesetzt sind)
    if (existing.projectId && review.project_id && existing.projectId !== review.project_id) {
      // Escalation: Governance violation attempt
      if (options?.logger) {
        await logEscalation(options.logger, {
          agentId: options.agentId ?? "unknown",
          userId: options.userId ?? "unknown",
          projectId: options.projectId ?? existing.projectId ?? undefined,
          clientId: options.clientId ?? existing.clientId ?? undefined,
          escalation: {
            reason: "finalize_project_mismatch",
            details: {
              draftId,
              reviewId,
              decisionProjectId: existing.projectId,
              reviewProjectId: review.project_id,
            },
            context: { decisionId: draftId, toolName: "tool.decisions.finalizeFromDraft" },
          },
        });
      }
      throw new Error(
        `Review project mismatch: decision.projectId='${existing.projectId}', review.projectId='${review.project_id}'`
      );
    }

    // 4. Logging vor Finalisierung (intent)
    if (options?.logger) {
      try {
        await options.logger.append({
          agentId: options.agentId ?? "unknown",
          userId: options.userId ?? "unknown",
          projectId: options.projectId ?? existing.projectId ?? undefined,
          clientId: options.clientId ?? existing.clientId ?? undefined,
          action: "decision.finalize.intent",
          input: { draftId, reviewId },
          output: { note: "Attempting to finalize decision" },
          ts: new Date().toISOString(),
        });
      } catch (error) {
        throw new Error(`Failed to log finalization intent: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 5. Finalisierung (atomar)
    const { rows } = await this.pool.query<DecisionRow>(
      `
      UPDATE decisions
      SET status = 'final',
          review_id = $2,
          updated_at = now()
      WHERE id = $1 AND status = 'draft'
      RETURNING id, project_id, client_id, title, owner, owner_role, status,
                assumptions, derivation, alternatives, risks,
                client_context, comms_context, client_implications,
                goal, success_criteria, next_steps, review_at, review_id, draft_id,
                created_at, updated_at
      `,
      [draftId, reviewId]
    );

    if (rows.length === 0) {
      // Race condition: Decision wurde zwischenzeitlich finalisiert oder gelöscht
      const current = await this.getById(draftId);
      if (current.status === "final") {
        throw new Error("Decision already finalized");
      }
      throw new Error("Decision not found or status changed");
    }

    const decision = this.mapRow(rows[0]);
    if (decision.status !== "final" || !decision.reviewId) {
      throw new Error("Failed to finalize decision: status or reviewId invalid after update");
    }

    // 6. Logging nach erfolgreicher Finalisierung
    if (options?.logger) {
      try {
        await options.logger.append({
          agentId: options.agentId ?? "unknown",
          userId: options.userId ?? "unknown",
          projectId: options.projectId ?? decision.projectId ?? undefined,
          clientId: options.clientId ?? decision.clientId ?? undefined,
          action: "decision.finalized",
          input: { draftId, reviewId },
          output: { decisionId: decision.id, status: decision.status, reviewId: decision.reviewId },
          ts: new Date().toISOString(),
        });
      } catch (error) {
        // Logging-Fehler nach erfolgreicher Finalisierung ist kritisch, aber wir können nicht rollback
        // In Production sollte das ein Alert auslösen
        throw new Error(`Failed to log finalization success: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return decision as DecisionFinal;
  }
}

