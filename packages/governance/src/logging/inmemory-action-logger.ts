import type { ActionLogger } from "@agent-system/agent-runtime";

interface ActionLogEntry {
  agentId: string;
  userId: string;
  projectId?: string;
  clientId?: string;
  action: string;
  input: unknown;
  output: unknown;
  ts: string;
  blocked?: boolean;
  reason?: string;
}

export class InMemoryActionLogger implements ActionLogger {
  private logs: ActionLogEntry[] = [];

  async append(entry: ActionLogEntry): Promise<void> {
    this.logs.push(entry);
  }

  list(): ActionLogEntry[] {
    return [...this.logs];
  }
}

