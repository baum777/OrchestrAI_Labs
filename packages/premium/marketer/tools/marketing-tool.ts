/**
 * Marketing Tool
 * 
 * Tool for generating marketing narratives from KPIs.
 * Integrates with PolicyEngine for sanitization and redaction.
 */

import type { ToolHandler, ToolContext } from "@agent-runtime/execution/tool-router";
import type { PolicyEngine } from "@governance/policy/policy-engine";
import type { ActionLogger } from "@agent-runtime/orchestrator/orchestrator";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { KPIParser } from "../utils/kpi-parser.js";
import { MarketerAgent } from "../agents/marketer-agent.js";
import { PolicyError } from "@governance/policy/policy-engine";

export interface MarketingToolInput {
  kpiMetrics: Array<{
    name: string;
    value: number;
    previousValue?: number;
    timestamp: string;
    unit?: string;
  }>;
  targetAudience?: string;
  campaignGoal?: string;
  framework?: "PAS" | "AIDA" | "auto";
}

export interface MarketingToolOutput {
  narrative: string;
  framework: string;
  keyInsights: string[];
  callToAction: string;
  semanticTranslation: {
    problem: string;
    context: string;
    urgency: "low" | "medium" | "high";
    suggestedFocus: string[];
  };
}

/**
 * Create marketing tool handler with PolicyEngine integration.
 */
export function createMarketingTool(
  policyEngine: PolicyEngine,
  logger: ActionLogger,
  clock: Clock
): ToolHandler {
  const kpiParser = new KPIParser(clock);
  const marketerAgent = new MarketerAgent(kpiParser, clock);

  return {
    async call(ctx: ToolContext, input: unknown): Promise<{ ok: boolean; output?: MarketingToolOutput; error?: string }> {
      const startTime = clock.now().getTime();

      // Step 1: PolicyEngine Authorization
      try {
        const policyCtx = {
          userId: ctx.userId,
          clientId: ctx.clientId,
          projectId: ctx.projectId,
          agentId: ctx.agentId,
        };

        policyEngine.authorize(
          policyCtx,
          "tool.marketing.generateNarrative",
          { clientId: ctx.clientId, ...input }
        );
      } catch (error) {
        if (error instanceof PolicyError) {
          try {
            await logger.append({
              agentId: ctx.agentId ?? ctx.userId,
              userId: ctx.userId,
              projectId: ctx.projectId,
              clientId: ctx.clientId,
              action: "policy.violation",
              input: { operation: "tool.marketing.generateNarrative", ...input },
              output: { reason: error.message, code: error.code },
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

      // Step 2: Sanitize input
      const sanitizedInput = policyEngine.sanitize(
        input as Record<string, unknown>,
        {
          clientId: ctx.clientId ?? "unknown",
          operations: {
            generateNarrative: {
              operationId: "generateNarrative",
              source: "marketer",
              allowedFields: ["kpiMetrics", "targetAudience", "campaignGoal", "framework"],
            },
          },
          defaultMaxRows: 100,
        },
        "generateNarrative"
      );

      // Step 3: Validate input structure
      const toolInput = sanitizedInput.params as MarketingToolInput;
      if (!toolInput.kpiMetrics || !Array.isArray(toolInput.kpiMetrics)) {
        return { ok: false, error: "kpiMetrics is required and must be an array" };
      }

      // Step 4: Generate narrative
      try {
        const result = await marketerAgent.generateNarrative(toolInput);

        // Step 5: Redact result (if needed)
        const redacted = policyEngine.redact(
          [result],
          {
            clientId: ctx.clientId ?? "unknown",
            operations: {
              generateNarrative: {
                operationId: "generateNarrative",
                source: "marketer",
                allowedFields: ["narrative", "framework", "keyInsights", "callToAction", "semanticTranslation"],
              },
            },
            defaultMaxRows: 100,
          },
          "generateNarrative"
        );

        const output = redacted.data[0] as MarketingToolOutput;
        const latencyMs = clock.now().getTime() - startTime;

        // Step 6: Log success
        await logger.append({
          agentId: ctx.agentId ?? ctx.userId,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "marketing.narrative.generated",
          input: { operation: "tool.marketing.generateNarrative", ...toolInput },
          output: {
            framework: output.framework,
            urgency: output.semanticTranslation.urgency,
            latencyMs,
          },
          ts: clock.now().toISOString(),
          blocked: false,
        });

        return { ok: true, output };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await logger.append({
          agentId: ctx.agentId ?? ctx.userId,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId: ctx.clientId,
          action: "marketing.narrative.failed",
          input: { operation: "tool.marketing.generateNarrative", ...toolInput },
          output: { error: errorMessage },
          ts: clock.now().toISOString(),
          blocked: true,
          reason: errorMessage,
        });
        return { ok: false, error: errorMessage };
      }
    },
  };
}

