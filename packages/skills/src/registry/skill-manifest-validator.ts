/**
 * Skill Manifest Validator
 * 
 * Enforces strict schema validation and policy constraints for skill manifests.
 * Called during discovery to fail fast on invalid manifests.
 */

import type { SkillManifest, SkillStatus } from '../spec/skill-spec.js';
import { SkillRegistry } from './skill-registry.js';

export interface ManifestValidationError {
  field: string;
  reason: string;
}

/**
 * Validates a skill manifest against schema and policy constraints.
 * Throws if validation fails.
 */
export function assertSkillManifest(manifest: unknown): asserts manifest is SkillManifest {
  // Schema validation (strict)
  try {
    const schema = SkillRegistry.getManifestSchema();
    schema.parse(manifest);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Manifest schema validation failed: ${error.message}`);
    }
    throw new Error('Manifest schema validation failed: unknown error');
  }

  const m = manifest as SkillManifest;

  // Policy constraints
  const errors: ManifestValidationError[] = [];

  // Owners: min 1, max 3 (already enforced by schema, but double-check)
  if (m.owners.length === 0) {
    errors.push({ field: 'owners', reason: 'At least one owner is required' });
  }
  if (m.owners.length > 3) {
    errors.push({ field: 'owners', reason: 'Maximum 3 owners allowed' });
  }

  // Version: semver required (already enforced by schema regex)
  // No additional checks needed

  // Status: required (already enforced by schema)
  // No additional checks needed

  // Side effects: if not 'none', review must be required or draft_only
  const hasWriteSideEffects = m.sideEffects.some(
    se => se.type === 'create' || se.type === 'update' || se.type === 'delete'
  );
  if (hasWriteSideEffects && m.reviewPolicy.mode === 'none') {
    errors.push({
      field: 'reviewPolicy',
      reason: 'Skills with write side effects (create/update/delete) must have reviewPolicy.mode !== "none"',
    });
  }

  if (errors.length > 0) {
    const errorMessages = errors.map(e => `${e.field}: ${e.reason}`).join('; ');
    throw new Error(`Manifest policy validation failed: ${errorMessages}`);
  }
}


