import crypto from "node:crypto";
import type { AgentProfile, Permission } from "@shared/types/agent";
import { enforcePermission, enforceReviewGate } from "@governance/policies/enforcement";
import type { ToolRouter, ToolContext, ToolCall } from "../execution/tool-router";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";
import { loadState, saveState } from "@agent-system/governance-v2/runtime/runtime-state-store";
import { calculateGapMinutes } from "@agent-system/governance-v2/runtime/time-utils";

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

export interface GovernanceWorkstreamValidator {
  validateWorkstream(workstream: {
    id?: string;
    owner?: string;
    scope?: string[];
    autonomyTier?: number;
    layer?: string;
    structuralModel?: string;
    risks?: Array<{ id: string; description: string; impact: string; mitigation: string }>;
    definitionOfDone?: string;
  }): Promise<{
    status: 'pass' | 'blocked' | 'conflict' | 'clarification_required';
    reason?: string;
    reasons?: string[];
    requiresReview?: boolean;
    clarificationRequest?: unknown;
  }>;
}

export class Orchestrator {
  private readonly clock: Clock;
  private readonly gapDetectionEnabled: boolean;
  private readonly gapThresholdMinutes: number;

  constructor(
    private readonly profiles: { getById(id: string): AgentProfile },
    private readonly toolRouter: ToolRouter,
    private readonly reviewStore: ReviewStore,
    private readonly logger: ActionLogger,
    private readonly governanceValidator?: GovernanceWorkstreamValidator,
    clock?: Clock
  ) {
    this.clock = clock ?? new SystemClock();
    this.gapDetectionEnabled = process.env.TIME_GAP_DETECTION !== '0';
    this.gapThresholdMinutes = 50;
  }

  private static sha256Json(v: unknown): string {
    return crypto.createHash("sha256").update(JSON.stringify(v ?? null)).digest("hex");
  }

  /**
   * Derives scope paths from tool calls.
   * Extracts file paths from tool call inputs if available.
   */
  private deriveScopeFromToolCalls(toolCalls: ToolCall[]): string[] {
    const scope: string[] = [];
    for (const call of toolCalls) {
      // Try to extract paths from tool call input
      if (typeof call.input === 'object' && call.input !== null) {
        const input = call.input as Record<string, unknown>;
        // Common patterns: filePath, path, scope, files
        for (const key of ['filePath', 'path', 'scope', 'files', 'file']) {
          if (input[key]) {
            if (typeof input[key] === 'string') {
              scope.push(input[key] as string);
            } else if (Array.isArray(input[key])) {
              scope.push(...(input[key] as string[]));
            }
          }
        }
      }
    }
    // If no scope found, return empty array (will be flagged by validator)
    return scope;
  }

  async run(ctx: ToolContext, input: AgentRunInput): Promise<{ status: "ok" | "blocked"; data: unknown }> {
    const profile = this.profiles.getById(input.agentId);

    // Gap detection preflight
    const nowIso = this.clock.now().toISOString();
    let sessionMode: "fresh" | "continuous" = "continuous";

    if (this.gapDetectionEnabled) {
      try {
        const state = loadState();
        if (state.last_seen_at) {
          const gapMin = calculateGapMinutes(state.last_seen_at, nowIso);
          
          if (gapMin >= this.gapThresholdMinutes) {
            // Log time gap detected
            await this.logger.append({
              agentId: profile.id,
              userId: ctx.userId,
              projectId: ctx.projectId,
              clientId: ctx.clientId,
              action: "TIME_GAP_DETECTED",
              input: {
                gapMin,
                lastSeen: state.last_seen_at,
                nowIso,
              },
              output: {
                sessionMode: "fresh",
                threshold: this.gapThresholdMinutes,
              },
              ts: nowIso,
              blocked: false,
            });
            
            sessionMode = "fresh";
          }
        }
      } catch (error) {
        // Log error but don't block execution
        console.warn("Failed to perform gap detection:", error);
      }

      // Update runtime state with current time
      try {
        saveState({ last_seen_at: nowIso });
      } catch (error) {
        // Log error but don't block execution
        console.warn("Failed to save runtime state:", error);
      }
    }

    await this.logger.append({
      agentId: profile.id,
      userId: ctx.userId,
      projectId: ctx.projectId,
      clientId: ctx.clientId,
      action: "agent.run",
      input: {
        ...input,
        sessionMode,
      },
      output: { note: "received" },
      ts: nowIso,
    });

    if (!input.intendedAction) {
      return { status: "ok", data: { message: "No action specified (MVP). Provide intendedAction." } };
    }

    const intended = input.intendedAction;
    const perm = intended.permission;
    enforcePermission(profile, perm);

    // Governance v2: Preflight validation hook
    if (this.governanceValidator) {
      // Derive minimal workstream from input
      const workstream = {
        id: `ws_${crypto.randomUUID()}`,
        owner: `@${profile.role}`,
        scope: this.deriveScopeFromToolCalls(intended.toolCalls),
        autonomyTier: 3, // Default, can be overridden
        layer: 'implementation', // Default, can be overridden
        structuralModel: '', // Will be flagged by validator if missing
        risks: [],
        definitionOfDone: '',
      };

      const govResult = await this.governanceValidator.validateWorkstream(workstream);

      if (govResult.status === 'blocked') {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: 'agent.blocked.governance_validation',
          input: intended,
          output: { reasons: govResult.reasons },
          ts: this.clock.now().toISOString(),
          blocked: true,
          reason: govResult.reason || 'Governance validation failed',
        });
        return {
          status: 'blocked',
          data: {
            reason: 'GOVERNANCE_BLOCKED',
            reasons: govResult.reasons,
            requiresReview: govResult.requiresReview,
          },
        };
      }

