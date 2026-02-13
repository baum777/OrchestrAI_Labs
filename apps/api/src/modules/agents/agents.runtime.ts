import path from "node:path";
import type { Pool } from "pg";
import { ProfileLoader } from "@agent-runtime/profiles/profile-loader";
import { ToolRouter, type ToolContext, type ToolHandler } from "@agent-runtime/execution/tool-router";
import { Orchestrator, ActionLogger, ReviewStore } from "@agent-runtime/orchestrator/orchestrator";
import { DecisionsService, type CreateDecisionDraftInput } from "../decisions/decisions.service";
import { KnowledgeService } from "../knowledge/knowledge.service";

const profilesDir = path.join(process.cwd(), "packages/agent-runtime/src/profiles");
const loader = new ProfileLoader({ profilesDir });
loader.loadAll();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : undefined;

const toolHandlers = (
  decisions: DecisionsService,
  knowledge: KnowledgeService,
  logger?: ActionLogger
): Record<string, ToolHandler> => ({
  "tool.logs.append": {
    async call() {
      return { ok: true, output: { logged: true } };
    },
  },
  "tool.knowledge.search": {
    async call(ctx: ToolContext, input: unknown) {
      const data = isRecord(input) ? input : {};
      const projectId = asString(data.projectId) ?? ctx.projectId;
      const q = asString(data.q);
      const sourcesStr = asString(data.sources);
      const limitStr = asString(data.limit);

      if (!projectId) {
        return { ok: false, error: "projectId is required" };
      }
      if (!q || q.length < 2) {
        return { ok: false, error: "q is required and must be at least 2 characters" };
      }

      const validSources = ["decisions", "reviews", "logs"];
      const sourcesArray = sourcesStr
        ? sourcesStr.split(",").map((s) => s.trim()).filter((s) => validSources.includes(s))
        : ["decisions"];

      if (sourcesArray.length === 0) {
        return { ok: false, error: `sources must be one or more of: ${validSources.join(", ")}` };
      }

      let limit = 10;
      if (limitStr) {
        const parsed = parseInt(limitStr, 10);
        if (!isNaN(parsed) && parsed > 0) {
          limit = Math.min(parsed, 25);
        }
      }

      // ActionLogger ist required für knowledge.search (Audit Requirement)
      if (!logger) {
        return {
          ok: false,
          error: "ActionLogger required for knowledge.search (Audit Requirement)",
        };
      }

      try {
        const result = await knowledge.search(
          projectId,
          q,
          sourcesArray,
          limit,
          logger,
          ctx.userId, // TODO: agentId sollte aus ToolContext kommen
          ctx.userId,
          ctx.clientId
        );
        return { ok: true, output: result };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
  "tool.knowledge.getSource": {
    async call(_ctx, input: unknown) {
      return { ok: true, output: { source: null, id: input } };
    },
  },
  "tool.workflow.getPhase": {
    async call() {
      return { ok: true, output: { phase: "analysis" } };
    },
  },
  "tool.workflow.validateDeliverable": {
    async call(_ctx, input: unknown) {
      return { ok: true, output: { valid: false, missing: ["stakeholder_map"], input } };
    },
  },
  "tool.docs.createDraft": {
    async call(_ctx, input: unknown) {
      return { ok: true, output: { draftId: `draft_${Date.now()}`, input } };
    },
  },
  "tool.docs.updateDraft": {
    async call(_ctx, input: unknown) {
      return { ok: true, output: { updated: true, input } };
    },
  },
  "tool.decisions.createDraft": {
    async call(ctx: ToolContext, input: unknown) {
      const data = isRecord(input) ? input : {};
      const projectId = asString(data.projectId) ?? ctx.projectId;
      const title = asString(data.title);
      const owner = asString(data.owner);

      if (!projectId || !title || !owner) {
        return { ok: false, error: "projectId, title, and owner are required" };
      }

      const draftInput: CreateDecisionDraftInput = {
        clientId: asString(data.clientId) ?? ctx.clientId,
        title,
        owner,
        ownerRole: asString(data.ownerRole),
        assumptions: asStringArray(data.assumptions),
        derivation: asString(data.derivation),
        alternatives: asStringArray(data.alternatives),
        risks: asStringArray(data.risks),
        clientContext: asString(data.clientContext),
        commsContext: asString(data.commsContext),
        clientImplications: asString(data.clientImplications),
        goal: asString(data.goal),
        successCriteria: asStringArray(data.successCriteria),
        nextSteps: asStringArray(data.nextSteps),
        reviewAt: asString(data.reviewAt),
        draftId: asString(data.draftId),
      };

      const draft = await decisions.createDraft(projectId, draftInput);
      return { ok: true, output: draft };
    },
  },
  "tool.decisions.finalizeFromDraft": {
    async call(ctx: ToolContext, input: unknown) {
      const data = isRecord(input) ? input : {};
      const draftId = asString(data.draftId);
      const reviewId = asString(data.reviewId);
      if (!draftId || !reviewId) {
        return { ok: false, error: "draftId and reviewId are required to finalize a decision" };
      }

      // ActionLogger ist required für finalizeFromDraft (Logging Enforcement)
      if (!logger) {
        return {
          ok: false,
          error: "ActionLogger required for finalizeFromDraft (Logging Enforcement)",
        };
      }

      const decision = await decisions.finalizeFromDraft(draftId, reviewId, {
        logger,
        agentId: ctx.userId, // TODO: agentId sollte aus ToolContext kommen, nicht userId
        userId: ctx.userId,
        projectId: ctx.projectId,
        clientId: ctx.clientId,
      });
      return { ok: true, output: decision };
    },
  },
  "tool.reviews.request": {
    async call(_ctx, input: unknown) {
      return { ok: true, output: { requested: true, input } };
    },
  },
  "tool.reviews.status": {
    async call(_ctx, input: unknown) {
      return { ok: true, output: { status: "pending", input } };
    },
  },
});

export function createOrchestrator(logger: ActionLogger, reviewStore: ReviewStore, pool: Pool): Orchestrator {
  const decisions = new DecisionsService(pool);
  const knowledge = new KnowledgeService(pool);
  const toolRouter = new ToolRouter(toolHandlers(decisions, knowledge, logger));
  return new Orchestrator(
    { getById: (id: string) => loader.getById(id) },
    toolRouter,
    reviewStore,
    logger
  );
}
