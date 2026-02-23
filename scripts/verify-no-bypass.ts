#!/usr/bin/env ts-node
/**
 * Governance Bypass Scanner
 *
 * Scans codebase for governance bypass markers and fails build if found.
 * These markers indicate attempts to skip validation or enforcement.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Patterns that indicate governance bypass attempts
const BYPASS_PATTERNS = [
  // Comments attempting to skip validation
  /\/\/\s*@ts-ignore-governance/i,
  /\/\/\s*skip-validation/i,
  /\/\/\s*governance-bypass/i,
  /\/\/\s*ignore\s+governance/i,
  /\/\*\s*governance-ignore\s*\*\//i,

  // Code patterns that disable enforcement
  /ENFORCEMENT_STRICT\s*=\s*["']?0["']?/i,
  /process\.env\.ENFORCEMENT_STRICT\s*=\s*["']?0["']?/i,

  // Dangerous eval/exec that could bypass checks
  /eval\s*\([^)]*(?:governance|policy|enforce)/i,

  // Mocking of governance functions in non-test files
  /jest\.mock\s*\([^)]*(?:policy-engine|governance)/i,
];

// File patterns to scan (exclude node_modules, dist, tests)
const INCLUDE_PATTERNS = ['.ts', '.js', '.yaml', '.yml', '.json'];
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'coverage',
  '.git',
  '__tests__',
  '*.test.ts',
  '*.spec.ts',
  'verify-no-bypass.ts', // Self-exclusion
];

interface BypassFinding {
  file: string;
  line: number;
  pattern: string;
  context: string;
}

function shouldScanFile(filePath: string): boolean {
  // Check exclusions
  for (const exclude of EXCLUDE_PATTERNS) {
    if (filePath.includes(exclude)) return false;
  }

  // Check inclusions
  for (const include of INCLUDE_PATTERNS) {
    if (filePath.endsWith(include)) return true;
  }

  return false;
}

function scanFile(filePath: string): BypassFinding[] {
  const findings: BypassFinding[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of BYPASS_PATTERNS) {
        if (pattern.test(line)) {
          findings.push({
            file: filePath,
            line: i + 1,
            pattern: pattern.toString(),
            context: line.trim().substring(0, 100),
          });
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }

  return findings;
}

function getFilesToScan(): string[] {
  try {
    const result = execSync('git ls-files', { encoding: 'utf-8', cwd: process.cwd() });
    return result.trim().split('\n').filter(shouldScanFile);
  } catch (error) {
    console.error('Failed to get file list from git');
    process.exit(1);
  }
}

function main(): void {
  console.log('[GOVERNANCE] Scanning for bypass markers...\n');

  const files = getFilesToScan();
  const allFindings: BypassFinding[] = [];

  for (const file of files) {
    const findings = scanFile(file);
    allFindings.push(...findings);
  }

  if (allFindings.length === 0) {
    console.log('✅ No governance bypass markers found.');
    process.exit(0);
  }

  console.error(`❌ Found ${allFindings.length} potential governance bypass marker(s):\n`);

  for (const finding of allFindings) {
    console.error(`  File: ${finding.file}:${finding.line}`);
    console.error(`  Pattern: ${finding.pattern}`);
    console.error(`  Context: ${finding.context}`);
    console.error('');
  }

  console.error('[GOVERNANCE] Remove these markers or add explicit approval from @teamlead_orchestrator');
  process.exit(1);
}

main();
