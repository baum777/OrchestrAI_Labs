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
  skillRequest?: {
    skillId: string;
    version?: string;
    input: unknown;
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

// Optional skill dependencies (feature-flagged)
interface SkillRegistry {
  getManifest(skillId: string, version?: string): { id: string; version: string; requiredPermissions: string[]; requiredTools: string[]; reviewPolicy: { mode: string } } | null;
}

interface SkillExecutor {
  compile(manifest: unknown, instructions: string, input: unknown, context: unknown): Promise<{ skillId: string; version: string; input: unknown; toolCalls: ToolCall[]; reviewRequired: boolean; reviewPolicy: { mode: string }; executionMode: string }>;
  execute(plan: unknown, context: unknown, toolRouter?: ToolRouter): Promise<{ ok: boolean; output?: unknown; error?: string; toolCalls?: ToolCall[]; telemetry?: { skillRunId: string } }>;
}

interface SkillLoader {
  loadInstructions(skillId: string): Promise<string | null>;
}

export class Orchestrator {
  private readonly clock: Clock;
  private readonly gapDetectionEnabled: boolean;
  private readonly gapThresholdMinutes: number;
  private readonly skillsEnabled: boolean;
  private readonly skillRegistry?: SkillRegistry;
  private readonly skillExecutor?: SkillExecutor;
  private readonly skillLoader?: SkillLoader;

  constructor(
    private readonly profiles: { getById(id: string): AgentProfile },
    private readonly toolRouter: ToolRouter,
    private readonly reviewStore: ReviewStore,
    private readonly logger: ActionLogger,
    private readonly governanceValidator?: GovernanceWorkstreamValidator,
    clock?: Clock,
    skillRegistry?: SkillRegistry,
    skillExecutor?: SkillExecutor,
    skillLoader?: SkillLoader
  ) {
    this.clock = clock ?? new SystemClock();
    this.gapDetectionEnabled = process.env.TIME_GAP_DETECTION !== '0';
    this.gapThresholdMinutes = 50;
    this.skillsEnabled = process.env.SKILLS_ENABLED === 'true';
    this.skillRegistry = skillRegistry;
    this.skillExecutor = skillExecutor;
    this.skillLoader = skillLoader;
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
          const gapMin = calculateGapMinutes(state.last_seen_at, nowIso, this.clock);
          
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

    // Skill execution path (feature-flagged)
    if (input.skillRequest && this.skillsEnabled) {
      if (!this.skillRegistry || !this.skillExecutor || !this.skillLoader) {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "skill.blocked.missing_dependencies",
          input: input.skillRequest,
          output: { reason: "SkillRegistry, SkillExecutor, or SkillLoader not available" },
          ts: nowIso,
          blocked: true,
          reason: "Skills dependencies not configured",
        });
        return { status: "blocked", data: { reason: "SKILLS_DEPENDENCIES_MISSING" } };
      }

      const manifest = this.skillRegistry.getManifest(input.skillRequest.skillId, input.skillRequest.version);
      if (!manifest) {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "skill.blocked.not_found",
          input: input.skillRequest,
          output: { reason: "Skill not found" },
          ts: nowIso,
          blocked: true,
          reason: "Skill not found",
        });
        return { status: "blocked", data: { reason: "SKILL_NOT_FOUND", skillId: input.skillRequest.skillId } };
      }

      // Check permissions
      const hasPermission = manifest.requiredPermissions.every(perm => profile.permissions.includes(perm as Permission));
      if (!hasPermission) {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "skill.blocked.permission_denied",
          input: input.skillRequest,
          output: { reason: "Missing required permissions", required: manifest.requiredPermissions },
          ts: nowIso,
          blocked: true,
          reason: "Permission denied",
        });
        return { status: "blocked", data: { reason: "SKILL_PERMISSION_DENIED", required: manifest.requiredPermissions } };
      }

      // Load instructions
      const instructions = await this.skillLoader.loadInstructions(input.skillRequest.skillId);
      if (!instructions) {
        await this.logger.append({
          agentId: profile.id,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "skill.blocked.instructions_not_found",
          input: input.skillRequest,
          output: { reason: "Instructions not found" },
          ts: nowIso,
          blocked: true,
          reason: "Instructions not found",
        });
        return { status: "blocked", data: { reason: "SKILL_INSTRUCTIONS_NOT_FOUND" } };
      }

      // Compile skill plan
      const skillContext = {
        skillId: input.skillRequest.skillId,
        skillVersion: manifest.version,
        agentProfile: profile,
        toolContext: ctx,
        clock: this.clock,
        input: input.skillRequest.input,
      };

      const plan = await this.skillExecutor.compile(manifest, instructions, input.skillRequest.input, skillContext);

      // Governance v2 validation (if generatesWorkstream)
      // Note: For pilot skill, this is skipped (governance.generatesWorkstream: false)

      // Review gate (if needed)
      if (plan.reviewRequired && plan.reviewPolicy.mode === 'required') {
        const gate = enforceReviewGate(profile, 'skill.execute' as Permission);
        if (!gate.ok) {
          const timestamp = this.clock.now().toISOString();
          const req: ReviewRequest = {
            id: `rev_${crypto.randomUUID()}`,
            agentId: profile.id,
            permission: 'skill.execute' as Permission,
            payload: { skillId: input.skillRequest.skillId, version: manifest.version, input: input.skillRequest.input },
            reviewerRoles: manifest.reviewPolicy.reviewerRoles || [],
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
            action: "skill.blocked.review_required",
            input: input.skillRequest,
            output: { reviewId: req.id },
            ts: timestamp,
            blocked: true,
            reason: gate.reason,
          });

          return { status: "blocked", data: { reason: gate.reason, reviewId: req.id } };
        }
      }

      // Execute skill
      const result = await this.skillExecutor.execute(plan, skillContext, this.toolRouter);

      // Log skill execution
      await this.logger.append({
        agentId: profile.id,
        userId: ctx.userId,
        projectId: ctx.projectId,
        clientId: ctx.clientId,
        action: "skill.executed",
        input: {
          skillId: input.skillRequest.skillId,
          version: manifest.version,
          input: input.skillRequest.input,
        },
        output: {
          ...result.output,
          skillRunId: result.telemetry?.skillRunId,
        },
        ts: this.clock.now().toISOString(),
        blocked: !result.ok,
        reason: result.error,
      });

      return { status: result.ok ? "ok" : "blocked", data: result };
    }

    // If skillRequest provided but skills disabled, return blocked
    if (input.skillRequest && !this.skillsEnabled) {
      await this.logger.append({
        agentId: profile.id,
        userId: ctx.userId,
        projectId: ctx.projectId,
        clientId: ctx.clientId,
        action: "skill.blocked.disabled",
        input: input.skillRequest,
        output: { reason: "Skills feature is disabled (SKILLS_ENABLED=false)" },
        ts: nowIso,
        blocked: true,
        reason: "Skills disabled",
      });
      return { status: "blocked", data: { reason: "SKILLS_DISABLED" } };
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

