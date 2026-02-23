/**
 * Concurrency Guard Tests
 */

import { ConcurrencyGuard } from '../concurrency-guard';
import { FakeClock } from '../../../governance-v2/src/runtime/clock';

describe('ConcurrencyGuard', () => {
  let guard: ConcurrencyGuard;
  let clock: FakeClock;

  beforeEach(() => {
    clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    guard = new ConcurrencyGuard(clock);
  });

  describe('acquireSlot', () => {
    it('should acquire slot when under limit', async () => {
      const slot = await guard.acquireSlot('tenant-1', { maxExecutions: 2, queueTimeoutMs: 0 });
      expect(slot).not.toBeNull();
      expect(slot?.executionId).toMatch(/^exec-/);
    });

    it('should reject when limit reached with no queue', async () => {
      await guard.acquireSlot('tenant-1', { maxExecutions: 1, queueTimeoutMs: 0 });
      const slot2 = await guard.acquireSlot('tenant-1', { maxExecutions: 1, queueTimeoutMs: 0 });
      expect(slot2).toBeNull();
    });

    it('should queue when limit reached with timeout', async () => {
      const config = { maxExecutions: 1, queueTimeoutMs: 1000 };
      const slot1 = await guard.acquireSlot('tenant-1', config);
      expect(slot1).not.toBeNull();

      // Second request should queue
      const slotPromise = guard.acquireSlot('tenant-1', config);
      
      // Release first slot
      guard.releaseSlot('tenant-1', slot1!.executionId);
      
      const slot2 = await slotPromise;
      expect(slot2).not.toBeNull();
    });

    it('should timeout when queue expires', async () => {
      const config = { maxExecutions: 1, queueTimeoutMs: 100 };
      const slot1 = await guard.acquireSlot('tenant-1', config);
      expect(slot1).not.toBeNull();

      // Queue for slot with short timeout
      const slotPromise = guard.acquireSlot('tenant-1', config);
      
      // Don't release slot - let it timeout
      await expect(slotPromise).rejects.toThrow('Timeout waiting for concurrency slot');
    });

    it('should track metadata', async () => {
      const metadata = { agentId: 'agent-1', projectId: 'proj-1', userId: 'user-1' };
      const slot = await guard.acquireSlot('tenant-1', { maxExecutions: 5, queueTimeoutMs: 0 }, metadata);
      
      const state = guard.getState('tenant-1');
      expect(state.activeCount).toBe(1);
      expect(state.slots[0].metadata).toEqual(metadata);
    });
  });

  describe('releaseSlot', () => {
    it('should release slot and notify waiters', async () => {
      const config = { maxExecutions: 1, queueTimeoutMs: 5000 };
      const slot1 = await guard.acquireSlot('tenant-1', config);
      
      // Start second request (will queue)
      const slot2Promise = guard.acquireSlot('tenant-1', config);
      
      // Release first
      guard.releaseSlot('tenant-1', slot1!.executionId);
      
      // Second should now acquire
      const slot2 = await slot2Promise;
      expect(slot2).not.toBeNull();
      expect(slot2!.executionId).not.toBe(slot1!.executionId);
    });

    it('should handle release of unknown slot gracefully', () => {
      expect(() => guard.releaseSlot('tenant-1', 'unknown-exec')).not.toThrow();
    });
  });

  describe('getState', () => {
    it('should return empty state for unknown tenant', () => {
      const state = guard.getState('unknown-tenant');
      expect(state.activeCount).toBe(0);
      expect(state.waitQueueLength).toBe(0);
      expect(state.slots).toEqual([]);
    });

    it('should track active slots', async () => {
      await guard.acquireSlot('tenant-1', { maxExecutions: 5, queueTimeoutMs: 0 }, { agentId: 'agent-1' });
      await guard.acquireSlot('tenant-1', { maxExecutions: 5, queueTimeoutMs: 0 }, { agentId: 'agent-2' });
      
      const state = guard.getState('tenant-1');
      expect(state.activeCount).toBe(2);
      expect(state.slots).toHaveLength(2);
    });
  });

  describe('forceCleanup', () => {
    it('should cleanup stale executions', async () => {
      const slot = await guard.acquireSlot('tenant-1', { maxExecutions: 5, queueTimeoutMs: 0 });
      
      // Advance clock by 1 hour
      clock.advance(60 * 60 * 1000);
      
      const cleaned = guard.forceCleanup('tenant-1', 30 * 60 * 1000); // 30 min max age
      expect(cleaned).toBe(1);
      
      const state = guard.getState('tenant-1');
      expect(state.activeCount).toBe(0);
    });

    it('should not cleanup fresh executions', async () => {
      await guard.acquireSlot('tenant-1', { maxExecutions: 5, queueTimeoutMs: 0 });
      
      const cleaned = guard.forceCleanup('tenant-1', 60 * 60 * 1000); // 1 hour max age
      expect(cleaned).toBe(0);
    });
  });

  describe('deterministic behavior', () => {
    it('should generate deterministic execution IDs with same clock', async () => {
      const guard1 = new ConcurrencyGuard(clock);
      const guard2 = new ConcurrencyGuard(clock);
      
      const slot1 = await guard1.acquireSlot('t1', { maxExecutions: 5, queueTimeoutMs: 0 });
      clock.advance(1);
      const slot2 = await guard2.acquireSlot('t1', { maxExecutions: 5, queueTimeoutMs: 0 });
      
      // IDs should be deterministic based on clock + counter
      expect(slot1?.executionId).toMatch(/^exec-\d+-\d+$/);
      expect(slot2?.executionId).toMatch(/^exec-\d+-\d+$/);
    });
  });
});
