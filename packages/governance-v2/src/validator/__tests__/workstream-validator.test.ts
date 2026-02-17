/**
 * Tests for Workstream Validator
 */

import { describe, it, expect } from '@jest/globals';
import { WorkstreamValidator } from '../workstream-validator.js';
import type { Workstream } from '../../types/governance.types.js';

describe('WorkstreamValidator', () => {
  const validator = new WorkstreamValidator();

  it('should pass valid workstream', () => {
    const workstream: Workstream = {
      id: 'ws1',
      owner: 'test_owner',
      scope: ['packages/governance-v2/**'],
      autonomyTier: 3,
      layer: 'implementation',
      structuralModel: 'Test model',
      risks: [],
      definitionOfDone: 'All tests pass',
    };

    const result = validator.validate(workstream);
    expect(result.status).toBe('pass');
  });

  it('should block workstream without owner', () => {
    const workstream: Partial<Workstream> = {
      id: 'ws1',
      scope: ['packages/governance-v2/**'],
      autonomyTier: 3,
      layer: 'implementation',
      structuralModel: 'Test model',
      risks: [],
      definitionOfDone: 'All tests pass',
    };

    const result = validator.validate(workstream);
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('Owner must be set');
  });

  it('should block workstream without scope', () => {
    const workstream: Partial<Workstream> = {
      id: 'ws1',
      owner: 'test_owner',
      autonomyTier: 3,
      layer: 'implementation',
      structuralModel: 'Test model',
      risks: [],
      definitionOfDone: 'All tests pass',
    };

    const result = validator.validate(workstream);
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('Scope must not be empty');
  });

  it('should block workstream without structural model', () => {
    const workstream: Partial<Workstream> = {
      id: 'ws1',
      owner: 'test_owner',
      scope: ['packages/governance-v2/**'],
      autonomyTier: 3,
      layer: 'implementation',
      risks: [],
      definitionOfDone: 'All tests pass',
    };

    const result = validator.validate(workstream);
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('Structural Model must be present');
  });

  it('should block workstream without DoD', () => {
    const workstream: Partial<Workstream> = {
      id: 'ws1',
      owner: 'test_owner',
      scope: ['packages/governance-v2/**'],
      autonomyTier: 3,
      layer: 'implementation',
      structuralModel: 'Test model',
      risks: [],
    };

    const result = validator.validate(workstream);
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('Definition of Done must be present');
  });
});