      if (govResult.status === 'conflict') {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: 'agent.blocked.governance_conflict',
          input: intended,
          output: { reasons: govResult.reasons },
          ts: this.clock.now().toISOString(),
          blocked: true,
          reason: govResult.reason || 'Governance conflict detected',
        });
        return {
          status: 'blocked',
          data: {
            reason: 'GOVERNANCE_CONFLICT',
            reasons: govResult.reasons,
            requiresReview: true,
          },
        };
      }

      if (govResult.status === 'clarification_required') {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: 'agent.blocked.clarification_required',
          input: intended,
          output: { clarificationRequest: govResult.clarificationRequest },
          ts: this.clock.now().toISOString(),
          blocked: true,
          reason: govResult.reason || 'Clarification required',
        });
        return {
          status: 'blocked',
          data: {
            reason: 'CLARIFICATION_REQUIRED',
            clarificationRequest: govResult.clarificationRequest,
            requiresReview: true,
          },
        };
      }
    }

    if (intended.reviewCommit) {
      const { reviewId, commitToken } = intended.reviewCommit;

      const verify = await this.reviewStore.getApprovedForCommit({ reviewId, token: commitToken });
      if (!verify.ok) {
        const timestamp = this.clock.now().toISOString();
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "agent.blocked.invalid_commit_token",
          input: intended,
          output: { reviewId },
          ts: timestamp,
          blocked: true,
          reason: verify.reason ?? "Invalid commit",
        });
        // Escalation: Governance violation attempt
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "escalation",
          input: {
            reason: "invalid_commit_token",
            details: { reviewId, reason: verify.reason },
            context: { toolName: intended.toolCalls?.[0]?.tool },
          },
          output: { escalated: true, timestamp },
          ts: timestamp,
          blocked: true,
          reason: verify.reason ?? "Invalid commit",
        });
        return { status: "blocked", data: { reason: verify.reason ?? "Invalid commit" } };
      }

      if (verify.agentId !== profile.id || verify.permission !== perm) {
        const timestamp = this.clock.now().toISOString();
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
          ts: timestamp,
          blocked: true,
          reason: "Commit mismatch (agent or permission)",
        });
        // Escalation: Governance violation attempt
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "escalation",
          input: {
            reason: "commit_mismatch",
            details: {
              expected: { agentId: verify.agentId, permission: verify.permission },
              got: { agentId: profile.id, permission: perm },
            },
            context: { toolName: intended.toolCalls?.[0]?.tool },
          },
          output: { escalated: true, timestamp },
          ts: timestamp,
          blocked: true,
          reason: "Commit mismatch (agent or permission)",
        });
        return { status: "blocked", data: { reason: "Commit mismatch (agent or permission)" } };
      }

      const storedPayloadHash = Orchestrator.sha256Json(verify.payload);
      const currentPayloadHash = Orchestrator.sha256Json({ permission: perm, toolCalls: intended.toolCalls });

      if (storedPayloadHash !== currentPayloadHash) {
        const timestamp = this.clock.now().toISOString();
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "agent.blocked.payload_tamper",
          input: intended,
          output: { reviewId },
          ts: timestamp,
          blocked: true,
          reason: "Payload changed since approval",
        });
        // Escalation: Governance violation attempt
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "escalation",
          input: {
            reason: "payload_tamper",
            details: { reviewId },
            context: { toolName: intended.toolCalls?.[0]?.tool },
          },
          output: { escalated: true, timestamp },
          ts: timestamp,
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
            ts: this.clock.now().toISOString(),
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
        ts: this.clock.now().toISOString(),
      });

      return { status: "ok", data: { mode: "commit", reviewId, results } };
    }

    const gate = enforceReviewGate(profile, perm);
    if (!gate.ok) {
      const timestamp = this.clock.now().toISOString();
      const req: ReviewRequest = {
        id: `rev_${crypto.randomUUID()}`,
        agentId: profile.id,
        permission: perm,
        payload: intended,
        reviewerRoles: profile.reviewPolicy.reviewerRoles,
        createdAt: timestamp,
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
        ts: timestamp,
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
          ts: this.clock.now().toISOString(),
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
      ts: this.clock.now().toISOString(),
    });

    return { status: "ok", data: { mode: gate.mode, results } };
  }
}

