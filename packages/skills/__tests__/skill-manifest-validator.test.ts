/**
 * Tests for Skill Manifest Validator
 */

import { describe, it, expect } from '@jest/globals';
import { assertSkillManifest } from '../src/registry/skill-manifest-validator.js';
import type { SkillManifest } from '../src/spec/skill-spec.js';

describe('Skill Manifest Validator', () => {
  const validManifest: SkillManifest = {
    id: 'test.skill',
    name: 'Test Skill',
    version: '1.0.0',
    description: 'A test skill for validation',
    tags: ['test'],
    owners: ['@owner1'],
    status: 'stable',
    layer: 'implementation',
    autonomyTier: 3,
    requiredPermissions: ['test.read'],
    requiredTools: ['tool.test.execute'],
    sideEffects: [{ type: 'read', resource: 'test' }],
    reviewPolicy: { mode: 'none' },
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    resources: { instructions: 'instructions.md' },
    telemetry: {
      trackExecution: true,
      trackLatency: true,
      trackErrors: true,
    },
  };

  it('should validate a valid manifest', () => {
    expect(() => assertSkillManifest(validManifest)).not.toThrow();
  });

  it('should reject manifest without status', () => {
    const invalid = { ...validManifest };
    delete (invalid as any).status;
    expect(() => assertSkillManifest(invalid)).toThrow();
  });

  it('should reject manifest with empty owners', () => {
    const invalid = { ...validManifest, owners: [] };
    expect(() => assertSkillManifest(invalid)).toThrow('At least one owner is required');
  });

  it('should reject manifest with more than 3 owners', () => {
    const invalid = { ...validManifest, owners: ['@o1', '@o2', '@o3', '@o4'] };
    expect(() => assertSkillManifest(invalid)).toThrow('Maximum 3 owners allowed');
  });

  it('should reject manifest with write side effects but reviewPolicy.mode=none', () => {
    const invalid = {
      ...validManifest,
      sideEffects: [{ type: 'create', resource: 'test' }],
      reviewPolicy: { mode: 'none' },
    };
    expect(() => assertSkillManifest(invalid)).toThrow('reviewPolicy');
  });

  it('should accept manifest with write side effects and reviewPolicy.mode=required', () => {
    const valid = {
      ...validManifest,
      sideEffects: [{ type: 'create', resource: 'test' }],
      reviewPolicy: { mode: 'required' },
    };
    expect(() => assertSkillManifest(valid)).not.toThrow();
  });

});

