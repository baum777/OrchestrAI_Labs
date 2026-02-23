/**
 * Forbidden Pattern Library
 *
 * Defines patterns for prompt injection detection.
 */

export interface ForbiddenPattern {
  id: string;
  pattern: RegExp;
  category: 'injection' | 'jailbreak' | 'leakage' | 'obfuscation';
  riskScore: number; // 0-100
  description: string;
}

export const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  // Injection patterns
  {
    id: 'ignore_prev',
    pattern: /ignore\s+(previous|above|all|the)\s+(instructions?|prompts?|system|rules?)/i,
    category: 'injection',
    riskScore: 90,
    description: 'Attempt to override previous instructions',
  },
  {
    id: 'forget_all',
    pattern: /forget\s+(everything|all|your|previous|the\s+above)/i,
    category: 'injection',
    riskScore: 85,
    description: 'Attempt to make system forget context',
  },
  {
    id: 'system_leak',
    pattern: /(show|display|reveal|print|output)\s+(your|the|system|my)\s+(prompt|instructions?|context|system\s+message)/i,
    category: 'leakage',
    riskScore: 95,
    description: 'Attempt to extract system prompt',
  },
  {
    id: 'jailbreak_dan',
    pattern: /DAN|Do\s*Anything\s*Now/i,
    category: 'jailbreak',
    riskScore: 80,
    description: 'Known jailbreak persona',
  },
  {
    id: 'role_play_admin',
    pattern: /(pretend|act\s+as|simulate|you\s+are\s+now)\s+(an?\s+)?(admin|administrator|root|superuser)/i,
    category: 'jailbreak',
    riskScore: 75,
    description: 'Attempt to assume admin role',
  },
  {
    id: 'delimiter_break',
    pattern: /```\s*\n?(system|assistant|user)\s*\n/i,
    category: 'injection',
    riskScore: 70,
    description: 'Delimiter injection attempt',
  },
  {
    id: 'base64_obfuscation',
    pattern: /decode\s+(this|the\s+following|base64)/i,
    category: 'obfuscation',
    riskScore: 60,
    description: 'Potential base64 obfuscation',
  },
  {
    id: 'unicode_escape',
    pattern: /\\u[0-9a-fA-F]{4}/g,
    category: 'obfuscation',
    riskScore: 40,
    description: 'Unicode escape sequences',
  },
  {
    id: 'prompt_leakage_req',
    pattern: /(what\s+is|what\s+are|describe)\s+(your|the)\s+(instructions?|directive|programming)/i,
    category: 'leakage',
    riskScore: 70,
    description: 'Attempt to query system instructions',
  },
  {
    id: 'new_prompt_injection',
    pattern: /(from\s+now\s+on|starting\s+(now|today)|new\s+instruction)/i,
    category: 'injection',
    riskScore: 65,
    description: 'New instruction injection',
  },
];

export const HIGH_RISK_THRESHOLD = 75;
export const MEDIUM_RISK_THRESHOLD = 50;
