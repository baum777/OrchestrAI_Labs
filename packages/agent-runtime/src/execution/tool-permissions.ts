import type { Permission, ToolRef } from "@shared/types/agent";

export const TOOL_PERMISSION_MAP: Record<ToolRef, Permission> = {
  "tool.knowledge.search": "knowledge.search",
  "tool.knowledge.getSource": "knowledge.read",

  "tool.workflow.getPhase": "project.read",
  "tool.workflow.validateDeliverable": "project.read",

  "tool.docs.createDraft": "project.update",
  "tool.docs.updateDraft": "project.update",

  "tool.decisions.createDraft": "decision.create",
  "tool.decisions.finalizeFromDraft": "decision.create",

  "tool.logs.append": "log.write",

  "tool.reviews.request": "review.request",
  "tool.reviews.status": "review.request",

  "tool.customer_data.executeReadModel": "customer_data.read",
  "tool.customer_data.getEntity": "customer_data.read",
  "tool.customer_data.search": "customer_data.read",
  
  "tool.marketing.generateNarrative": "marketing.generate",
};

