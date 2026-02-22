/**
 * Document Header Validator Timestamp Policy Tests
 */

import { describe, it, expect } from '@jest/globals';
import { DocumentHeaderValidator } from '../document-header-validator.js';
import { FakeClock, SystemClock } from '../../runtime/clock.js';

describe('DocumentHeaderValidator - Timestamp Policy', () => {
  const sysClock = new SystemClock();

  describe('Future Timestamp Validation', () => {
    it('blocks timestamp 10 minutes in future (beyond 5 min skew)', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-18T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock, 5); // 5 min max skew

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Last Updated:** 2026-02-18T10:10:00.000Z
**Definition of Done:**
- Test`;

      const result = validator.validateContent(content);
      
      expect(result.status).toBe('blocked');
      expect(result.reasons).toContain('last_updated_in_future');
    });

    it('passes timestamp 2 minutes in future (within 5 min skew)', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-18T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock, 5); // 5 min max skew

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Last Updated:** 2026-02-18T10:02:00.000Z
**Definition of Done:**
- Test`;

      const result = validator.validateContent(content);
      
      // Should not have last_updated_in_future reason
      expect(result.reasons?.includes('last_updated_in_future')).toBe(false);
    });
  });

  describe('Invalid Format Validation', () => {
    it('blocks invalid timestamp format (DD.MM.YYYY)', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-18T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Last Updated:** 17.02.2026
**Definition of Done:**
- Test`;

      const result = validator.validateContent(content);
      
      expect(result.status).toBe('blocked');
      expect(result.reasons).toContain('invalid_last_updated_format');
    });

    it('blocks invalid timestamp format (non-ISO)', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-18T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Last Updated:** Feb 18, 2026
**Definition of Done:**
- Test`;

      const result = validator.validateContent(content);
      
      expect(result.status).toBe('blocked');
      expect(result.reasons).toContain('invalid_last_updated_format');
    });
  });

  describe('Valid Timestamp', () => {
    it('passes valid ISO-8601 timestamp', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-18T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Last Updated:** 2026-02-18T10:00:00.000Z
**Definition of Done:**
- Test`;

      const result = validator.validateContent(content);
      
      expect(result.status).toBe('pass');
      expect(result.reasons).toEqual([]);
    });

    it('passes valid ISO-8601 timestamp in past', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-18T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Last Updated:** 2026-02-17T10:00:00.000Z
**Definition of Done:**
- Test`;

      const result = validator.validateContent(content);
      
      expect(result.status).toBe('pass');
      expect(result.reasons).toEqual([]);
    });
  });
});

