/**
 * Repo Root Resolver
 * 
 * Determines the repository root directory deterministically.
 * Used for loading policy files and decision history.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the repository root directory.
 * 
 * Strategy:
 * 1. Check REPO_ROOT environment variable
 * 2. Traverse upwards from process.cwd() until package.json + pnpm-workspace.yaml found
 * 3. Throw explicit error if not found
 */
export function resolveRepoRoot(): string {
  // Check environment variable first
  if (process.env.REPO_ROOT) {
    const repoRoot = path.resolve(process.env.REPO_ROOT);
    if (fs.existsSync(repoRoot) && isValidRepoRoot(repoRoot)) {
      return repoRoot;
    }
    throw new Error(`REPO_ROOT environment variable set to invalid path: ${process.env.REPO_ROOT}`);
  }

  // Start from process.cwd() and traverse upwards
  let currentDir = process.cwd();
  const maxDepth = 20; // Prevent infinite loops
  let depth = 0;

  while (depth < maxDepth) {
    if (isValidRepoRoot(currentDir)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
    depth++;
  }

  // If not found from cwd, try from __dirname (fallback for tests)
  currentDir = __dirname;
  depth = 0;
  while (depth < maxDepth) {
    if (isValidRepoRoot(currentDir)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
    depth++;
  }

  throw new Error(
    'Repository root not found. Expected to find package.json and pnpm-workspace.yaml. ' +
    'Set REPO_ROOT environment variable or run from repository root.'
  );
}

/**
 * Checks if a directory is a valid repository root.
 */
function isValidRepoRoot(dir: string): boolean {
  const packageJsonPath = path.join(dir, 'package.json');
  const workspaceYamlPath = path.join(dir, 'pnpm-workspace.yaml');

  return (
    fs.existsSync(packageJsonPath) &&
    fs.existsSync(workspaceYamlPath)
  );
}

