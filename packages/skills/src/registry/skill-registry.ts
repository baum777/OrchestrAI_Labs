/**
 * Skill Registry
 * 
 * Metadata-first discovery and caching of skill manifests.
 * Similar to ProfileLoader pattern.
 */

import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { SkillManifest, SkillId, SkillVersion } from '../spec/skill-spec.js';
import { assertSkillManifest } from './skill-manifest-validator.js';

const SkillManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(10),
  tags: z.array(z.string()),
  owners: z.array(z.string()).min(1).max(3),
  status: z.enum(['experimental', 'stable', 'deprecated', 'disabled']),
  layer: z.enum(['strategy', 'architecture', 'implementation', 'governance']),
  autonomyTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  requiredPermissions: z.array(z.string()),
  requiredTools: z.array(z.string()),
  dependencies: z.array(z.object({
    skillId: z.string(),
    versionRange: z.string(),
  })).optional(),
  capabilityDomain: z.string().optional(),
  customerDataAccess: z.object({
    enabled: z.boolean(),
    allowedOperations: z.array(z.string()).optional(),
  }).optional(),
  contextRequirements: z.object({
    projectId: z.boolean().optional(),
    clientId: z.boolean().optional(),
    userId: z.boolean().default(true),
  }).optional(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  sideEffects: z.array(z.object({
    type: z.enum(['create', 'update', 'delete', 'read']),
    resource: z.string(),
    scope: z.enum(['project', 'client', 'global']).optional(),
  })),
  reviewPolicy: z.object({
    mode: z.enum(['none', 'draft_only', 'required']),
    requiresHumanFor: z.array(z.string()).optional(),
    reviewerRoles: z.array(z.string()).optional(),
  }),
  resources: z.object({
    instructions: z.string(),
    examples: z.array(z.string()).optional(),
    templates: z.array(z.string()).optional(),
  }),
  telemetry: z.object({
    trackExecution: z.boolean(),
    trackLatency: z.boolean(),
    trackErrors: z.boolean(),
  }),
  governance: z.object({
    generatesWorkstream: z.boolean().optional(),
    requiresDocumentHeader: z.boolean().optional(),
    timestampIntegrity: z.boolean().optional(),
  }).optional(),
});

export type SkillRegistryOptions = {
  skillsDir: string;
};

export class SkillRegistry {
  private manifests = new Map<string, SkillManifest>(); // skillId -> manifest

  constructor(private readonly opts: SkillRegistryOptions) {}

  /**
   * Exports the SkillManifestSchema for use in validators.
   */
  static getManifestSchema() {
    return SkillManifestSchema;
  }

  /**
   * Loads all skill manifests from filesystem.
   * Called at startup (metadata-first discovery).
   */
  loadAll(): SkillManifest[] {
    const dir = this.opts.skillsDir;
    if (!fs.existsSync(dir)) {
      console.warn(`Skills directory does not exist: ${dir}`);
      return [];
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const manifests: SkillManifest[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(dir, entry.name);
      const manifestPath = path.join(skillDir, 'manifest.json');

      if (!fs.existsSync(manifestPath)) {
        console.warn(`Manifest not found for skill: ${entry.name}`);
        continue;
      }

      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const parsed = JSON.parse(raw);
        
        // Strict schema + policy validation
        assertSkillManifest(parsed);
        const validated = parsed as SkillManifest;
        
        this.manifests.set(validated.id, validated);
        manifests.push(validated);
      } catch (error) {
        console.error(`Failed to load skill manifest ${entry.name}:`, error);
      }
    }

    return manifests;
  }

  /**
   * Gets manifest by skill ID and optional version.
   * Returns null if not found.
   */
  getManifest(skillId: SkillId, version?: SkillVersion): SkillManifest | null {
    const manifest = this.manifests.get(skillId);
    if (!manifest) {
      return null;
    }

    if (version && manifest.version !== version) {
      // Version matching (simple exact match for now)
      return null;
    }

    return manifest;
  }

  /**
   * Gets all loaded manifests.
   */
  getAllManifests(): SkillManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Checks if a skill is registered.
   */
  hasSkill(skillId: SkillId): boolean {
    return this.manifests.has(skillId);
  }
}

