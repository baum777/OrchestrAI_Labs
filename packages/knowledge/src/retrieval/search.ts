import type { KnowledgeItem } from "../models/knowledge-item";

export function searchKnowledge(query: string): KnowledgeItem[] {
  return [
    {
      id: `item-${Date.now()}`,
      title: "Sample knowledge",
      source: "system",
      snippet: `Result for ${query}`
    }
  ];
}

