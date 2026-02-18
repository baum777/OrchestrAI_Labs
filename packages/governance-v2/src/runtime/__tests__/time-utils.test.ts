/**
 * Time Utils Tests
 */

import { describe, it, expect } from '@jest/globals';
import { SystemClock } from '../clock.js';
import { formatBerlin, calculateGapMinutes } from '../time-utils.js';

describe('Time Utils', () => {
  const sysClock = new SystemClock();

  describe('formatBerlin', () => {
    it('formats date to Europe/Berlin timezone', () => {
      const utcDate = sysClock.parseISO('2026-02-18T10:00:00.000Z');
      const formatted = formatBerlin(utcDate);
      
      // Should be formatted in Berlin timezone (UTC+1 in winter, UTC+2 in summer)
      // Format: DD.MM.YYYY, HH:MM:SS
      expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('calculateGapMinutes', () => {
    it('calculates gap correctly for 2 hours', () => {
      const lastSeen = '2026-02-18T10:00:00.000Z';
      const now = '2026-02-18T12:00:00.000Z';
      
      const gap = calculateGapMinutes(lastSeen, now);
      expect(gap).toBe(120);
    });

    it('calculates gap correctly for 50 minutes', () => {
      const lastSeen = '2026-02-18T10:00:00.000Z';
      const now = '2026-02-18T10:50:00.000Z';
      
      const gap = calculateGapMinutes(lastSeen, now);
      expect(gap).toBe(50);
    });

    it('calculates gap correctly for 10 minutes', () => {
      const lastSeen = '2026-02-18T10:00:00.000Z';
      const now = '2026-02-18T10:10:00.000Z';
      
      const gap = calculateGapMinutes(lastSeen, now);
      expect(gap).toBe(10);
    });

    it('throws error for invalid timestamps', () => {
      expect(() => {
        calculateGapMinutes('invalid', '2026-02-18T10:00:00.000Z');
      }).toThrow('Invalid ISO-8601 timestamp');
    });
  });
});

