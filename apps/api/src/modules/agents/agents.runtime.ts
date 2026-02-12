import path from "node:path";
import type { Pool } from "pg";
import { ProfileLoader } from "@agent-runtime/profiles/profile-loader";
import { ToolRouter, type ToolContext, type ToolHandler } from "@agent-runtime/execution/tool-router";
import { Orchestrator, ActionLogger, ReviewStore } from "@agent-runtime/orchestrator/orchestrator";
import { DecisionsService, type CreateDecisionDraftInput } from "../decisions/decisions.service";

const profilesDir = path.join(process.cwd(), "packages/agent-runtime/src/profiles");
const loader = new ProfileLoader({ profilesDir });
loader.loadAll();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : undefined;

const toolHandlers = (decisions: DecisionsService): Record<string, ToolHandler> => ({
  "tool.logs.append": {
    async call() {
      return { ok: true, output: { logged: true } };
    },
  },
  "tool.knowledge.search": {
    async call(_ctx, input: unknown) {
      return { ok: true, output: { hits: [], query: input } };
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
    async call(_ctx, input: unknown) {
      const data = isRecord(input) ? input : {};
      const draftId = asString(data.draftId);
      const reviewId = asString(data.reviewId);
      if (!draftId || !reviewId) {
        return { ok: false, error: "draftId and reviewId are required to finalize a decision" };
      }
      const decision = await decisions.finalizeFromDraft(draftId, reviewId);
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
  const toolRouter = new ToolRouter(toolHandlers(decisions));
  return new Orchestrator(
    { getById: (id: string) => loader.getById(id) },
    toolRouter,
    reviewStore,
    logger
  );
}
