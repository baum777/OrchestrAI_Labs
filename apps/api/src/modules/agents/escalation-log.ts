import type { ActionLogger } from "@agent-runtime/orchestrator/orchestrator";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

export type EscalationContext = {
  projectId?: string;
  clientId?: string;
  decisionId?: string;
  toolName?: string;
  autonomyTier?: number;
};

export type EscalationDetails = {
  reason: string;
  details?: Record<string, unknown>;
  context?: EscalationContext;
};

/**
 * Logs an escalation event to action_logs.
 * Escalations indicate governance violations or drift attempts.
 */
export async function logEscalation(
  logger: ActionLogger,
  params: {
    agentId: string;
    userId: string;
    projectId?: string;
    clientId?: string;
    escalation: EscalationDetails;
  },
  clock?: Clock
): Promise<void> {
  const timeClock = clock ?? new SystemClock();
  const timestamp = timeClock.now().toISOString();
  await logger.append({
    agentId: params.agentId,
    userId: params.userId,
    projectId: params.projectId,
    clientId: params.clientId,
    action: "escalation",
    input: {
      reason: params.escalation.reason,
      details: params.escalation.details ?? {},
      context: params.escalation.context ?? {},
    },
    output: {
      escalated: true,
      timestamp,
    },
    ts: timestamp,
    blocked: true,
    reason: params.escalation.reason,
  });
}

