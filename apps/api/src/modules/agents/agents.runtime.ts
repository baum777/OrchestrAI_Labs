import path from "node:path";
import type { Pool } from "pg";
import crypto from "node:crypto";
import { ProfileLoader } from "@agent-runtime/profiles/profile-loader";
import { ToolRouter, type ToolContext, type ToolHandler } from "@agent-runtime/execution/tool-router";
import { Orchestrator, ActionLogger, ReviewStore } from "@agent-runtime/orchestrator/orchestrator";
import { DecisionsService, type CreateDecisionDraftInput } from "../decisions/decisions.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { PolicyEngine, type PolicyContext, PolicyError } from "@governance/policy/policy-engine";
import type { Permission } from "@shared/types/agent";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";
import type {
  MultiSourceConnectorRegistry,
  CapabilityRegistry,
} from "@agent-system/customer-data";
import { generateResultHash } from "@agent-system/customer-data";
import type { LicenseManager } from "@governance/license/license-manager";
import { SkillRegistry, SkillLoader, SkillExecutor } from "@agent-system/skills";
import { WorkstreamValidator } from "@agent-system/governance-v2";

// Resolve profiles directory relative to workspace root
// In tests, process.cwd() is apps/api, so we need to go up two levels
// In production, process.cwd() is workspace root
const getWorkspaceRoot = (): string => {
  const cwd = process.cwd();
  // Check if we're in apps/api directory (Windows or Unix paths)
  if (cwd.endsWith('apps/api') || cwd.endsWith('apps\\api') || cwd.includes(path.join('apps', 'api'))) {
    return path.resolve(cwd, '../..');
  }
  return cwd;
};
const workspaceRoot = getWorkspaceRoot();
const profilesDir = path.join(workspaceRoot, "packages/agent-runtime/src/profiles");
const loader = new ProfileLoader({ profilesDir });
loader.loadAll();

// Skills setup (feature-flagged)
const skillsEnabled = process.env.SKILLS_ENABLED === 'true';
let skillRegistry: SkillRegistry | undefined;
let skillLoader: SkillLoader | undefined;
let skillExecutor: SkillExecutor | undefined;

