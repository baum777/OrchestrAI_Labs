/**
 * Timestamp Integrity Validator Script
 * 
 * Validates and self-heals timestamp inconsistencies in documentation headers.
 * Scans all markdown files in docs/ and ops/ for timestamp integrity violations.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { DocumentHeaderValidator } from '../packages/governance-v2/src/validator/document-header-validator.js';
import { SystemClock } from '../packages/governance-v2/src/runtime/clock.js';

interface ValidationResult {
  file: string;
  valid: boolean;
  reasons: string[];
  healed: boolean;
}

function findMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and .git
      if (file !== 'node_modules' && file !== '.git' && !file.startsWith('.')) {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function validateAndHeal(filePath: string, validator: DocumentHeaderValidator): ValidationResult {
  const content = readFileSync(filePath, 'utf-8');
  const result = validator.validateContent(content);
  
  let healed = false;
  let healedContent = content;

  // Check for timestamp integrity violations
  if (result.reasons?.some(r => r.includes('timestamp_integrity_violation'))) {
    const healResult = validator.selfHealTimestampIntegrity(content);
    if (healResult.healed) {
      healed = true;
      healedContent = healResult.content;
      // Write healed content back
      writeFileSync(filePath, healedContent, 'utf-8');
    }
  }

  return {
    file: filePath,
    valid: result.status === 'pass',
    reasons: result.reasons || [],
    healed,
  };
}

async function main() {
  console.log('=== Timestamp Integrity Validator ===\n');

  // CI mode: no self-healing, fail on any inconsistency
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const allowHealing = !isCI;

  if (isCI) {
    console.log('🔒 CI Mode: Self-healing disabled. Build will fail on inconsistencies.\n');
  } else {
    console.log('🔧 Local Mode: Self-healing enabled.\n');
  }

  const clock = new SystemClock();
  const validator = new DocumentHeaderValidator(clock);

  // Scan docs/ and ops/ directories
  const docsDir = join(process.cwd(), 'docs');
  const opsDir = join(process.cwd(), 'ops');

  const markdownFiles: string[] = [];
  
  if (statSync(docsDir).isDirectory()) {
    findMarkdownFiles(docsDir, markdownFiles);
  }
  if (statSync(opsDir).isDirectory()) {
    findMarkdownFiles(opsDir, markdownFiles);
  }

  console.log(`Found ${markdownFiles.length} markdown files to validate\n`);

  const results: ValidationResult[] = [];
  let healedCount = 0;
  let invalidCount = 0;

  for (const file of markdownFiles) {
    const content = readFileSync(file, 'utf-8');
    const result = validator.validateContent(content);
    
    let healed = false;
    let healedContent = content;

    // Only heal in local mode
    if (allowHealing && result.reasons?.some(r => r.includes('timestamp_integrity_violation'))) {
      const healResult = validator.selfHealTimestampIntegrity(content);
      if (healResult.healed) {
        healed = true;
        healedContent = healResult.content;
        // Write healed content back
        writeFileSync(file, healedContent, 'utf-8');
      }
    }

    const validationResult: ValidationResult = {
      file,
      valid: result.status === 'pass',
      reasons: result.reasons || [],
      healed,
    };

    results.push(validationResult);

    if (healed) {
      healedCount++;
      console.log(`✅ HEALED: ${file}`);
      console.log(`   Reason: ${validationResult.reasons.find(r => r.includes('timestamp_integrity_violation'))}\n`);
    } else if (!validationResult.valid && validationResult.reasons.some(r => r.includes('timestamp_integrity_violation'))) {
      invalidCount++;
      console.log(`❌ INVALID: ${file}`);
      console.log(`   Reasons: ${validationResult.reasons.join(', ')}\n`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total files: ${markdownFiles.length}`);
  console.log(`Healed: ${healedCount}`);
  console.log(`Invalid (not healed): ${invalidCount}`);
  console.log(`Valid: ${markdownFiles.length - healedCount - invalidCount}`);

  // In CI mode, fail on any inconsistency
  if (isCI && invalidCount > 0) {
    console.log('\n❌ CI BUILD FAILED: Timestamp inconsistencies detected. Self-healing disabled in CI.');
    console.log('   Fix inconsistencies locally and commit the changes.');
    process.exit(1);
  }

  if (!isCI && invalidCount > 0) {
    console.log('\n⚠️  Some files could not be automatically healed. Manual intervention required.');
    process.exit(1);
  }

  if (healedCount > 0) {
    console.log('\n✅ All timestamp inconsistencies have been healed.');
  } else {
    console.log('\n✅ All files have valid timestamp integrity.');
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

