/**
 * Date Format Tests
 *
 * Tests for Berlin timezone date formatting utilities.
 * Uses FakeClock for deterministic, governance-compliant tests.
 */

import { formatBerlinDate, formatBerlinDateTime, formatBerlinDateFromISO } from '../date-format.js';
import { FakeClock } from '@agent-system/governance-v2/runtime/clock';

const clock = new FakeClock();

describe('formatBerlinDate', () => {
  describe('UTC 23:30 → Berlin 00:30 (next day)', () => {
    it('should format UTC 23:30 as Berlin next day', () => {
      const iso = '2026-02-18T23:30:00.000Z';
      const result = formatBerlinDate(iso, clock);
      expect(result).toBe('19.02.2026');
    });

    it('should format UTC 22:00 as Berlin same day', () => {
      const iso = '2026-02-18T22:00:00.000Z';
      const result = formatBerlinDate(iso, clock);
      expect(result).toBe('18.02.2026');
    });

    it('should format UTC 00:00 as Berlin 01:00 same day', () => {
      const iso = '2026-02-19T00:00:00.000Z';
      const result = formatBerlinDate(iso, clock);
      expect(result).toBe('19.02.2026');
    });
  });

  describe('Edge cases', () => {
    it('should handle summer time (CEST, UTC+2)', () => {
      const iso = '2026-07-01T23:00:00.000Z';
      const result = formatBerlinDate(iso, clock);
      expect(result).toBe('02.07.2026');
    });

    it('should handle winter time (CET, UTC+1)', () => {
      const iso = '2026-01-01T23:00:00.000Z';
      const result = formatBerlinDate(iso, clock);
      expect(result).toBe('02.01.2026');
    });
  });
});

describe('formatBerlinDateTime', () => {
  it('should format date and time in Berlin timezone', () => {
    const iso = '2026-02-18T23:30:00.000Z';
    const result = formatBerlinDateTime(iso, clock);
    expect(result).toMatch(/19\.02\.2026/);
    expect(result).toMatch(/00:30/);
  });
});

describe('formatBerlinDateFromISO', () => {
  it('should format ISO string to Berlin date', () => {
    const isoString = '2026-02-18T23:30:00.000Z';
    const result = formatBerlinDateFromISO(isoString, clock);
    expect(result).toBe('19.02.2026');
  });

  it('should throw error for invalid ISO string', () => {
    expect(() => {
      formatBerlinDateFromISO('invalid-date', clock);
    }).toThrow('Invalid ISO-8601 timestamp');
  });
});

describe('Integration with Clock', () => {
  it('should work with FakeClock for testing', () => {
    const testClock = new FakeClock();
    const iso = '2026-02-18T23:30:00.000Z';
    const result = formatBerlinDate(iso, testClock);
    expect(result).toBe('19.02.2026');
  });

  it('should ensure no date-only slicing in timestamps', () => {
    const testClock = new FakeClock();
    const now = testClock.now();
    const isoString = now.toISOString();
    expect(isoString).toMatch(/T\d{2}:\d{2}:\d{2}/);
    expect(isoString).not.toBe(isoString.slice(0, 10));
  });
});

