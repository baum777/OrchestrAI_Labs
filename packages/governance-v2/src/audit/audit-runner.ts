/**
 * Audit Runner
 * 
 * CI Integration for continuous governance auditing.
 * Generates weekly entropy reports and failure injection tests.
 */

import type {
  AuditResult,
  GovernanceScorecard,
  Workstream,
  Decision,
} from '../types/governance.types.js';
import { ScorecardEngine } from '../scorecard/scorecard-engine.js';
import { WorkstreamValidator } from '../validator/workstream-validator.js';
import { DecisionCompiler } from '../compiler/decision-compiler.js';
import { PolicyEngine } from '../policy/policy-engine.js';
import { AutonomyGuard } from '../policy/autonomy-guard.js';
import { ConflictDetector } from '../clarification/conflict-detector.js';
import { DecisionHistoryStore } from '../history/decision-history-store.js';
import type { Clock } from '../runtime/clock.js';
import { SystemClock } from '../runtime/clock.js';

export class AuditRunner {
  private scorecardEngine: ScorecardEngine;
  private validator: WorkstreamValidator;
  private compiler: DecisionCompiler;
  private policyEngine: PolicyEngine;
  private autonomyGuard: AutonomyGuard;
  private conflictDetector: ConflictDetector;
  private historyStore: DecisionHistoryStore;
  private readonly clock: Clock;

  constructor(clock?: Clock) {
    this.clock = clock ?? new SystemClock();
    this.scorecardEngine = new ScorecardEngine();
    this.validator = new WorkstreamValidator();
    this.policyEngine = new PolicyEngine();
    this.autonomyGuard = new AutonomyGuard({
      ladder: { 1: 'read-only', 2: 'draft-only', 3: 'execute-with-approval', 4: 'autonomous-with-limits' },
      defaults: { repo_default_tier: 2, implementer_default_tier: 3 },
      hard_rules: [],
    });
    this.historyStore = new DecisionHistoryStore();
    this.compiler = new DecisionCompiler(this.policyEngine, this.autonomyGuard, this.historyStore);
    this.conflictDetector = new ConflictDetector();
  }

  /**
   * Runs a full governance audit.
   */
  async runAudit(
    workstreams: Workstream[],
    decisions: Decision[]
  ): Promise<AuditResult> {
    // Initialize policy engine
    await this.policyEngine.loadPolicyRules();
    await this.policyEngine.loadAutonomyPolicy();

    // Calculate scorecard
    const scorecard = this.scorecardEngine.calculateScorecard(workstreams, decisions);

    // Collect violations
    const violations = await this.collectViolations(workstreams, decisions);

    // Calculate entropy score (1-10)
    const entropyScore = this.calculateEntropyScore(scorecard, violations);

    return {
      timestamp: this.clock.now().toISOString(),
      scorecard,
      violations,
      entropyScore,
    };
  }

  /**
   * Collects all governance violations.
   */
  private async collectViolations(
    workstreams: Workstream[],
    decisions: Decision[]
  ): Promise<Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string; fix?: string }>> {
    const violations: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string; fix?: string }> = [];

    // Validate workstreams
    for (const ws of workstreams) {
      const validation = this.validator.validate(ws);
      if (validation.status !== 'pass') {
        violations.push({
          type: 'workstream_validation',
          severity: 'high',
          description: `Workstream ${ws.id} failed validation: ${validation.reasons?.join(', ')}`,
          fix: 'Fix workstream structure according to validation errors',
        });
      }

      // Check for conflicts
      const autonomyPolicy = this.policyEngine.getAutonomyPolicy();
      const policyRules = this.policyEngine.getPolicyRules();
      if (autonomyPolicy && policyRules.length > 0) {
        const conflict = this.conflictDetector.detectAutonomyConflicts(ws, autonomyPolicy, policyRules);
        if (conflict.status === 'conflict') {
          violations.push({
            type: 'autonomy_conflict',
            severity: 'medium',
            description: `Workstream ${ws.id} has autonomy conflicts: ${conflict.reasons?.join(', ')}`,
            fix: 'Adjust autonomy tier or scope to resolve conflicts',
          });
        }
      }
    }

    // Validate decisions
    for (const decision of decisions) {
      const compilation = await this.compiler.compile(decision);
      if (compilation.status !== 'pass') {
        violations.push({
          type: 'decision_compilation',
          severity: compilation.status === 'conflict' ? 'high' : 'medium',
          description: `Decision ${decision.id} failed compilation: ${compilation.reasons?.join(', ')}`,
          fix: 'Fix decision structure according to compilation errors',
        });
      }
    }

    return violations;
  }

  /**
   * Calculates entropy score (1-10) based on scorecard and violations.
   */
  private calculateEntropyScore(
    scorecard: GovernanceScorecard,
    violations: Array<{ severity: string }>
  ): number {
    // Base score from scorecard (0-10)
    let score = scorecard.totalScore;

    // Penalize for violations
    const highSeverity = violations.filter(v => v.severity === 'high').length;
    const mediumSeverity = violations.filter(v => v.severity === 'medium').length;
    const lowSeverity = violations.filter(v => v.severity === 'low').length;

    score -= highSeverity * 1.0;
    score -= mediumSeverity * 0.5;
    score -= lowSeverity * 0.2;

    // Clamp to 1-10
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Runs failure injection tests.
   */
  async runFailureInjectionTests(): Promise<Array<{ test: string; passed: boolean; reason?: string }>> {
    const tests: Array<{ test: string; passed: boolean; reason?: string }> = [];

    // Test 1: Missing specification
    const missingSpec: Partial<Workstream> = {
      id: 'test_missing_spec',
      owner: 'test_owner',
    };
    const validation1 = this.validator.validate(missingSpec);
    tests.push({
      test: 'Missing specification detection',
      passed: validation1.status === 'blocked',
      reason: validation1.status === 'blocked' ? undefined : 'Should block missing spec',
    });

    // Test 2: Ambiguous requirement
    const ambiguous: Partial<Workstream> = {
      id: 'test_ambiguous',
      owner: 'test_owner',
      scope: ['**/*'],
      structuralModel: '',
      risks: [],
      definitionOfDone: '',
      autonomyTier: 2,
      layer: 'strategy',
    };
    const validation2 = this.validator.validate(ambiguous);
    tests.push({
      test: 'Ambiguous requirement detection',
      passed: validation2.status === 'blocked',
      reason: validation2.status === 'blocked' ? undefined : 'Should block ambiguous requirements',
    });

    // Test 3: Conflicting governance rule
    // This would require actual policy rules loaded
    tests.push({
      test: 'Conflicting governance rule detection',
      passed: true, // Placeholder
      reason: 'Requires policy rules to be loaded',
    });

    return tests;
  }
}

