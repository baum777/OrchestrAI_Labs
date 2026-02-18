/**
 * Timestamp Integrity Utility Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateTimestampIntegrity,
  enforceTimestampIntegrity,
  generateCreationTimestamps,
  generateUpdateTimestamps,
} from '../timestamp-integrity.js';
import { FakeClock } from '@agent-system/governance-v2/runtime/clock';

describe('Timestamp Integrity Utility', () => {
  describe('validateTimestampIntegrity', () => {
    it('passes when updatedAt >= createdAt', () => {
      const result = validateTimestampIntegrity(
        '2026-02-13T10:00:00.000Z',
        '2026-02-13T11:00:00.000Z'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes when updatedAt === createdAt', () => {
      const result = validateTimestampIntegrity(
        '2026-02-13T10:00:00.000Z',
        '2026-02-13T10:00:00.000Z'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails and self-heals when updatedAt < createdAt', () => {
      const result = validateTimestampIntegrity(
        '2026-02-13T10:00:00.000Z',
        '2024-01-15T10:00:00.000Z'
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.corrected).toBeDefined();
      expect(result.corrected?.updatedAt).toBe('2026-02-13T10:00:00.000Z');
      expect(result.corrected?.createdAt).toBe('2026-02-13T10:00:00.000Z');
      expect(result.warnings).toContain('Self-healed: updatedAt set to createdAt');
    });

    it('fails on invalid createdAt format', () => {
      const result = validateTimestampIntegrity(
        'invalid-date',
        '2026-02-13T10:00:00.000Z'
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid createdAt format');
    });

    it('fails on invalid updatedAt format', () => {
      const result = validateTimestampIntegrity(
        '2026-02-13T10:00:00.000Z',
        'invalid-date'
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid updatedAt format');
    });

    it('warns when updatedAt is significantly in the future', () => {
      const clock = new FakeClock(new Date('2026-02-13T10:00:00.000Z'));
      const result = validateTimestampIntegrity(
        '2026-02-13T10:00:00.000Z',
        '2026-02-13T10:10:00.000Z', // 10 minutes in future
        clock
      );

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('minutes in the future');
    });
  });

  describe('enforceTimestampIntegrity', () => {
    it('returns original timestamps when valid', () => {
      const result = enforceTimestampIntegrity(
        '2026-02-13T10:00:00.000Z',
        '2026-02-13T11:00:00.000Z'
      );

      expect(result.createdAt).toBe('2026-02-13T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-02-13T11:00:00.000Z');
    });

    it('corrects timestamps when updatedAt < createdAt', () => {
      const result = enforceTimestampIntegrity(
        '2026-02-13T10:00:00.000Z',
        '2024-01-15T10:00:00.000Z'
      );

      expect(result.createdAt).toBe('2026-02-13T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-02-13T10:00:00.000Z'); // Self-healed
    });
  });

  describe('generateCreationTimestamps', () => {
    it('generates identical createdAt and updatedAt', () => {
      const clock = new FakeClock(new Date('2026-02-13T10:00:00.000Z'));
      const result = generateCreationTimestamps(clock);

      expect(result.createdAt).toBe('2026-02-13T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-02-13T10:00:00.000Z');
      expect(result.createdAt).toBe(result.updatedAt);
    });
  });

  describe('generateUpdateTimestamps', () => {
    it('preserves createdAt and sets updatedAt to now', () => {
      const clock = new FakeClock(new Date('2026-02-13T11:00:00.000Z'));
      const result = generateUpdateTimestamps('2026-02-13T10:00:00.000Z', clock);

      expect(result.createdAt).toBe('2026-02-13T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-02-13T11:00:00.000Z');
      expect(result.updatedAt).not.toBe(result.createdAt);
    });
  });
});

