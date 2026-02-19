/**
 * Skill Executor
 * 
 * Compiles and executes skills deterministically.
 * Supports two modes:
 * - "direct": Maps to internal handler (e.g., WorkstreamValidator)
 * - "tool_plan": Compiles to fixed tool call sequence
 */

import { z } from 'zod';
import type { Clock } from '@agent-system/governance-v2/runtime/clock';
import type { ToolRouter, ToolCall, ToolResult } from '@agent-runtime/execution/tool-router';
import type { WorkstreamValidator, ValidationResult } from '@agent-system/governance-v2';
import type {
  SkillManifest,
  SkillPlan,
  SkillExecutionResult,
  SkillExecutionContext,
} from '../spec/skill-spec.js';
import { SkillTelemetryCollector } from '../telemetry/skill-telemetry.js';

export class SkillExecutor {
  private readonly telemetryCollector: SkillTelemetryCollector;
  private readonly workstreamValidator?: WorkstreamValidator;

  constructor(clock: Clock, workstreamValidator?: WorkstreamValidator) {
    this.telemetryCollector = new SkillTelemetryCollector(clock);
    this.workstreamValidator = workstreamValidator;
  }

  /**
   * Compiles a skill into a deterministic plan.
   * For pilot skill (governance.workstream_validate), uses "direct" mode.
   */
  async compile(
    manifest: SkillManifest,
    instructions: string,
    input: unknown,
    context: SkillExecutionContext
  ): Promise<SkillPlan> {
    // Validate input against schema
    // For pilot skill, use hardcoded Zod schema (JSON Schema conversion would require ajv)
    let validatedInput: unknown;
    if (manifest.id === 'governance.workstream_validate') {
      const workstreamSchema = z.object({
        workstream: z.object({
          owner: z.string().min(1),
          scope: z.array(z.string()).min(1),
          structuralModel: z.string().min(1),
          risks: z.array(z.any()),
          layer: z.enum(['strategy', 'architecture', 'implementation', 'governance']),
          autonomyTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
          definitionOfDone: z.string().min(1),
        }),
      });
      validatedInput = workstreamSchema.parse(input);
    } else {
      // For other skills, basic validation (can be enhanced with JSON Schema validator later)
      validatedInput = input;
    }

    // For pilot skill, use "direct" mode (maps to WorkstreamValidator)
    if (manifest.id === 'governance.workstream_validate') {
      return {
        skillId: manifest.id,
        version: manifest.version,
        input: validatedInput,
        toolCalls: [], // No tool calls for direct mode
        reviewRequired: manifest.reviewPolicy.mode === 'required',
        reviewPolicy: manifest.reviewPolicy,
        executionMode: 'direct',
      };
    }

    // For future skills with tool_plan mode, parse instructions to extract tool calls
    // For now, return empty tool calls
    return {
      skillId: manifest.id,
      version: manifest.version,
      input: validatedInput,
      toolCalls: [],
      reviewRequired: manifest.reviewPolicy.mode === 'required',
      reviewPolicy: manifest.reviewPolicy,
      executionMode: 'tool_plan',
    };
  }

  /**
   * Executes a skill plan.
   */
  async execute(
    plan: SkillPlan,
    context: SkillExecutionContext,
    toolRouter?: ToolRouter
  ): Promise<SkillExecutionResult> {
    const startTime = context.clock.now().getTime();
    const skillRunId = this.telemetryCollector.generateRunId();
    let toolCallCount = 0;
    let errorCount = 0;

    try {
      // Direct mode: call internal handler
      if (plan.executionMode === 'direct') {
        if (plan.skillId === 'governance.workstream_validate') {
          if (!this.workstreamValidator) {
            return {
              ok: false,
              error: 'WorkstreamValidator not available',
            };
          }

          const input = plan.input as { workstream: unknown };
          const result: ValidationResult = this.workstreamValidator.validate(input.workstream as any);

          const executionTimeMs = context.clock.now().getTime() - startTime;
          const telemetry = this.telemetryCollector.createTelemetry(
            plan.skillId,
            plan.version,
            executionTimeMs,
            toolCallCount,
            errorCount,
            skillRunId
          );

          return {
            ok: result.status === 'pass',
            output: result,
            error: result.status !== 'pass' ? (result.reasons?.join('; ') || 'Validation failed') : undefined,
            toolCalls: [],
            telemetry,
          };
        }
      }

      // Tool plan mode: execute tool calls via ToolRouter
      if (plan.executionMode === 'tool_plan' && toolRouter) {
        const results: ToolResult[] = [];
        for (const toolCall of plan.toolCalls) {
          const result = await toolRouter.execute(
            context.agentProfile,
            context.toolContext,
            toolCall
          );
          results.push(result);
          toolCallCount++;

          if (!result.ok) {
            errorCount++;
            break; // Stop on first error
          }
        }

        const executionTimeMs = context.clock.now().getTime() - startTime;
        const telemetry = this.telemetryCollector.createTelemetry(
          plan.skillId,
          plan.version,
          executionTimeMs,
          toolCallCount,
          errorCount,
          skillRunId
        );

        return {
          ok: results.every(r => r.ok),
          output: results.map(r => r.output),
          error: results.find(r => !r.ok)?.error,
          toolCalls: plan.toolCalls,
          telemetry,
        };
      }

      return {
        ok: false,
        error: 'Unsupported execution mode or missing ToolRouter',
      };
    } catch (error) {
      errorCount++;
      const executionTimeMs = context.clock.now().getTime() - startTime;
      const telemetry = this.telemetryCollector.createTelemetry(
        plan.skillId,
        plan.version,
        executionTimeMs,
        toolCallCount,
        errorCount,
        skillRunId
      );

      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        toolCalls: plan.toolCalls,
        telemetry,
      };
    }
  }
}

