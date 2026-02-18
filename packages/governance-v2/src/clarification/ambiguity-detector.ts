/**
 * Ambiguity Detector
 * 
 * Detects ambiguous requirements and generates targeted clarification questions.
 */

import type {
  Workstream,
  Decision,
  ClarificationRequest,
} from '../types/governance.types.js';

export class AmbiguityDetector {
  /**
   * Detects ambiguities in a workstream and generates clarification questions.
   */
  detectWorkstreamAmbiguities(workstream: Partial<Workstream>): ClarificationRequest | null {
    const questions: string[] = [];

    // Check for missing required fields
    if (!workstream.scope || workstream.scope.length === 0) {
      questions.push('What is the exact scope of this workstream? Which files/paths will be modified?');
    }

    if (!workstream.structuralModel || workstream.structuralModel.trim() === '') {
      questions.push('What is the structural model for this workstream? How will the changes be organized?');
    }

    if (!workstream.definitionOfDone || workstream.definitionOfDone.trim() === '') {
      questions.push('What is the Definition of Done for this workstream? What criteria must be met?');
    }

    // Check for ambiguous scope
    if (workstream.scope && workstream.scope.some(s => s.includes('**') || s.includes('*'))) {
      questions.push('Scope contains wildcards. Can you specify exact paths to avoid unintended changes?');
    }

    // Check for missing risk assessment
    if (!workstream.risks || workstream.risks.length === 0) {
      questions.push('No risks identified. Are there any potential risks or blockers for this workstream?');
    }

    if (questions.length === 0) {
      return null;
    }

    return {
      id: `clar_${Date.now()}`,
      workstreamId: workstream.id,
      questions,
      context: {
        workstream: workstream.id,
        owner: workstream.owner,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detects ambiguities in a decision and generates clarification questions.
   */
  detectDecisionAmbiguities(decision: Partial<Decision>): ClarificationRequest | null {
    const questions: string[] = [];

    if (!decision.rationale || decision.rationale.trim() === '') {
      questions.push('What is the rationale for this decision? Why was this approach chosen?');
    }

    if (!decision.alternatives || decision.alternatives.length === 0) {
      questions.push('What alternatives were considered? Why were they rejected?');
    }

    if (!decision.implications || decision.implications.trim() === '') {
      questions.push('What are the implications of this decision? What will change as a result?');
    }

    if (!decision.layer) {
      questions.push('Which layer does this decision belong to? (strategy, architecture, implementation, governance)');
    }

    if (questions.length === 0) {
      return null;
    }

    return {
      id: `clar_${Date.now()}`,
      decisionId: decision.id,
      questions,
      context: {
        decision: decision.id,
        owner: decision.owner,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

