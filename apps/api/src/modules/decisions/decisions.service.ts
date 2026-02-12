import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import crypto from "node:crypto";
import { PG_POOL } from "../../db/db.module";
import type { DecisionDraft, DecisionFinal } from "@shared/types/decision";

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

  async finalizeFromDraft(draftId: string, reviewId: string): Promise<DecisionFinal> {
    const { rows: reviewRows } = await this.pool.query<{ status: string }>(
      `SELECT status FROM review_requests WHERE id = $1 LIMIT 1`,
      [reviewId]
    );
    if (reviewRows.length === 0) throw new Error("Review not found");
    if (reviewRows[0].status !== "approved") throw new Error("Review not approved");

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
      const existing = await this.getById(draftId);
      if (existing.status === "final") {
        throw new Error("Decision already finalized");
      }
      throw new Error("Decision not found");
    }

    const decision = this.mapRow(rows[0]);
    if (decision.status !== "final" || !decision.reviewId) {
      throw new Error("Failed to finalize decision");
    }
    return decision as DecisionFinal;
  }
}

