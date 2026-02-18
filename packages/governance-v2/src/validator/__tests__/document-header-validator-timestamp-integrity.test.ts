/**
 * Document Header Validator - Timestamp Integrity Tests
 */

import { describe, it, expect } from '@jest/globals';
import { DocumentHeaderValidator } from '../document-header-validator.js';
import { FakeClock, SystemClock } from '../../runtime/clock.js';

describe('DocumentHeaderValidator - Timestamp Integrity', () => {
  const sysClock = new SystemClock();

  describe('German Format (Erstellt/Aktualisiert)', () => {
    it('passes when Aktualisiert >= Erstellt', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-13T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Erstellt:** 2026-02-13
**Aktualisiert:** 2026-02-15
**Definition of Done:**
- Test`;

      const result = validator.validateContent(content);

      expect(result.status).toBe('pass');
      expect(result.reasons?.includes('timestamp_integrity_violation')).toBe(false);
    });

    it('blocks when Aktualisiert < Erstellt', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-13T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Erstellt:** 2026-02-13
**Aktualisiert:** 2024-01-15
**Definition of Done:**
- Test`;

      const result = validator.validateContent(content);

      expect(result.status).toBe('blocked');
      expect(result.reasons).toContain('timestamp_integrity_violation');
    });

    it('self-heals timestamp inconsistency', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-13T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Erstellt:** 2026-02-13
**Aktualisiert:** 2024-01-15
**Definition of Done:**
- Test`;

      const healed = validator.selfHealTimestampIntegrity(content);

      expect(healed.healed).toBe(true);
      expect(healed.content).toContain('**Aktualisiert:** 2026-02-13');
      expect(healed.content).not.toContain('**Aktualisiert:** 2024-01-15');
    });

    it('does not heal when timestamps are valid', () => {
      const clock = new FakeClock(sysClock.parseISO('2026-02-13T10:00:00.000Z'));
      const validator = new DocumentHeaderValidator(clock);

      const content = `**Version:** 1.0.0
**Owner:** @test
**Layer:** implementation
**Erstellt:** 2026-02-13
**Aktualisiert:** 2026-02-15
**Definition of Done:**
- Test`;

      const healed = validator.selfHealTimestampIntegrity(content);

      expect(healed.healed).toBe(false);
      expect(healed.content).toBe(content);
    });
  });
});

