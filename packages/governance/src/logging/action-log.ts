export interface ActionLogEntry {
  id: string;
  timestamp: string;
  agentId: string;
  projectId: string;
  message: string;
}

export function logAction(entry: ActionLogEntry): void {
  console.log(`[ActionLog] ${entry.timestamp} ${entry.agentId}: ${entry.message}`);
}

