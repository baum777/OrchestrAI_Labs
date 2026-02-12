export interface KnowledgeItem {
  id: string;
  title: string;
  source: string;
  snippet: string;
  metadata?: Record<string, unknown>;
}

