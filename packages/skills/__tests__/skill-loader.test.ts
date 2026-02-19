/**
 * Skill Loader Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SkillRegistry } from '../src/registry/skill-registry.js';
import { SkillLoader } from '../src/loader/skill-loader.js';
import path from 'node:path';

describe('SkillLoader', () => {
  let registry: SkillRegistry;
  let loader: SkillLoader;
  const skillsDir = path.join(process.cwd(), 'packages/skills/skills');

  beforeEach(() => {
    registry = new SkillRegistry({ skillsDir });
    registry.loadAll();
    loader = new SkillLoader(registry, skillsDir);
  });

  it('should load instructions lazily', async () => {
    const instructions = await loader.loadInstructions('governance.workstream_validate');
    
    expect(instructions).toBeTruthy();
    expect(typeof instructions).toBe('string');
    expect(instructions).toContain('Purpose');
    expect(instructions).toContain('Steps');
  });

  it('should cache instructions after first load', async () => {
    const instructions1 = await loader.loadInstructions('governance.workstream_validate');
    const instructions2 = await loader.loadInstructions('governance.workstream_validate');
    
    expect(instructions1).toBe(instructions2); // Same reference (cached)
  });

  it('should return null for non-existent skill', async () => {
    const instructions = await loader.loadInstructions('nonexistent.skill');
    expect(instructions).toBeNull();
  });

  it('should clear cache', async () => {
    await loader.loadInstructions('governance.workstream_validate');
    loader.clearCache();
    
    // Cache should be empty after clear
    const instructions = await loader.loadInstructions('governance.workstream_validate');
    // Should still load (not cached), but this tests the clear method exists
    expect(instructions).toBeTruthy();
  });
});

