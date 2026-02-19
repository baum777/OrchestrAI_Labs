/**
 * Skill Loader
 * 
 * Lazy loading of skill instructions and resources.
 * Caches loaded content in-memory.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { SkillId } from '../spec/skill-spec.js';
import type { SkillRegistry } from '../registry/skill-registry.js';

export class SkillLoader {
  private instructionsCache = new Map<string, string>(); // skillId -> instructions content

  constructor(private readonly registry: SkillRegistry, private readonly skillsDir: string) {}

  /**
   * Loads instructions for a skill (lazy, cached).
   * Returns null if not found.
   */
  async loadInstructions(skillId: SkillId): Promise<string | null> {
    // Check cache first
    if (this.instructionsCache.has(skillId)) {
      return this.instructionsCache.get(skillId)!;
    }

    // Get manifest to find instructions path
    const manifest = this.registry.getManifest(skillId);
    if (!manifest) {
      return null;
    }

    // Load instructions file
    const skillDir = path.join(this.skillsDir, skillId);
    const instructionsPath = path.join(skillDir, manifest.resources.instructions);

    if (!fs.existsSync(instructionsPath)) {
      console.warn(`Instructions not found for skill ${skillId}: ${instructionsPath}`);
      return null;
    }

    try {
      const content = await fs.promises.readFile(instructionsPath, 'utf-8');
      this.instructionsCache.set(skillId, content);
      return content;
    } catch (error) {
      console.error(`Failed to load instructions for skill ${skillId}:`, error);
      return null;
    }
  }

  /**
   * Clears the instructions cache (for testing).
   */
  clearCache(): void {
    this.instructionsCache.clear();
  }
}

