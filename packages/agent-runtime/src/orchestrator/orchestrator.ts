import crypto from "node:crypto";
import type { AgentProfile, Permission } from "@shared/types/agent";
import { enforcePermission, enforceReviewGate } from "@governance/policies/enforcement";
import type { ToolRouter, ToolContext, ToolCall } from "../execution/tool-router";

export type AgentRunInput = {
  agentId: string;
  userMessage: string;
  intendedAction?: {
    permission: Permission;
    toolCalls: ToolCall[];
    reviewCommit?: { reviewId: string; commitToken: string };
  };
};

export type ReviewRequest = {
  id: string;
  agentId: string;
  permission: Permission;
  payload: unknown;
  reviewerRoles: string[];
  createdAt: string;
  projectId?: string;
  clientId?: string;
  userId?: string;
};

export interface ReviewQueue {
  create(req: ReviewRequest): Promise<void>;
}

export interface ReviewStore extends ReviewQueue {
  getApprovedForCommit(input: { reviewId: string; token: string }): Promise<{
    ok: boolean;
    reason?: string;
    permission?: Permission;
    agentId?: string;
    payload?: unknown;
  }>;
  markTokenUsed(reviewId: string): Promise<void>;
}

export interface ActionLogger {
  append(entry: {
    agentId: string;
    userId: string;
    projectId?: string;
    clientId?: string;
    action: string;
    input: unknown;
    output: unknown;
    ts: string;
    blocked?: boolean;
    reason?: string;
  }): Promise<void>;
}

export class Orchestrator {
  constructor(
    private readonly profiles: { getById(id: string): AgentProfile },
    private readonly toolRouter: ToolRouter,
    private readonly reviewStore: ReviewStore,
    private readonly logger: ActionLogger
  ) {}

  private static sha256Json(v: unknown): string {
    return crypto.createHash("sha256").update(JSON.stringify(v ?? null)).digest("hex");
  }

  async run(ctx: ToolContext, input: AgentRunInput): Promise<{ status: "ok" | "blocked"; data: unknown }> {
    const profile = this.profiles.getById(input.agentId);

    await this.logger.append({
      agentId: profile.id,
      userId: ctx.userId,
      projectId: ctx.projectId,
      clientId: ctx.clientId,
      action: "agent.run",
      input,
      output: { note: "received" },
      ts: new Date().toISOString(),
    });

    if (!input.intendedAction) {
      return { status: "ok", data: { message: "No action specified (MVP). Provide intendedAction." } };
    }

    const intended = input.intendedAction;
    const perm = intended.permission;
    enforcePermission(profile, perm);

    if (intended.reviewCommit) {
      const { reviewId, commitToken } = intended.reviewCommit;

      const verify = await this.reviewStore.getApprovedForCommit({ reviewId, token: commitToken });
      if (!verify.ok) {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "agent.blocked.invalid_commit_token",
          input: intended,
          output: { reviewId },
          ts: new Date().toISOString(),
          blocked: true,
          reason: verify.reason ?? "Invalid commit",
        });
        return { status: "blocked", data: { reason: verify.reason ?? "Invalid commit" } };
      }

      if (verify.agentId !== profile.id || verify.permission !== perm) {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "agent.blocked.commit_mismatch",
          input: intended,
          output: {
            expected: { agentId: verify.agentId, permission: verify.permission },
            got: { agentId: profile.id, permission: perm },
          },
          ts: new Date().toISOString(),
          blocked: true,
          reason: "Commit mismatch (agent or permission)",
        });
        return { status: "blocked", data: { reason: "Commit mismatch (agent or permission)" } };
      }

      const storedPayloadHash = Orchestrator.sha256Json(verify.payload);
      const currentPayloadHash = Orchestrator.sha256Json({ permission: perm, toolCalls: intended.toolCalls });

      if (storedPayloadHash !== currentPayloadHash) {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "agent.blocked.payload_tamper",
          input: intended,
          output: { reviewId },
          ts: new Date().toISOString(),
          blocked: true,
          reason: "Payload changed since approval",
        });
        return { status: "blocked", data: { reason: "Payload changed since approval" } };
      }

      await this.reviewStore.markTokenUsed(reviewId);

      const results = [];
      for (const call of intended.toolCalls) {
        const adjustedCall =
          call.tool === "tool.decisions.finalizeFromDraft"
            ? {
                ...call,
                input: {
                  ...(typeof call.input === "object" && call.input !== null ? call.input : {}),
                  reviewId: reviewId,
                },
              }
            : call;

        const r = await this.toolRouter.execute(profile, ctx, adjustedCall);
        results.push({ tool: call.tool, result: r });

        if (r.ok && call.tool === "tool.decisions.finalizeFromDraft") {
          await this.logger.append({
            agentId: profile.id,
            userId: ctx.userId,
            projectId: ctx.projectId,
            clientId: ctx.clientId,
            action: "decision.finalized",
            input: adjustedCall.input,
            output: r.output ?? null,
            ts: new Date().toISOString(),
          });
        }

        if (!r.ok) break;
      }

      await this.logger.append({
        agentId: profile.id,
        userId: ctx.userId,
        projectId: ctx.projectId,
        clientId: ctx.clientId,
        action: "agent.executed.commit",
        input: intended,
        output: { reviewId, results },
        ts: new Date().toISOString(),
      });

      return { status: "ok", data: { mode: "commit", reviewId, results } };
    }

    const gate = enforceReviewGate(profile, perm);
    if (!gate.ok) {
      const req: ReviewRequest = {
        id: `rev_${crypto.randomUUID()}`,
        agentId: profile.id,
        permission: perm,
        payload: intended,
        reviewerRoles: profile.reviewPolicy.reviewerRoles,
        createdAt: new Date().toISOString(),
        projectId: ctx.projectId,
        clientId: ctx.clientId,
        userId: ctx.userId,
      };
      await this.reviewStore.create(req);

      await this.logger.append({
        agentId: profile.id,
        userId: ctx.userId,
        projectId: ctx.projectId,
        clientId: ctx.clientId,
        action: "agent.blocked.review_required",
        input: input.intendedAction,
        output: { reviewId: req.id },
        ts: new Date().toISOString(),
        blocked: true,
        reason: gate.reason,
      });

      return { status: "blocked", data: { reason: gate.reason, reviewId: req.id } };
    }

    const results = [];
    for (const call of intended.toolCalls) {
      const r = await this.toolRouter.execute(profile, ctx, call);
      results.push({ tool: call.tool, result: r });

      if (r.ok && call.tool === "tool.decisions.createDraft") {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "decision.draft.created",
          input: call.input,
          output: r.output ?? null,
          ts: new Date().toISOString(),
        });
      }

      if (!r.ok) break;
    }

    await this.logger.append({
      agentId: profile.id,
      userId: ctx.userId,
      projectId: ctx.projectId,
      clientId: ctx.clientId,
      action: gate.mode === "draft_only" ? "agent.executed.draft_only" : "agent.executed",
      input: intended,
      output: results,
      ts: new Date().toISOString(),
    });

    return { status: "ok", data: { mode: gate.mode, results } };
  }
}