if (skillsEnabled) {
  const skillsDir = path.join(workspaceRoot, "packages/skills/skills");
  skillRegistry = new SkillRegistry({ skillsDir });
  skillRegistry.loadAll();
  skillLoader = new SkillLoader(skillRegistry, skillsDir);
  const workstreamValidator = new WorkstreamValidator();
  const systemClock = new SystemClock();
  skillExecutor = new SkillExecutor(systemClock, workstreamValidator);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : undefined;

const toolHandlers = (
  decisions: DecisionsService,
  knowledge: KnowledgeService,
  logger: ActionLogger,
  policyEngine: PolicyEngine,
  connectorRegistry: MultiSourceConnectorRegistry,
  capabilityRegistry: CapabilityRegistry,
  agentProfileGetter: (agentId: string) => { permissions: string[] } | null,
  clock: Clock,
  licenseManager?: LicenseManager
): Record<string, ToolHandler> => {
  // Load premium tools if license manager is available
  // Using try-catch to avoid hard dependency (Core-Extension separation)
  const premiumTools: Record<string, ToolHandler> = {};
  
  if (licenseManager) {
    try {
      // Dynamic require for optional premium module (Core-Extension separation)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const marketerModule = require("@premium/marketer/tools/marketing-tool");
      if (marketerModule?.createMarketingTool) {
        premiumTools["tool.marketing.generateNarrative"] = marketerModule.createMarketingTool(policyEngine, logger, clock);
      }
    } catch (error) {
      // Premium module not available - silently skip
      // This is expected if premium module is not installed
      console.debug("Premium marketer module not available (this is OK if not installed):", error instanceof Error ? error.message : String(error));
    }
  }

  return {
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
      // Use deterministic ID generation (timestamp-based but via clock)
      const draftId = `draft_${clock.now().getTime()}_${crypto.randomUUID().slice(0, 8)}`;
      return { ok: true, output: { draftId, input } };
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
  "tool.customer_data.executeReadModel": {
    async call(ctx: ToolContext, input: unknown) {
      const startTime = clock.now().getTime();
      const requestId = crypto.randomUUID();
      
      const data = isRecord(input) ? input : {};
      const clientId = asString(data.clientId) ?? ctx.clientId;
      const operationId = asString(data.operationId);
      
      if (!clientId) {
        return { ok: false, error: "clientId is required" };
      }
      if (!operationId) {
        return { ok: false, error: "operationId is required" };
      }
      
      // ActionLogger is required
      if (!logger) {
        return {
          ok: false,
          error: "ActionLogger required for customer_data.executeReadModel (Audit Requirement)",
        };
      }
      
      // Get agent profile for permissions (from context - we need to pass agentId)
      // For now, we'll get it from a helper - this needs to be passed from Orchestrator
      const agentId = (ctx as unknown as { agentId?: string }).agentId ?? ctx.userId;
      const profile = agentProfileGetter(agentId);
      const permissions = profile?.permissions ?? [];
      
      // PHASE 2: PolicyEngine authorization
      const policyCtx: PolicyContext = {
        userId: ctx.userId,
        clientId,
        projectId: ctx.projectId,
        agentId,
        permissions: permissions as Permission[],
      };
      
      try {
        const decision = await policyEngine.authorize(
          policyCtx,
          "customer_data.executeReadModel",
          data
        );
        
        // Get capability map
        const capability = capabilityRegistry.getCapabilities(clientId);
        if (!capability) {
          return { ok: false, error: "No capabilities found for clientId" };
        }
        
        // Check operation is allowed
        if (!capabilityRegistry.isOperationAllowed(clientId, operationId)) {
          return { ok: false, error: `Operation ${operationId} not allowed for clientId` };
        }
        
        // Get source for operation
        const source = capabilityRegistry.getSourceForOperation(clientId, operationId);
        
        // PHASE 2: Sanitize parameters
        const sanitized = policyEngine.sanitize(data, capability, operationId);
        
        // PHASE 3: Get connector for source
        const connector = connectorRegistry.getConnector(clientId, source);
        
        // Execute connector
        const result = await connector.executeReadModel(
          sanitized.operationId,
          sanitized.params,
          sanitized.constraints
        );
        
        // PHASE 2: Redact result
        const redacted = policyEngine.redact(result.data, capability, operationId);
        
        const latencyMs = clock.now().getTime() - startTime;
        
        // Generate resultHash (deterministic, no PII)
        const resultHash = generateResultHash(redacted.data, capability.operations[operationId]?.denyFields);
        
        // PHASE 5: Enriched audit log
        try {
          await logger.append({
            agentId,
            userId: ctx.userId,
            projectId: ctx.projectId,
            clientId,
            action: "customer_data.access",
            input: {
              clientId,
              operationId,
              requestId,
              ...data,
            },
            output: {
              rowCount: redacted.metadata.rowCount,
              fieldsReturned: redacted.metadata.fieldsReturned,
              latencyMs,
              sourceType: result.metadata.sourceType,
              resultHash,
              policyDecisionHash: decision.decisionHash,
              requestId,
            },
            ts: clock.now().toISOString(),
            blocked: false,
          });
        } catch (error) {
          // Audit log failure blocks operation
          throw new Error(
            `AUDIT_LOG_WRITE_FAILED: Cannot complete customer_data access without audit log. ${error instanceof Error ? error.message : String(error)}`
          );
        }
        
        return {
          ok: true,
          output: {
            data: redacted.data,
            metadata: redacted.metadata,
            executionMetrics: {
              latencyMs,
            },
            requestId,
          },
        };
      } catch (error) {
        if (error instanceof PolicyError) {
          // Log policy violation
          try {
            await logger.append({
              agentId,
              userId: ctx.userId,
              projectId: ctx.projectId,
              clientId,
              action: "policy.violation",
              input: {
                clientId,
                operation: "customer_data.executeReadModel",
                operationId,
                requestId,
                ...data,
              },
              output: {
                reason: error.message,
                code: error.code,
                requestId,
              },
              ts: clock.now().toISOString(),
              blocked: true,
              reason: error.message,
            });
          } catch (logError) {
            // Even policy violation logging failure should be logged (but not block)
            console.error("Failed to log policy violation:", logError);
          }
          return { ok: false, error: error.message };
        }
        throw error;
      }
    },
  },
  "tool.customer_data.getEntity": {
    async call(ctx: ToolContext, input: unknown) {
      const startTime = clock.now().getTime();
      const requestId = crypto.randomUUID();
      
      const data = isRecord(input) ? input : {};
      const clientId = asString(data.clientId) ?? ctx.clientId;
      const entity = asString(data.entity);
      const id = asString(data.id);
      
      if (!clientId) {
        return { ok: false, error: "clientId is required" };
      }
      if (!entity || !id) {
        return { ok: false, error: "entity and id are required" };
      }
      
      if (!logger) {
        return {
          ok: false,
          error: "ActionLogger required for customer_data.getEntity (Audit Requirement)",
        };
      }
      
      const agentId = (ctx as unknown as { agentId?: string }).agentId ?? ctx.userId;
      const profile = agentProfileGetter(agentId);
      const permissions = profile?.permissions ?? [];
      
      const policyCtx: PolicyContext = {
        userId: ctx.userId,
        clientId,
        projectId: ctx.projectId,
        agentId,
        permissions: permissions as Permission[],
      };
      
      try {
        const decision = await policyEngine.authorize(
          policyCtx,
          "customer_data.getEntity",
          data
        );
        
        const capability = capabilityRegistry.getCapabilities(clientId);
        if (!capability) {
          return { ok: false, error: "No capabilities found for clientId" };
        }
        
        // For getEntity, we use a synthetic operationId
        const operationId = `get${entity.charAt(0).toUpperCase() + entity.slice(1)}`;
        if (!capabilityRegistry.isOperationAllowed(clientId, operationId)) {
          return { ok: false, error: `Entity ${entity} not allowed for clientId` };
        }
        
        const source = capabilityRegistry.getSourceForOperation(clientId, operationId);
        const sanitized = policyEngine.sanitize(
          { entity, id, fields: data.fields },
          capability,
          operationId
        );
        
        const connector = connectorRegistry.getConnector(clientId, source);
        
        // Execute as readModel operation
        const result = await connector.executeReadModel(
          operationId,
          { entity, id, ...sanitized.params },
          sanitized.constraints
        );
        
        const redacted = policyEngine.redact(result.data, capability, operationId);
        const latencyMs = clock.now().getTime() - startTime;
        const resultHash = generateResultHash(redacted.data, capability.operations[operationId]?.denyFields);
        
        try {
          await logger.append({
            agentId,
            userId: ctx.userId,
            projectId: ctx.projectId,
            clientId,
            action: "customer_data.access",
            input: { clientId, entity, id, requestId, ...data },
            output: {
              rowCount: redacted.metadata.rowCount,
              fieldsReturned: redacted.metadata.fieldsReturned,
              latencyMs,
              sourceType: result.metadata.sourceType,
              resultHash,
              policyDecisionHash: decision.decisionHash,
              requestId,
            },
            ts: clock.now().toISOString(),
            blocked: false,
          });
        } catch (error) {
          throw new Error(
            `AUDIT_LOG_WRITE_FAILED: Cannot complete customer_data access without audit log. ${error instanceof Error ? error.message : String(error)}`
          );
        }
        
        return {
          ok: true,
          output: {
            entity: redacted.data[0] ?? null,
            metadata: redacted.metadata,
            executionMetrics: { latencyMs },
            requestId,
          },
        };
      } catch (error) {
        if (error instanceof PolicyError) {
          try {
            await logger.append({
              agentId,
              userId: ctx.userId,
              projectId: ctx.projectId,
              clientId,
              action: "policy.violation",
              input: { clientId, operation: "customer_data.getEntity", requestId, ...data },
              output: { reason: error.message, code: error.code, requestId },
              ts: clock.now().toISOString(),
              blocked: true,
              reason: error.message,
            });
          } catch (logError) {
            console.error("Failed to log policy violation:", logError);
          }
          return { ok: false, error: error.message };
        }
        throw error;
      }
    },
  },
  "tool.customer_data.search": {
    async call(ctx: ToolContext, input: unknown) {
      const startTime = clock.now().getTime();
      const requestId = crypto.randomUUID();
      
      const data = isRecord(input) ? input : {};
      const clientId = asString(data.clientId) ?? ctx.clientId;
      const entity = asString(data.entity);
      const query = data.query;
      
      if (!clientId) {
        return { ok: false, error: "clientId is required" };
      }
      if (!entity || !query) {
        return { ok: false, error: "entity and query are required" };
      }
      
      if (!logger) {
        return {
          ok: false,
          error: "ActionLogger required for customer_data.search (Audit Requirement)",
        };
      }
      
      const agentId = (ctx as unknown as { agentId?: string }).agentId ?? ctx.userId;
      const profile = agentProfileGetter(agentId);
      const permissions = profile?.permissions ?? [];
      
      const policyCtx: PolicyContext = {
        userId: ctx.userId,
        clientId,
        projectId: ctx.projectId,
        agentId,
        permissions: permissions as Permission[],
      };
      
      try {
        const decision = await policyEngine.authorize(
          policyCtx,
          "customer_data.search",
          data
        );
        
        const capability = capabilityRegistry.getCapabilities(clientId);
        if (!capability) {
          return { ok: false, error: "No capabilities found for clientId" };
        }
        
        const operationId = `search${entity.charAt(0).toUpperCase() + entity.slice(1)}`;
        if (!capabilityRegistry.isOperationAllowed(clientId, operationId)) {
          return { ok: false, error: `Search on entity ${entity} not allowed for clientId` };
        }
        
        const source = capabilityRegistry.getSourceForOperation(clientId, operationId);
        const sanitized = policyEngine.sanitize(
          { entity, query, limit: data.limit },
          capability,
          operationId
        );
        
        const connector = connectorRegistry.getConnector(clientId, source);
        const result = await connector.executeReadModel(
          operationId,
          { entity, query, ...sanitized.params },
          sanitized.constraints
        );
        
        const redacted = policyEngine.redact(result.data, capability, operationId);
        const latencyMs = clock.now().getTime() - startTime;
        const resultHash = generateResultHash(redacted.data, capability.operations[operationId]?.denyFields);
        
        try {
          await logger.append({
            agentId,
            userId: ctx.userId,
            projectId: ctx.projectId,
            clientId,
            action: "customer_data.access",
            input: { clientId, entity, query, requestId, ...data },
            output: {
              rowCount: redacted.metadata.rowCount,
              fieldsReturned: redacted.metadata.fieldsReturned,
              latencyMs,
              sourceType: result.metadata.sourceType,
              resultHash,
              policyDecisionHash: decision.decisionHash,
              requestId,
            },
            ts: clock.now().toISOString(),
            blocked: false,
          });
        } catch (error) {
          throw new Error(
            `AUDIT_LOG_WRITE_FAILED: Cannot complete customer_data access without audit log. ${error instanceof Error ? error.message : String(error)}`
          );
        }
        
        return {
          ok: true,
          output: {
            results: redacted.data,
            metadata: redacted.metadata,
            executionMetrics: { latencyMs },
            requestId,
          },
        };
      } catch (error) {
        if (error instanceof PolicyError) {
          try {
            await logger.append({
              agentId,
              userId: ctx.userId,
              projectId: ctx.projectId,
              clientId,
              action: "policy.violation",
              input: { clientId, operation: "customer_data.search", requestId, ...data },
              output: { reason: error.message, code: error.code, requestId },
              ts: clock.now().toISOString(),
              blocked: true,
              reason: error.message,
            });
          } catch (logError) {
            console.error("Failed to log policy violation:", logError);
          }
          return { ok: false, error: error.message };
        }
      throw error;
    }
  }
  },
  ...premiumTools,
};
};

export function createOrchestrator(
  logger: ActionLogger,
  reviewStore: ReviewStore,
  pool: Pool,
  policyEngine: PolicyEngine,
  connectorRegistry: MultiSourceConnectorRegistry,
  capabilityRegistry: CapabilityRegistry,
  clock?: Clock,
  licenseManager?: LicenseManager
): Orchestrator {
  const decisions = new DecisionsService(pool);
  const knowledge = new KnowledgeService(pool);
  
  // Agent profile getter for permissions
  const agentProfileGetter = (agentId: string) => {
    try {
      const profile = loader.getById(agentId);
      return { permissions: profile.permissions };
    } catch {
      return null;
    }
  };
  
  // Use orchestrator's clock if provided, otherwise create new SystemClock
  const orchestratorClock = clock ?? new SystemClock();
  
  const toolRouter = new ToolRouter(
    toolHandlers(decisions, knowledge, logger, policyEngine, connectorRegistry, capabilityRegistry, agentProfileGetter, orchestratorClock, licenseManager)
  );
  
  return new Orchestrator(
    { getById: (id: string) => loader.getById(id) },
    toolRouter,
    reviewStore,
    logger,
    undefined, // governanceValidator
    orchestratorClock,
    skillRegistry, // Optional skill registry
    skillExecutor, // Optional skill executor
    skillLoader // Optional skill loader
  );
}
