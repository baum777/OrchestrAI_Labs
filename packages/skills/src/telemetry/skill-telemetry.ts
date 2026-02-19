/**
 * Skill Telemetry
 * 
 * Generates telemetry data for skill execution.
 */

import crypto from 'node:crypto';
import type { Clock } from '@agent-system/governance-v2/runtime/clock';
import type { SkillId, SkillVersion, SkillTelemetry } from '../spec/skill-spec.js';

export class SkillTelemetryCollector {
  constructor(private readonly clock: Clock) {}

  /**
   * Generates a unique skill run ID.
   */
  generateRunId(): string {
    const timestamp = this.clock.now().getTime();
    const random = crypto.randomUUID().slice(0, 8);
    return `skill_run_${timestamp}_${random}`;
  }

  /**
   * Creates telemetry object for skill execution.
   */
  createTelemetry(
    skillId: SkillId,
    version: SkillVersion,
    executionTimeMs: number,
    toolCallCount: number,
    errorCount: number,
    skillRunId: string
  ): SkillTelemetry {
    return {
      skillId,
      version,
      executionTimeMs,
      toolCallCount,
      errorCount,
      timestamp: this.clock.now().toISOString(),
      skillRunId,
    };
  }
}

