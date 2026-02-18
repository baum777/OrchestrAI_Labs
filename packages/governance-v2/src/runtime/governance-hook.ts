/**
 * Governance Hook
 * 
 * Runtime enforcement hook for orchestrator integration.
 * Validates workstreams before execution and blocks on violations.
 */

import type {
  Workstream,
  ClarificationRequest,
} from '../types/governance.types.js';
import { WorkstreamValidator } from '../validator/workstream-validator.js';
import { AmbiguityDetector } from '../clarification/ambiguity-detector.js';
import { DocumentHeaderValidator } from '../validator/document-header-validator.js';
import type { Clock } from './clock.js';
import { SystemClock } from './clock.js';

export interface GovernanceHookResult {
  status: 'pass' | 'blocked' | 'conflict' | 'clarification_required';
  reason?: string;
  reasons?: string[];
  requiresReview?: boolean;
  clarificationRequest?: ClarificationRequest;
}

export class GovernanceHook {
  private validator: WorkstreamValidator;
  private ambiguityDetector: AmbiguityDetector;
  private documentValidator: DocumentHeaderValidator;
  private enabled: boolean;
  private readonly clock: Clock;

  constructor(enabled: boolean = true, clock?: Clock) {
    this.clock = clock ?? new SystemClock();
    this.validator = new WorkstreamValidator();
    this.ambiguityDetector = new AmbiguityDetector(this.clock);
    this.documentValidator = new DocumentHeaderValidator(this.clock);
    // Check environment variable for feature flag
    this.enabled = enabled && (process.env.GOVERNANCE_V2_ENFORCE !== '0');
  }

  /**
   * Validates a governance document (Markdown file) for required header fields.
   */
  async validateDocument(filePath: string): Promise<GovernanceHookResult> {
    if (!this.enabled) {
      return { status: 'pass' };
    }

    const validation = this.documentValidator.validateDocument(filePath);

    if (validation.status === 'blocked') {
      return {
        status: 'blocked',
        reason: 'Document header validation failed',
        reasons: validation.reasons,
        requiresReview: validation.requiresReview,
      };
    }

    return { status: 'pass' };
  }

  /**
   * Validates document content string.
   */
  async validateDocumentContent(content: string): Promise<GovernanceHookResult> {
    if (!this.enabled) {
      return { status: 'pass' };
    }

    const validation = this.documentValidator.validateContent(content);

    if (validation.status === 'blocked') {
      return {
        status: 'blocked',
        reason: 'Document header validation failed',
        reasons: validation.reasons,
        requiresReview: validation.requiresReview,
      };
    }

    return { status: 'pass' };
  }

  /**
   * Validates a workstream before execution.
   * Returns blocked status if any critical violation is found.
   */
  async validateWorkstream(workstream: Partial<Workstream>): Promise<GovernanceHookResult> {
    if (!this.enabled) {
      return { status: 'pass' };
    }

    // Validate workstream
    const validation = this.validator.validate(workstream);
    
    if (validation.status === 'blocked') {
      return {
        status: 'blocked',
        reason: 'Workstream validation failed',
        reasons: validation.reasons,
        requiresReview: validation.requiresReview,
      };
    }

    if (validation.status === 'conflict') {
      return {
        status: 'conflict',
        reason: 'Workstream has conflicts',
        reasons: validation.reasons,
        requiresReview: true,
      };
    }

    // Check for ambiguities
    const clarification = this.ambiguityDetector.detectWorkstreamAmbiguities(workstream);
    if (clarification) {
      return {
        status: 'clarification_required',
        reason: 'Workstream requires clarification',
        clarificationRequest: clarification,
        requiresReview: true,
      };
    }

    return { status: 'pass' };
  }

  /**
   * Checks if governance enforcement is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

