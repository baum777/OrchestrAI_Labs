# Skill: runtime.time_gap_audit

## Purpose
Audits runtime state for time gaps (≥threshold minutes) and logs gap events for monitoring.

## When to Use
- Periodic audit of runtime state
- After system restarts or long pauses
- As part of governance monitoring workflows

## Inputs
- `thresholdMinutes` (integer, optional): Gap threshold in minutes (default: 50)

## Outputs
- `gaps` (array): Array of detected gaps
  - `gapMinutes` (integer): Gap duration in minutes
  - `lastSeen` (string): Last seen timestamp (ISO-8601)
  - `now` (string): Current timestamp (ISO-8601)

## Steps

### Step 1: Load Runtime State
- Call: `loadState()` from `@agent-system/governance-v2/runtime/runtime-state-store`
- Get: `last_seen_at` timestamp (ISO-8601) or empty if not set

### Step 2: Calculate Gap
- Get current time: `clock.now().toISOString()`
- If `last_seen_at` exists:
  - Calculate gap: `calculateGapMinutes(last_seen_at, nowIso, clock)`
  - If gap ≥ threshold: Add to gaps array

### Step 3: Log Gap Events
- For each detected gap:
  - Call: `tool.logs.append` with:
    - `action: "TIME_GAP_DETECTED"`
    - `input: { gapMin, lastSeen, nowIso }`
    - `output: { sessionMode: "fresh", threshold }`
    - `ts: nowIso`
    - `blocked: false`

### Step 4: Return Result
- Return: `{ gaps: [...] }`
- If no gaps: Return `{ gaps: [] }`

## Tool Usage Rules
- Must call `tool.logs.append` for each detected gap
- Use Clock interface for all time operations (no `new Date()`)

## Validation & Success Criteria
- Success: Runtime state loaded, gaps calculated, events logged, `gaps` array returned
- Failure: If runtime state load fails, return empty gaps array (non-blocking)

## Logging Requirements
- Log skill execution: `action: "skill.executed", skillId: "runtime.time_gap_audit"`
- Log each gap event via `tool.logs.append` with `action: "TIME_GAP_DETECTED"`

## Failure Modes & Retries
- Runtime state load failure: Return empty gaps array (non-blocking, log warning)
- Clock operation failure: Return error (should not happen with Clock abstraction)
- No retries (audit is deterministic)

