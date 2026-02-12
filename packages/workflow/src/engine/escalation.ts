export class EscalationManager {
  notify(projectId: string, reason: string): void {
    console.info(`Escalation for ${projectId}: ${reason}`);
  }
}

