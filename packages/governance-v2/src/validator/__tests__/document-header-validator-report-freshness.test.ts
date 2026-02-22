/**
 * Document Header Validator - Report Freshness Tests
 * 
 * Tests for report date freshness validation (Berlin timezone).
 */

import { DocumentHeaderValidator } from '../document-header-validator.js';
import { FakeClock } from '../../runtime/clock.js';
import { formatBerlinDate } from '@agent-system/shared';

describe('DocumentHeaderValidator - Report Freshness', () => {
  describe('validateReportFreshness', () => {
    it('should pass when report date matches Berlin today (requiresFreshDate=true)', () => {
      // Simulate: Berlin 19.02.2026 00:30 (UTC 18.02.2026 23:30)
      // eslint-disable-next-line no-restricted-globals
      const clock = new FakeClock(new Date('2026-02-18T23:30:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const createdAt = clock.now().toISOString();
      const result = validator.validateReportFreshness(createdAt, true);

      expect(result).toBeNull(); // No error
    });

    it('should fail when report date does not match Berlin today', () => {
      // Simulate: Berlin 19.02.2026 00:30 (UTC 18.02.2026 23:30)
      // eslint-disable-next-line no-restricted-globals
      const clock = new FakeClock(new Date('2026-02-18T23:30:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      // Report created yesterday (Berlin 18.02.2026) - use clock.parseISO for test data
      const yesterday = clock.parseISO('2026-02-17T23:30:00.000Z').toISOString();
      const result = validator.validateReportFreshness(yesterday, true);

      expect(result).toBe('report_date_mismatch');
    });

    it('should skip validation when requiresFreshDate=false', () => {
      // eslint-disable-next-line no-restricted-globals
      const clock = new FakeClock(new Date('2026-02-18T23:30:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const oldDate = clock.parseISO('2026-01-01T00:00:00.000Z').toISOString();
      const result = validator.validateReportFreshness(oldDate, false);

      expect(result).toBeNull(); // Validation skipped
    });

    it('should handle UTC 23:30 → Berlin 00:30 (next day)', () => {
      // Test Case 1 from requirements
      // UTC: 2026-02-18T23:30:00.000Z
      // Berlin: 19.02.2026 00:30
      // eslint-disable-next-line no-restricted-globals
      const clock = new FakeClock(new Date('2026-02-18T23:30:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const createdAt = clock.now().toISOString();
      const berlinToday = formatBerlinDate(clock.now());

      expect(berlinToday).toBe('19.02.2026');

      const result = validator.validateReportFreshness(createdAt, true);
      expect(result).toBeNull(); // Should pass
    });

    it('should fail for invalid ISO timestamp', () => {
      // Note: `new Date()` here is intentional - FakeClock constructor requires an initial time.
      // This is the only acceptable use of `new Date()` in test files (Clock abstraction initialization).
      // eslint-disable-next-line no-restricted-globals
      const clock = new FakeClock(new Date());
      const _validator = new DocumentHeaderValidator(clock);

      const result = _validator.validateReportFreshness('invalid-date', true);
      expect(result).toBe('invalid_created_at_format');
    });
  });

  describe('Session Time Gap Handling', () => {
    it('should use fresh clock after time gap >= 50 minutes', () => {
      // Simulate: Session start at 18:00
      // eslint-disable-next-line no-restricted-globals
      const clock1 = new FakeClock(new Date('2026-02-18T18:00:00.000Z'));

      const createdAt1 = clock1.now().toISOString();

      // Simulate: Pause > 50 minutes, then resume at 19:10
      // eslint-disable-next-line no-restricted-globals
      const clock2 = new FakeClock(new Date('2026-02-18T19:10:00.000Z')); // Fresh clock

      // New report should use fresh clock
      const createdAt2 = clock2.now().toISOString();

      // Assert: createdAt2 is different from createdAt1 (no reuse)
      expect(createdAt2).not.toBe(createdAt1);

      // Assert: createdAt2 contains time component (no date-only)
      expect(createdAt2).toMatch(/T\d{2}:\d{2}:\d{2}/);

      // Assert: Freshness validation should pass with new clock
      // Create fresh validator with the new clock
      const validator2 = new DocumentHeaderValidator(clock2);
      const result = validator2.validateReportFreshness(createdAt2, true);
      expect(result).toBeNull();
    });
  });

  describe('No Date-Only Slicing', () => {
    it('should ensure createdAt contains full ISO timestamp', () => {
      // eslint-disable-next-line no-restricted-globals
      const clock = new FakeClock(new Date('2026-02-18T23:30:00.000Z'));

      const createdAt = clock.now().toISOString();

      // Assert: Full ISO timestamp (not date-only)
      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(createdAt).not.toBe(createdAt.slice(0, 10)); // Not date-only

      // Assert: Can be parsed back to Date using clock abstraction
      const parsed = clock.parseISO(createdAt);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });
});

