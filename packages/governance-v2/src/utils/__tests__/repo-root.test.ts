/**
 * Tests for Repo Root Resolver
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { resolveRepoRoot } from '../repo-root.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('resolveRepoRoot', () => {
  const originalEnv = process.env.REPO_ROOT;
  const originalCwd = process.cwd();

  beforeEach(() => {
    delete process.env.REPO_ROOT;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.REPO_ROOT = originalEnv;
    } else {
      delete process.env.REPO_ROOT;
    }
    process.chdir(originalCwd);
  });

  it('should resolve repo root from environment variable', () => {
    const testRoot = path.join(os.tmpdir(), 'test-repo');
    process.env.REPO_ROOT = testRoot;

    // Create mock repo structure
    fs.mkdirSync(testRoot, { recursive: true });
    fs.writeFileSync(path.join(testRoot, 'package.json'), '{}');
    fs.writeFileSync(path.join(testRoot, 'pnpm-workspace.yaml'), '');

    try {
      const result = resolveRepoRoot();
      expect(result).toBe(testRoot);
    } finally {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('should resolve repo root from current working directory', () => {
    // Assuming tests run from repo root
    const repoRoot = resolveRepoRoot();
    expect(fs.existsSync(path.join(repoRoot, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'pnpm-workspace.yaml'))).toBe(true);
  });

  it('should throw error if repo root not found', () => {
    // Change to temp directory (unlikely to be repo root)
    const tempDir = os.tmpdir();
    process.chdir(tempDir);
    delete process.env.REPO_ROOT;

    expect(() => resolveRepoRoot()).toThrow('Repository root not found');
  });
});

