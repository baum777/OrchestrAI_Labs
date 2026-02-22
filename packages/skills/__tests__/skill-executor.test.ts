/**
 * Skill Executor Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SkillExecutor } from '../src/executor/skill-executor.js';
import { SkillRegistry } from '../src/registry/skill-registry.js';
import { SkillLoader } from '../src/loader/skill-loader.js';
import { FakeClock } from '@agent-system/governance-v2/runtime/clock';
import { WorkstreamValidator } from '@agent-system/governance-v2';
import type { AgentProfile } from '@shared/types/agent';
import path from 'node:path';

describe('SkillExecutor', () => {
  let executor: SkillExecutor;
  let clock: FakeClock;
  let registry: SkillRegistry;
  let loader: SkillLoader;
  const skillsDir = path.join(process.cwd(), 'packages/skills/skills');

  beforeEach(() => {
    clock = new FakeClock();
    clock.set(clock.parseISO('2026-02-18T10:00:00.000Z'));
    const workstreamValidator = new WorkstreamValidator();
    executor = new SkillExecutor(clock, workstreamValidator);
    registry = new SkillRegistry({ skillsDir });
    registry.loadAll();
    loader = new SkillLoader(registry, skillsDir);
  });

  it('should compile skill plan for governance.workstream_validate', async () => {
    const manifest = registry.getManifest('governance.workstream_validate');
    expect(manifest).toBeDefined();

    const instructions = await loader.loadInstructions('governance.workstream_validate');
    expect(instructions).toBeTruthy();

    const input = {
      workstream: {
        owner: '@test',
        scope: ['packages/test/**'],
        structuralModel: 'test',
        risks: [],
        layer: 'implementation',
        autonomyTier: 2,
        definitionOfDone: 'test',
      },
    };

    const context = {
      skillId: 'governance.workstream_validate',
      skillVersion: '1.0.0',
      agentProfile: {} as AgentProfile,
      toolContext: { userId: 'user-1' },
      clock,
      input,
    };

    const plan = await executor.compile(manifest!, instructions!, input, context);

    expect(plan.skillId).toBe('governance.workstream_validate');
    expect(plan.executionMode).toBe('direct');
    expect(plan.toolCalls).toEqual([]);
    expect(plan.reviewRequired).toBe(false);
  });

  it('should validate input schema', async () => {
    const manifest = registry.getManifest('governance.workstream_validate');
    const instructions = await loader.loadInstructions('governance.workstream_validate');

    const invalidInput = {
      // Missing required 'workstream' field
    };

    const context = {
      skillId: 'governance.workstream_validate',
      skillVersion: '1.0.0',
      agentProfile: {} as AgentProfile,
      toolContext: { userId: 'user-1' },
      clock,
      input: invalidInput,
    };

    await expect(
      executor.compile(manifest!, instructions!, invalidInput, context)
    ).rejects.toThrow();
  });

  it('should execute skill in direct mode', async () => {
    const manifest = registry.getManifest('governance.workstream_validate');
    const instructions = await loader.loadInstructions('governance.workstream_validate');

    const input = {
      workstream: {
        owner: '@test',
        scope: ['packages/test/**'],
        structuralModel: 'test',
        risks: [],
        layer: 'implementation',
        autonomyTier: 2,
        definitionOfDone: 'test',
      },
    };

    const context = {
      skillId: 'governance.workstream_validate',
      skillVersion: '1.0.0',
      agentProfile: {} as AgentProfile,
      toolContext: { userId: 'user-1' },
      clock,
      input,
    };

    const plan = await executor.compile(manifest!, instructions!, input, context);
    const result = await executor.execute(plan, context);

    expect(result.ok).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.telemetry).toBeDefined();
    expect(result.telemetry?.skillRunId).toBeTruthy();
    expect(result.telemetry?.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should return error for invalid workstream', async () => {
    const manifest = registry.getManifest('governance.workstream_validate');
    const instructions = await loader.loadInstructions('governance.workstream_validate');

    const input = {
      workstream: {
        // Missing required fields
        owner: '',
        scope: [],
      },
    };

    const context = {
      skillId: 'governance.workstream_validate',
      skillVersion: '1.0.0',
      agentProfile: {} as AgentProfile,
      toolContext: { userId: 'user-1' },
      clock,
      input,
    };

    const plan = await executor.compile(manifest!, instructions!, input, context);
    const result = await executor.execute(plan, context);

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.telemetry).toBeDefined();
  });
});

