import type { ReviewQueue, ReviewRequest } from "@agent-runtime/orchestrator/orchestrator";

export class InMemoryReviewQueue implements ReviewQueue {
  private items: ReviewRequest[] = [];

  async create(req: ReviewRequest): Promise<void> {
    this.items.push(req);
  }

  list(): ReviewRequest[] {
    return [...this.items];
  }
}

