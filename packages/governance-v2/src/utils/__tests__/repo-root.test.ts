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

  it('should throw error when REPO_ROOT points to invalid path', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-root-invalid-'));
    process.env.REPO_ROOT = tempDir;
    try {
      expect(() => resolveRepoRoot()).toThrow('REPO_ROOT environment variable set to invalid path');
    } finally {
      delete process.env.REPO_ROOT;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

