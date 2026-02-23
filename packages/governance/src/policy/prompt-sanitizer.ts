import { Injectable, Logger } from '@nestjs/common';
import { FORBIDDEN_PATTERNS, HIGH_RISK_THRESHOLD, ForbiddenPattern } from './forbidden-patterns';

export interface SanitizationResult {
  original: string;
  sanitized: string;
  riskScore: number;
  blocked: boolean;
  reasons: string[];
  truncatedPreview: string;
}

@Injectable()
export class PromptSanitizer {
  private readonly logger = new Logger(PromptSanitizer.name);
  private patterns: ForbiddenPattern[] = FORBIDDEN_PATTERNS;

  /**
   * Sanitize and score input prompt
   */
  sanitize(input: string): SanitizationResult {
    let riskScore = 0;
    const reasons: string[] = [];
    let sanitized = input;

    for (const pattern of this.patterns) {
      if (pattern.pattern.test(input)) {
        riskScore = Math.max(riskScore, pattern.riskScore);
        reasons.push(`${pattern.id}: ${pattern.description}`);

        // Remove or escape the pattern
        sanitized = sanitized.replace(pattern.pattern, '[FILTERED]');

        this.logger.warn(`Pattern match: ${pattern.id} (risk: ${pattern.riskScore})`);
      }
    }

    // Block if high risk
    const blocked = riskScore >= HIGH_RISK_THRESHOLD;

    return {
      original: input,
      sanitized: blocked ? '' : sanitized,
      riskScore,
      blocked,
      reasons,
      truncatedPreview: this.truncate(input, 100),
    };
  }

  /**
   * Quick check if input is safe
   */
  isInputSafe(input: string): boolean {
    for (const pattern of this.patterns) {
      if (pattern.riskScore >= HIGH_RISK_THRESHOLD && pattern.pattern.test(input)) {
        return false;
      }
    }
    return true;
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
  }
}
