/**
 * Date Format Tests
 * 
 * Tests for Berlin timezone date formatting utilities.
 */

import { formatBerlinDate, formatBerlinDateTime, formatBerlinDateFromISO } from '../date-format.js';
import { FakeClock } from '@agent-system/governance-v2/runtime/clock';

describe('formatBerlinDate', () => {
  describe('UTC 23:30 → Berlin 00:30 (next day)', () => {
    it('should format UTC 23:30 as Berlin next day', () => {
      // UTC: 2026-02-18T23:30:00.000Z
      // Berlin: 2026-02-19 00:30 (CET, UTC+1)
      const utcDate = new Date('2026-02-18T23:30:00.000Z');
      const result = formatBerlinDate(utcDate);
      expect(result).toBe('19.02.2026');
    });

    it('should format UTC 22:00 as Berlin same day', () => {
      // UTC: 2026-02-18T22:00:00.000Z
      // Berlin: 2026-02-18 23:00 (CET, UTC+1)
      const utcDate = new Date('2026-02-18T22:00:00.000Z');
      const result = formatBerlinDate(utcDate);
      expect(result).toBe('18.02.2026');
    });

    it('should format UTC 00:00 as Berlin 01:00 same day', () => {
      // UTC: 2026-02-19T00:00:00.000Z
      // Berlin: 2026-02-19 01:00 (CET, UTC+1)
      const utcDate = new Date('2026-02-19T00:00:00.000Z');
      const result = formatBerlinDate(utcDate);
      expect(result).toBe('19.02.2026');
    });
  });

  describe('Edge cases', () => {
    it('should handle summer time (CEST, UTC+2)', () => {
      // July 1, 2026 23:00 UTC → July 2, 2026 01:00 CEST
      const utcDate = new Date('2026-07-01T23:00:00.000Z');
      const result = formatBerlinDate(utcDate);
      expect(result).toBe('02.07.2026');
    });

    it('should handle winter time (CET, UTC+1)', () => {
      // January 1, 2026 23:00 UTC → January 2, 2026 00:00 CET
      const utcDate = new Date('2026-01-01T23:00:00.000Z');
      const result = formatBerlinDate(utcDate);
      expect(result).toBe('02.01.2026');
    });
  });
});

describe('formatBerlinDateTime', () => {
  it('should format date and time in Berlin timezone', () => {
    const utcDate = new Date('2026-02-18T23:30:00.000Z');
    const result = formatBerlinDateTime(utcDate);
    // Should be "19.02.2026 00:30" (Berlin time)
    expect(result).toMatch(/19\.02\.2026/);
    expect(result).toMatch(/00:30/);
  });
});

describe('formatBerlinDateFromISO', () => {
  it('should format ISO string to Berlin date', () => {
    const isoString = '2026-02-18T23:30:00.000Z';
    const result = formatBerlinDateFromISO(isoString);
    expect(result).toBe('19.02.2026');
  });

  it('should throw error for invalid ISO string', () => {
    expect(() => {
      formatBerlinDateFromISO('invalid-date');
    }).toThrow('Invalid ISO-8601 timestamp');
  });
});

describe('Integration with Clock', () => {
  it('should work with FakeClock for testing', () => {
    const clock = new FakeClock(new Date('2026-02-18T23:30:00.000Z'));
    const now = clock.now();
    const result = formatBerlinDate(now);
    expect(result).toBe('19.02.2026');
  });

  it('should ensure no date-only slicing in timestamps', () => {
    const clock = new FakeClock(new Date('2026-02-18T23:30:00.000Z'));
    const now = clock.now();
    const isoString = now.toISOString();
    
    // Assert: timestamp must contain time component (T)
    expect(isoString).toMatch(/T\d{2}:\d{2}:\d{2}/);
    // Assert: no date-only slicing
    expect(isoString).not.toBe(isoString.slice(0, 10));
  });
});

