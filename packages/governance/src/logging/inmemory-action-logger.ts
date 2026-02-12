import type { ActionLogger } from "@agent-runtime/orchestrator/orchestrator";

export class InMemoryActionLogger implements ActionLogger {
  private logs: any[] = [];

  async append(entry: any): Promise<void> {
    this.logs.push(entry);
  }

  list(): any[] {
    return [...this.logs];
  }
}

