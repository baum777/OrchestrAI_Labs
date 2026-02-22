/**
 * Skill Guardrails v1
 * 
 * Runtime enforcement of skill execution constraints.
 * Prevents ToolRouter/Review/Policy/Clock bypass and enforces manifest contracts.
 */

import type { AgentProfile, Permission } from "@agent-system/shared";
import type { SkillManifest, SkillPlan } from '../spec/skill-spec.js';

export interface GuardrailCheckResult {
  allowed: boolean;
  reason?: string;
  blockReason?: string;
}

/**
 * Checks if skills are enabled via feature flag.
 */
export function checkSkillsEnabled(skillsEnabled: boolean): GuardrailCheckResult {
  if (!skillsEnabled) {
    return {
      allowed: false,
      reason: 'skills_disabled',
      blockReason: 'Skills feature is disabled (SKILLS_ENABLED=false)',
    };
  }
  return { allowed: true };
}

/**
 * Checks if agent profile has all required permissions.
 */
export function checkSkillPermissions(
  manifest: SkillManifest,
  profile: AgentProfile
): GuardrailCheckResult {
  const missingPermissions = manifest.requiredPermissions.filter(
    (perm: string) => !profile.permissions.includes(perm as Permission)
  );
  if (missingPermissions.length > 0) {
    return {
      allowed: false,
      reason: 'permission_denied',
      blockReason: `Missing required permissions: ${missingPermissions.join(', ')}`,
    };
  }
  return { allowed: true };
}

/**
 * Checks if skill status is disabled (blocks execution).
 */
export function checkSkillStatusDisabled(manifest: SkillManifest): GuardrailCheckResult {
  if (manifest.status === 'disabled') {
    return {
      allowed: false,
      reason: 'skill_disabled',
      blockReason: 'Skill is disabled',
    };
  }
  return { allowed: true };
}

/**
 * Checks if side effects require review gate.
 */
export function checkSideEffectsReviewGate(
  manifest: SkillManifest,
  _plan: SkillPlan
): GuardrailCheckResult {
  const hasWriteSideEffects = manifest.sideEffects.some(
    se => se.type === 'create' || se.type === 'update' || se.type === 'delete'
  );
  
  if (hasWriteSideEffects) {
    // Review must be required or draft_only (enforced at manifest validation, but double-check)
    if (manifest.reviewPolicy.mode === 'none') {
      return {
        allowed: false,
        reason: 'review_required_for_side_effects',
        blockReason: 'Skills with write side effects must have reviewPolicy.mode !== "none"',
      };
    }
    // Review gate will be enforced by Orchestrator's existing review flow
  }
  return { allowed: true };
}


/**
 * Runs all guardrail checks before skill execution.
 * 
 * Guardrails v1 (minimal set):
 * 1. Feature flag check
 * 2. Status=disabled blocks execution
 * 3. Permission intersection enforcement
 * 4. Side effects trigger review gate
 * 5. Manifest schema strictness (enforced at discovery)
 * 6. ToolRouter-bound execution (architectural guarantee)
 * 7. Audit log enrichment (handled in Orchestrator)
 */
export function runSkillGuardrails(
  manifest: SkillManifest,
  plan: SkillPlan,
  profile: AgentProfile,
  skillsEnabled: boolean
): GuardrailCheckResult {
  // Check 1: Feature flag
  const flagCheck = checkSkillsEnabled(skillsEnabled);
  if (!flagCheck.allowed) return flagCheck;

  // Check 2: Status=disabled blocks execution
  const statusCheck = checkSkillStatusDisabled(manifest);
  if (!statusCheck.allowed) return statusCheck;

  // Check 3: Permission intersection enforcement
  const permCheck = checkSkillPermissions(manifest, profile);
  if (!permCheck.allowed) return permCheck;

  // Check 4: Side effects trigger review gate (validation only, enforcement happens in Orchestrator)
  const sideEffectsCheck = checkSideEffectsReviewGate(manifest, plan);
  if (!sideEffectsCheck.allowed) return sideEffectsCheck;

  // Note: Manifest schema strictness is enforced at discovery time via assertSkillManifest()
  // Note: ToolRouter-bound execution is guaranteed architecturally (all tools go through ToolRouter.execute())
  // Note: Audit log enrichment is handled in Orchestrator (skillId/version/runId/status/durationMs)

  return { allowed: true };
}

