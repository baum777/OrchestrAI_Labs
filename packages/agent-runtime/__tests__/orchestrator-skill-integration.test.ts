/**
 * Orchestrator + Skill Integration Test
 * 
 * Tests skill execution path in Orchestrator with feature flag.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Orchestrator } from '../src/orchestrator/orchestrator.js';
import { SkillRegistry, SkillLoader, SkillExecutor } from '@agent-system/skills';
import { WorkstreamValidator } from '@agent-system/governance-v2';
import { FakeClock } from '@agent-system/governance-v2/runtime/clock';
import { ToolRouter } from '../src/execution/tool-router.js';
import type { AgentProfile } from '@shared/types/agent';
import path from 'node:path';

// Mock dependencies
class MockReviewStore {
  async create() {}
  async getApprovedForCommit() {
    return { ok: false, reason: 'Not implemented' };
  }
  async markTokenUsed() {}
}

class MockActionLogger {
  async append() {}
}

class MockProfiles {
  private profiles = new Map<string, AgentProfile>();

  constructor() {
    this.profiles.set('test-agent', {
      id: 'test-agent',
      name: 'Test Agent',
      role: 'governance',
      objectives: ['test'],
      permissions: ['governance.read'],
      tools: [],
      escalationRules: [],
      memoryScopes: [],
      reviewPolicy: { mode: 'none', requiresHumanFor: [], reviewerRoles: [] },
    });
  }

  getById(id: string): AgentProfile {
    const profile = this.profiles.get(id);
    if (!profile) throw new Error(`Profile not found: ${id}`);
    return profile;
  }
}

describe('Orchestrator + Skill Integration', () => {
  let orchestrator: Orchestrator;
  let clock: FakeClock;
  let skillRegistry: SkillRegistry;
  let skillLoader: SkillLoader;
  let skillExecutor: SkillExecutor;
  const skillsDir = path.join(process.cwd(), 'packages/skills/skills');

  beforeEach(() => {
    clock = new FakeClock(new Date('2026-02-18T10:00:00.000Z'));
    
    // Setup skills (only if SKILLS_ENABLED=true)
    const originalEnv = process.env.SKILLS_ENABLED;
    process.env.SKILLS_ENABLED = 'true';
    
    skillRegistry = new SkillRegistry({ skillsDir });
    skillRegistry.loadAll();
    skillLoader = new SkillLoader(skillRegistry, skillsDir);
    const workstreamValidator = new WorkstreamValidator();
    skillExecutor = new SkillExecutor(clock, workstreamValidator);

    const profiles = new MockProfiles();
    const toolRouter = new ToolRouter({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewStore = new MockReviewStore() as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logger = new MockActionLogger() as any;

    orchestrator = new Orchestrator(
      profiles,
      toolRouter,
      reviewStore,
      logger,
      undefined, // governanceValidator
      clock,
      skillRegistry,
      skillExecutor,
      skillLoader
    );

    // Restore env
    if (originalEnv !== undefined) {
      process.env.SKILLS_ENABLED = originalEnv;
    } else {
      delete process.env.SKILLS_ENABLED;
    }
  });

  it('should execute skill when SKILLS_ENABLED=true', async () => {
    process.env.SKILLS_ENABLED = 'true';

    const result = await orchestrator.run(
      { userId: 'user-1' },
      {
        agentId: 'test-agent',
        userMessage: 'Validate workstream',
        skillRequest: {
          skillId: 'governance.workstream_validate',
          input: {
            workstream: {
              owner: '@test',
              scope: ['packages/test/**'],
              structuralModel: 'test',
              risks: [],
              layer: 'implementation',
              autonomyTier: 2,
              definitionOfDone: 'test',
            },
          },
        },
      }
    );

    expect(result.status).toBe('ok');
    expect(result.data).toBeDefined();
  });

  it('should block skill execution when SKILLS_ENABLED=false', async () => {
    process.env.SKILLS_ENABLED = 'false';

    const result = await orchestrator.run(
      { userId: 'user-1' },
      {
        agentId: 'test-agent',
        userMessage: 'Validate workstream',
        skillRequest: {
          skillId: 'governance.workstream_validate',
          input: {
            workstream: {
              owner: '@test',
              scope: ['packages/test/**'],
              structuralModel: 'test',
              risks: [],
              layer: 'implementation',
              autonomyTier: 2,
              definitionOfDone: 'test',
            },
          },
        },
      }
    );

    expect(result.status).toBe('blocked');
    expect(result.data).toHaveProperty('reason', 'SKILLS_DISABLED');
  });

  it('should block skill execution when skill not found', async () => {
    process.env.SKILLS_ENABLED = 'true';

    const result = await orchestrator.run(
      { userId: 'user-1' },
      {
        agentId: 'test-agent',
        userMessage: 'Execute skill',
        skillRequest: {
          skillId: 'nonexistent.skill',
          input: {},
        },
      }
    );

    expect(result.status).toBe('blocked');
    expect(result.data).toHaveProperty('reason', 'SKILL_NOT_FOUND');
  });
});

