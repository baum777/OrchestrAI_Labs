import type { KnowledgeItem } from "../models/knowledge-item";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

export function searchKnowledge(query: string, clock: Clock = new SystemClock()): KnowledgeItem[] {
  return [
    {
      id: `item-${clock.now().getTime()}`,
      title: "Sample knowledge",
      source: "system",
      snippet: `Result for ${query}`
    }
  ];
}

