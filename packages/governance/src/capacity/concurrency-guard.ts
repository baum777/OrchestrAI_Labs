/**
 * Concurrency Guard
 *
 * Enforces per-tenant maximum concurrent execution limits.
 * Hard runtime guard that blocks when limit reached.
 */

import { Injectable, Logger } from '@nestjs/common';
import { SystemClock } from '../../../governance-v2/src/runtime/clock';
import type { Clock } from '../../../governance-v2/src/runtime/clock';

interface ConcurrencySlot {
  executionId: string;
  acquiredAt: number;
  metadata: {
    agentId?: string;
    projectId?: string;
    userId?: string;
  };
}

interface ConcurrencyConfig {
  maxExecutions: number;
  queueTimeoutMs: number;
}

@Injectable()
export class ConcurrencyGuard {
  private readonly logger = new Logger(ConcurrencyGuard.name);
  private activeExecutions: Map<string, Map<string, ConcurrencySlot>> = new Map();
  private waitQueues: Map<string, Array<{
    resolve: (slot: { executionId: string }) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
    requestedAt: number;
  }>> = new Map();
  private clock: Clock;

  constructor(clock?: Clock) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Acquire a concurrency slot for execution
   * @returns slot with executionId if acquired, null if limit reached
   */
  async acquireSlot(
    tenantId: string,
    config: ConcurrencyConfig,
    metadata?: { agentId?: string; projectId?: string; userId?: string }
  ): Promise<{ executionId: string } | null> {
    const tenantExecutions = this.activeExecutions.get(tenantId);
    const currentCount = tenantExecutions?.size ?? 0;

    // Check if slot available
    if (currentCount < config.maxExecutions) {
      const executionId = this.generateExecutionId();
      const slot: ConcurrencySlot = {
        executionId,
        acquiredAt: this.clock.now().getTime(),
        metadata: metadata ?? {},
      };

      if (!tenantExecutions) {
        this.activeExecutions.set(tenantId, new Map());
      }
      this.activeExecutions.get(tenantId)!.set(executionId, slot);

      this.logger.debug(`Acquired slot ${executionId} for tenant ${this.hashId(tenantId)} (${currentCount + 1}/${config.maxExecutions})`);
      return { executionId };
    }

    // Limit reached - queue or reject based on config
    if (config.queueTimeoutMs > 0) {
      return this.queueForSlot(tenantId, config.queueTimeoutMs, metadata);
    }

    this.logger.warn(`Concurrency limit reached for tenant ${this.hashId(tenantId)} (${config.maxExecutions})`);
    return null;
  }

  /**
   * Queue for a slot with timeout
   */
  private queueForSlot(
    tenantId: string,
    timeoutMs: number,
    metadata?: { agentId?: string; projectId?: string; userId?: string }
  ): Promise<{ executionId: string } | null> {
    return new Promise((resolve, reject) => {
      const timeout = this.clock.setTimeout(() => {
        // Remove from queue
        const queue = this.waitQueues.get(tenantId);
        if (queue) {
          const idx = queue.findIndex(q => q.resolve === resolve);
          if (idx >= 0) queue.splice(idx, 1);
        }
        reject(new Error(`Timeout waiting for concurrency slot after ${timeoutMs}ms`));
      }, timeoutMs);

      const waitEntry = {
        resolve: (slot: { executionId: string }) => {
          clearTimeout(timeout);
          resolve(slot);
        },
        reject: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        },
        timeout,
        requestedAt: this.clock.now().getTime(),
      };

      if (!this.waitQueues.has(tenantId)) {
        this.waitQueues.set(tenantId, []);
      }
      this.waitQueues.get(tenantId)!.push(waitEntry);

      this.logger.debug(`Queued for slot: tenant=${this.hashId(tenantId)}, timeout=${timeoutMs}ms`);
    });
  }

  /**
   * Release a concurrency slot
   */
  releaseSlot(tenantId: string, executionId: string): void {
    const tenantExecutions = this.activeExecutions.get(tenantId);
    if (!tenantExecutions) return;

    const slot = tenantExecutions.get(executionId);
    if (!slot) return;

    // Calculate duration for metrics
    const durationMs = this.clock.now().getTime() - slot.acquiredAt;

    tenantExecutions.delete(executionId);
    this.logger.debug(`Released slot ${executionId} for tenant ${this.hashId(tenantId)} (held ${durationMs}ms)`);

    // Cleanup empty tenant maps
    if (tenantExecutions.size === 0) {
      this.activeExecutions.delete(tenantId);
    }

    // Notify next waiter
    this.processWaitQueue(tenantId);
  }

  /**
   * Process wait queue for a tenant
   */
  private processWaitQueue(tenantId: string): void {
    const queue = this.waitQueues.get(tenantId);
    if (!queue || queue.length === 0) return;

    const config = this.estimateConfig(tenantId);
    const tenantExecutions = this.activeExecutions.get(tenantId);
    const currentCount = tenantExecutions?.size ?? 0;

    while (queue.length > 0 && currentCount < config.maxExecutions) {
      const waiter = queue.shift()!;
      
      // Acquire slot for waiter
      const executionId = this.generateExecutionId();
      const slot: ConcurrencySlot = {
        executionId,
        acquiredAt: this.clock.now().getTime(),
        metadata: {},
      };

      if (!this.activeExecutions.has(tenantId)) {
        this.activeExecutions.set(tenantId, new Map());
      }
      this.activeExecutions.get(tenantId)!.set(executionId, slot);

      waiter.resolve({ executionId });
    }
  }

  /**
   * Get current concurrency state for a tenant
   */
  getState(tenantId: string): {
    activeCount: number;
    waitQueueLength: number;
    slots: Array<{ executionId: string; heldSince: number; metadata: Record<string, string> }>;
  } {
    const tenantExecutions = this.activeExecutions.get(tenantId);
    const queue = this.waitQueues.get(tenantId);

    return {
      activeCount: tenantExecutions?.size ?? 0,
      waitQueueLength: queue?.length ?? 0,
      slots: Array.from(tenantExecutions?.values() ?? []).map(s => ({
        executionId: s.executionId,
        heldSince: s.acquiredAt,
        metadata: s.metadata,
      })),
    };
  }

  /**
   * Force cleanup of stale executions (emergency use)
   */
  forceCleanup(tenantId: string, maxAgeMs: number): number {
    const tenantExecutions = this.activeExecutions.get(tenantId);
    if (!tenantExecutions) return 0;

    const now = this.clock.now().getTime();
    let cleaned = 0;

    for (const [executionId, slot] of tenantExecutions.entries()) {
      if (now - slot.acquiredAt > maxAgeMs) {
        tenantExecutions.delete(executionId);
        cleaned++;
        this.logger.warn(`Force cleaned stale execution ${executionId} for tenant ${this.hashId(tenantId)}`);
      }
    }

    if (tenantExecutions.size === 0) {
      this.activeExecutions.delete(tenantId);
    }

    return cleaned;
  }

  /**
   * Estimate config from current state (for internal use)
   */
  private estimateConfig(tenantId: string): ConcurrencyConfig {
    // Default conservative config
    return {
      maxExecutions: 5,
      queueTimeoutMs: 30000,
    };
  }

  private executionCounter = 0;

  private generateExecutionId(): string {
    // Deterministic execution ID using clock + sequential counter
    return `exec-${this.clock.now().getTime()}-${++this.executionCounter}`;
  }

  private hashId(id: string): string {
    return `hash-${Buffer.from(id).toString('base64').substring(0, 8)}`;
  }
}
