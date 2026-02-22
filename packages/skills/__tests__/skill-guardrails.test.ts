/**
 * Tests for Skill Guardrails
 */

import { describe, it, expect } from '@jest/globals';
import {
  checkSkillsEnabled,
  checkSkillPermissions,
  checkSkillStatusDisabled,
  runSkillGuardrails,
} from '../src/guardrails/skill-guardrails.js';
import type { SkillManifest, SkillPlan, AgentProfile } from '../src/spec/skill-spec.js';

describe('Skill Guardrails', () => {
  const validManifest: SkillManifest = {
    id: 'test.skill',
    name: 'Test Skill',
    version: '1.0.0',
    description: 'A test skill',
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

  const validPlan: SkillPlan = {
    skillId: 'test.skill',
    version: '1.0.0',
    input: {},
    toolCalls: [{ tool: 'tool.test.execute', input: {} }],
    reviewRequired: false,
    reviewPolicy: { mode: 'none' },
    executionMode: 'tool_plan',
  };

  const validProfile: AgentProfile = {
    id: 'test-agent',
    name: 'Test Agent',
    role: 'knowledge',
    objectives: ['test'],
    permissions: ['test.read'],
    tools: ['tool.test.execute'],
    escalationRules: [],
    memoryScopes: [],
    reviewPolicy: { mode: 'none', requiresHumanFor: [], reviewerRoles: [] },
  };

  describe('checkSkillsEnabled', () => {
    it('should allow when skills enabled', () => {
      const result = checkSkillsEnabled(true);
      expect(result.allowed).toBe(true);
    });

    it('should block when skills disabled', () => {
      const result = checkSkillsEnabled(false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('skills_disabled');
    });
  });

  describe('checkSkillPermissions', () => {
    it('should allow when all permissions present', () => {
      const result = checkSkillPermissions(validManifest, validProfile);
      expect(result.allowed).toBe(true);
    });

    it('should block when permission missing', () => {
      const profile = { ...validProfile, permissions: [] };
      const result = checkSkillPermissions(validManifest, profile);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('permission_denied');
    });
  });

  describe('checkSkillStatusDisabled', () => {
    it('should block disabled skills', () => {
      const manifest = { ...validManifest, status: 'disabled' };
      const result = checkSkillStatusDisabled(manifest);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('skill_disabled');
    });

    it('should allow non-disabled skills', () => {
      const result = checkSkillStatusDisabled(validManifest);
      expect(result.allowed).toBe(true);
    });
  });

  describe('runSkillGuardrails', () => {
    it('should pass all checks for valid skill', () => {
      const result = runSkillGuardrails(validManifest, validPlan, validProfile, true);
      expect(result.allowed).toBe(true);
    });

    it('should fail when skills disabled', () => {
      const result = runSkillGuardrails(validManifest, validPlan, validProfile, false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('skills_disabled');
    });

    it('should fail when skill is disabled', () => {
      const manifest = { ...validManifest, status: 'disabled' };
      const result = runSkillGuardrails(manifest, validPlan, validProfile, true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('skill_disabled');
    });

    it('should fail when permission missing', () => {
      const profile = { ...validProfile, permissions: [] };
      const result = runSkillGuardrails(validManifest, validPlan, profile, true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('permission_denied');
    });
  });
});

