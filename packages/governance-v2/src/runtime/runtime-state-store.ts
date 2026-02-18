/**
 * Runtime State Store
 * 
 * Manages persistent runtime state (e.g., last_seen_at) in a file-based store.
 * Append-safe, deterministic file operations.
 */

import fs from 'node:fs';
import path from 'node:path';
import { resolveRepoRoot } from '../utils/repo-root.js';

export interface RuntimeState {
  last_seen_at?: string; // ISO-8601 UTC timestamp
}

const STATE_FILE_NAME = 'runtime_state.json';
const STATE_FILE_PATH = path.join('ops', 'agent-team', STATE_FILE_NAME);

/**
 * Loads runtime state from file.
 * Returns empty state if file doesn't exist.
 */
export function loadState(repoRoot?: string): RuntimeState {
  const root = repoRoot ?? resolveRepoRoot();
  const stateFilePath = path.join(root, STATE_FILE_PATH);

  if (!fs.existsSync(stateFilePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(stateFilePath, 'utf-8');
    const parsed = JSON.parse(content) as RuntimeState;
    
    // Validate last_seen_at format if present
    if (parsed.last_seen_at && typeof parsed.last_seen_at !== 'string') {
      console.warn(`Invalid last_seen_at format in ${stateFilePath}, ignoring`);
      return {};
    }

    return parsed;
  } catch (error) {
    console.warn(`Failed to load runtime state from ${stateFilePath}:`, error);
    return {};
  }
}

/**
 * Saves runtime state to file.
 * Creates directory structure if needed.
 * Atomic write (write to temp file, then rename).
 */
export function saveState(state: RuntimeState, repoRoot?: string): void {
  const root = repoRoot ?? resolveRepoRoot();
  const stateFilePath = path.join(root, STATE_FILE_PATH);
  const stateDir = path.dirname(stateFilePath);

  // Ensure directory exists
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  // Validate last_seen_at format if present
  if (state.last_seen_at) {
    if (typeof state.last_seen_at !== 'string') {
      throw new Error('last_seen_at must be a string (ISO-8601)');
    }
    // Validate ISO-8601 format
    const date = new Date(state.last_seen_at);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ISO-8601 timestamp: ${state.last_seen_at}`);
    }
  }

  // Atomic write: write to temp file, then rename
  const tempFilePath = `${stateFilePath}.tmp`;
  const content = JSON.stringify(state, null, 2) + '\n';
  
  try {
    fs.writeFileSync(tempFilePath, content, 'utf-8');
    fs.renameSync(tempFilePath, stateFilePath);
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

