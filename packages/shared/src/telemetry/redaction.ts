/**
 * PII Redaction Engine
 *
 * Removes or hashes personally identifiable information from telemetry.
 */

export interface RedactionRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

export class RedactionEngine {
  private rules: RedactionRule[] = [
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: '[REDACTED_EMAIL]',
      description: 'Email address',
    },
    {
      pattern: /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
      replacement: '[REDACTED_PHONE]',
      description: 'Phone number',
    },
    {
      pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
      replacement: '[REDACTED_SSN]',
      description: 'SSN',
    },
    {
      pattern: /\b\d{4}[-.]?\d{4}[-.]?\d{4}[-.]?\d{4}\b/g,
      replacement: '[REDACTED_CC]',
      description: 'Credit card',
    },
  ];

  redact(text: string): string {
    let result = text;
    for (const rule of this.rules) {
      result = result.replace(rule.pattern, rule.replacement);
    }
    return result;
  }

  hashIdentifier(identifier: string): string {
    const prefix = identifier.substring(0, 4);
    const suffix = Buffer.from(identifier).toString('base64').substring(0, 8);
    return `id-${prefix}...${suffix}`;
  }

  truncateAndHash(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) {
      return content;
    }
    const truncated = content.substring(0, maxLength);
    const hash = this.hashIdentifier(content).substring(0, 16);
    return `${truncated}...[hash:${hash}]`;
  }
}

export const redaction = new RedactionEngine();
