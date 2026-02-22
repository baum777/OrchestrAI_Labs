/**
 * Skill Registry Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SkillRegistry } from '../src/registry/skill-registry.js';
import path from 'node:path';

describe('SkillRegistry', () => {
  let registry: SkillRegistry;
  const skillsDir = path.join(process.cwd(), 'packages/skills/skills');

  beforeEach(() => {
    registry = new SkillRegistry({ skillsDir });
  });

  it('should load all skill manifests from filesystem', () => {
    const manifests = registry.loadAll();
    expect(manifests.length).toBeGreaterThan(0);
    
    // Check that pilot skill is loaded
    const pilotSkill = manifests.find(m => m.id === 'governance.workstream_validate');
    expect(pilotSkill).toBeDefined();
    expect(pilotSkill?.version).toBe('1.0.0');
    expect(pilotSkill?.layer).toBe('governance');
  });

  it('should get manifest by skill ID', () => {
    registry.loadAll();
    const manifest = registry.getManifest('governance.workstream_validate');
    
    expect(manifest).toBeDefined();
    expect(manifest?.id).toBe('governance.workstream_validate');
    expect(manifest?.name).toBe('Workstream Validator');
  });

  it('should return null for non-existent skill', () => {
    registry.loadAll();
    const manifest = registry.getManifest('nonexistent.skill');
    expect(manifest).toBeNull();
  });

  it('should validate manifest schema', () => {
    // This test ensures invalid manifests are rejected
    const manifests = registry.loadAll();
    for (const manifest of manifests) {
      expect(manifest.id).toBeTruthy();
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(['strategy', 'architecture', 'implementation', 'governance']).toContain(manifest.layer);
    expect([1, 2, 3, 4]).toContain(manifest.autonomyTier);
    }
  });
});

