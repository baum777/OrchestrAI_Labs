/**
 * Runtime State Store Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadState, saveState } from '../runtime-state-store.js';

describe('RuntimeStateStore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-state-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('loads empty state if file does not exist', () => {
    const state = loadState(tempDir);
    expect(state).toEqual({});
  });

  it('saves and loads state correctly', () => {
    const testState = {
      last_seen_at: '2026-02-18T10:57:00.000Z',
    };

    saveState(testState, tempDir);
    const loaded = loadState(tempDir);

    expect(loaded.last_seen_at).toBe('2026-02-18T10:57:00.000Z');
  });

  it('creates directory structure if needed', () => {
    const testState = {
      last_seen_at: '2026-02-18T10:57:00.000Z',
    };

    saveState(testState, tempDir);

    const stateFilePath = path.join(tempDir, 'ops', 'agent-team', 'runtime_state.json');
    expect(fs.existsSync(stateFilePath)).toBe(true);
  });

  it('validates ISO-8601 format on save', () => {
    const invalidState = {
      last_seen_at: 'invalid-date',
    };

    expect(() => saveState(invalidState, tempDir)).toThrow('Invalid ISO-8601 timestamp');
  });

  it('handles missing last_seen_at', () => {
    const state = {};
    saveState(state, tempDir);
    const loaded = loadState(tempDir);
    expect(loaded).toEqual({});
  });
});

