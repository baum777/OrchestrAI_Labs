/**
 * Clock Tests
 */

import { describe, it, expect } from '@jest/globals';
import { SystemClock, FakeClock } from '../clock.js';

describe('Clock', () => {
  const sysClock = new SystemClock();

  describe('SystemClock', () => {
    it('returns current system time', () => {
      const clock = new SystemClock();
      const before = clock.now();
      const now = clock.now();
      const after = clock.now();

      expect(now.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(now.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('FakeClock', () => {
    it('returns set time', () => {
      const clock = new FakeClock();
      const testTime = sysClock.parseISO('2026-02-18T10:00:00.000Z');

      clock.set(testTime);
      expect(clock.now().toISOString()).toBe('2026-02-18T10:00:00.000Z');
    });

    it('advances time correctly', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-18T10:00:00.000Z'));

      clock.advance(60000); // 1 minute
      expect(clock.now().toISOString()).toBe('2026-02-18T10:01:00.000Z');

      clock.advance(3600000); // 1 hour
      expect(clock.now().toISOString()).toBe('2026-02-18T11:01:00.000Z');
    });

    it('uses initial time if provided', () => {
      const initialTime = sysClock.parseISO('2026-02-18T10:00:00.000Z');
      const clock = new FakeClock(initialTime);

      expect(clock.now().toISOString()).toBe('2026-02-18T10:00:00.000Z');
    });
  });
});

