import { AgentDomain } from "@agent-system/shared";

export class IntentClassifier {
  classify(input: string): AgentDomain {
    const normalized = input.toLowerCase();

    if (normalized.includes("policy") || normalized.includes("audit") || normalized.includes("governance")) {
      return "governance";
    }

    if (normalized.includes("project") || normalized.includes("phase") || normalized.includes("workflow")) {
      return "workflow";
    }

    if (normalized.includes("knowledge") || normalized.includes("research") || normalized.includes("source")) {
      return "knowledge";
    }

    return "tools";
  }
}

