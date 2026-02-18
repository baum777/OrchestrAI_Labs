/**
 * Tests for Decision History Store
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DecisionHistoryStore } from '../decision-history-store.js';
import type { Decision } from '../../types/governance.types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('DecisionHistoryStore', () => {
  let store: DecisionHistoryStore;
  let testFilePath: string;

  beforeEach(() => {
    const testDir = os.tmpdir();
    testFilePath = path.join(testDir, 'test-decisions.jsonl');
    store = new DecisionHistoryStore(testFilePath);
    // Clean up if exists
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should append decision to store', async () => {
    const decision: Decision = {
      id: 'dec1',
      layer: 'strategy',
      rationale: 'Test rationale',
      alternatives: [],
      implications: 'Test implications',
      owner: 'test_owner',
      timestamp: '2026-02-13T00:00:00Z',
    };

    await store.append(decision);

    expect(fs.existsSync(testFilePath)).toBe(true);
    const content = fs.readFileSync(testFilePath, 'utf-8');
    expect(content).toContain('dec1');
  });

  it('should list decisions', async () => {
    const decision1: Decision = {
      id: 'dec1',
      layer: 'strategy',
      rationale: 'Test 1',
      alternatives: [],
      implications: 'Test',
      owner: 'owner1',
      timestamp: '2026-02-13T00:00:00Z',
    };

    const decision2: Decision = {
      id: 'dec2',
      layer: 'architecture',
      rationale: 'Test 2',
      alternatives: [],
      implications: 'Test',
      owner: 'owner2',
      timestamp: '2026-02-13T01:00:00Z',
    };

    await store.append(decision1);
    await store.append(decision2);

    const decisions = await store.list();
    expect(decisions).toHaveLength(2);
    expect(decisions[0].id).toBe('dec1');
    expect(decisions[1].id).toBe('dec2');
  });

  it('should filter decisions by layer', async () => {
    const decision1: Decision = {
      id: 'dec1',
      layer: 'strategy',
      rationale: 'Test 1',
      alternatives: [],
      implications: 'Test',
      owner: 'owner1',
      timestamp: '2026-02-13T00:00:00Z',
    };

    const decision2: Decision = {
      id: 'dec2',
      layer: 'architecture',
      rationale: 'Test 2',
      alternatives: [],
      implications: 'Test',
      owner: 'owner2',
      timestamp: '2026-02-13T01:00:00Z',
    };

    await store.append(decision1);
    await store.append(decision2);

    const strategyDecisions = await store.list({ layer: 'strategy' });
    expect(strategyDecisions).toHaveLength(1);
    expect(strategyDecisions[0].id).toBe('dec1');
  });

  it('should filter decisions by owner', async () => {
    const decision1: Decision = {
      id: 'dec1',
      layer: 'strategy',
      rationale: 'Test 1',
      alternatives: [],
      implications: 'Test',
      owner: 'owner1',
      timestamp: '2026-02-13T00:00:00Z',
    };

    const decision2: Decision = {
      id: 'dec2',
      layer: 'architecture',
      rationale: 'Test 2',
      alternatives: [],
      implications: 'Test',
      owner: 'owner2',
      timestamp: '2026-02-13T01:00:00Z',
    };

    await store.append(decision1);
    await store.append(decision2);

    const owner1Decisions = await store.getByOwner('owner1');
    expect(owner1Decisions).toHaveLength(1);
    expect(owner1Decisions[0].id).toBe('dec1');
  });

  it('should get latest decision by layer', async () => {
    const decision1: Decision = {
      id: 'dec1',
      layer: 'strategy',
      rationale: 'Test 1',
      alternatives: [],
      implications: 'Test',
      owner: 'owner1',
      timestamp: '2026-02-13T00:00:00Z',
    };

    const decision2: Decision = {
      id: 'dec2',
      layer: 'strategy',
      rationale: 'Test 2',
      alternatives: [],
      implications: 'Test',
      owner: 'owner2',
      timestamp: '2026-02-13T01:00:00Z',
    };

    await store.append(decision1);
    await store.append(decision2);

    const latest = await store.getLatestByLayer('strategy');
    expect(latest).not.toBeNull();
    expect(latest?.id).toBe('dec2');
  });
});

