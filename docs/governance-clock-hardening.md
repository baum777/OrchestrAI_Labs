# Clock Governance Hardening + CI Enforcement

**Status:** Binding  
**Scope:** Global (All Write Paths)  
**Risk Class:** Foundational  
**Version:** 1.0  
**Last Updated:** 2026-02-18

---

## PURPOSE

Prevent timestamp inconsistencies system-wide.  
Eliminate hidden time sources.  
Guarantee deterministic temporal integrity.

---

## SECTION 1 — GLOBAL TIME SOURCE POLICY

### 1.1 Single Source of Time (SSoT)

**Allowed:**
- `Clock.nowUTC()` via `@agent-system/governance-v2/runtime/clock`
- `SystemClock` for production
- `FakeClock` for testing

**Prohibited:**
- `new Date()`
- `Date.now()`
- Implicit date parsing without normalization

**Rule:**
No direct Date usage in business logic.  
Exception: inside clock utility only.

**Violation classification:**
- Severity: Medium → escalates to High in high-risk paths.

### 1.2 Enforcement Scope

Mandatory integration for:

- `packages/workflow/**`
- `packages/governance/**`
- `packages/agent-runtime/**`
- Any mutation layer touching persistence

---

## SECTION 2 — CI ENFORCEMENT

### 2.1 Timestamp Validation Step

**CI Stage:** `validate-timestamps`

**Command:**
```bash
pnpm validate:timestamps
```

**Runs:**
- `scripts/validate-timestamp-integrity.ts`

**CI Behavior:**
- If inconsistency detected → **FAIL BUILD**
- No silent healing in CI
- Self-healing disabled when `CI=true` or `GITHUB_ACTIONS=true`

**Local behavior:**
- Self-healing allowed
- Warning log required

**GitHub Actions:**
- Workflow: `.github/workflows/timestamp-integrity.yml`
- Runs on: `push` to `main`/`develop`, `pull_request` to `main`/`develop`

### 2.2 Date Usage Lint Rule

**ESLint Configuration:**
- Global: `.eslintrc.json`
- Rule: `no-restricted-globals` + `no-restricted-syntax`

**Disallow:**
- `new Date()`
- `Date.now()`

**Exceptions:**
- `packages/governance-v2/src/runtime/clock.ts`
- `packages/shared/src/utils/clock/**`
- Test files (warn only)

**CI fails on violation.**

---

## SECTION 3 — MONITORING & OBSERVABILITY

### 3.1 Correction Event

When self-healing triggers:

**Emit event:**
```typescript
timestamp_corrected
```

**Include:**
- `entity`: Entity identifier
- `previous_createdAt`: Original createdAt
- `previous_updatedAt`: Original updatedAt (violation)
- `corrected_updatedAt`: Corrected updatedAt
- `source_layer`: Source layer (governance, implementation, etc.)
- `timestamp`: Event timestamp (ISO-8601)

**Implementation:**
- `packages/shared/src/utils/timestamp-integrity.ts`
- `registerTimestampCorrectionCallback()`
- `timestampMonitoring.recordCorrection()`

### 3.2 Drift Metric (Optional Activation)

**Metric:**
- `timestamp_correction_rate`: Corrections per hour

**Threshold:**
- Default: 10 corrections/hour
- Configurable via `timestampMonitoring.exceedsThreshold(threshold, from, to)`

**If > threshold:**
- Trigger governance review
- Log warning
- Emit alert event

**Implementation:**
- `packages/shared/src/utils/timestamp-monitoring.ts`
- `timestampMonitoring.getMetrics(from, to)`

---

## SECTION 4 — HIGH-RISK BINDING

For high-risk paths:

**Required before merge:**

1. **Timestamp integrity tests**
   - Unit tests with `FakeClock`
   - Edge cases: `updatedAt < createdAt`
   - Self-healing verification

2. **Frozen clock tests**
   - Deterministic replay
   - No time-dependent flakiness

3. **RiskRating documented**
   - In component documentation
   - In PR description

4. **Rollback strategy defined**
   - How to revert timestamp changes
   - Data migration plan if needed

**High-Risk Paths:**
- `packages/governance-v2/**`
- `packages/workflow/**`
- `packages/agent-runtime/**`
- Any persistence layer

---

## SECTION 5 — FAILURE MODES

### 5.1 Invalid Input

If external metadata violates invariant:

**Behavior:**
- Normalize
- Log warning
- Proceed

**Never throw on production read-path.**

### 5.2 Mutation Path

If invariant broken during write:

**Behavior:**
- Self-heal
- Log correction event
- Continue

**Never fail silently.**

---

## SECTION 6 — SUCCESS CRITERIA

Appendix 1.1 considered **active** when:

- ✅ No direct `Date()` usage remains (except in clock utilities)
- ✅ CI step active (`.github/workflows/timestamp-integrity.yml`)
- ✅ Lint rule active (`.eslintrc.json`)
- ✅ `timestamp_corrected` event emitted
- ✅ High-risk binding documented
- ✅ Monitoring metrics available
- ✅ Self-healing verified in tests

---

## CORE PRINCIPLE

**Deterministic time.**  
**No implicit state.**  
**No silent drift.**  
**Audit-ready integrity.**

---

## IMPLEMENTATION STATUS

### ✅ Completed

1. **ESLint Rules**
   - Global `.eslintrc.json` with `no-restricted-globals` and `no-restricted-syntax`
   - Exceptions for clock utilities

2. **CI Workflow**
   - `.github/workflows/timestamp-integrity.yml`
   - Fails on inconsistencies in CI mode

3. **Event Emission**
   - `TimestampCorrectionEvent` interface
   - `registerTimestampCorrectionCallback()`
   - Integration in `DocumentHeaderValidator`

4. **Monitoring**
   - `timestampMonitoring` singleton
   - `getMetrics()` and `exceedsThreshold()`

5. **Code Migration**
   - `packages/knowledge/src/retrieval/search.ts`: Clock injection
   - `packages/knowledge/src/ingestion/upload.ts`: Clock injection
   - `apps/api/src/modules/monitoring/monitoring.controller.ts`: Clock injection

### 🔄 In Progress

- Full codebase audit for remaining `Date()` usage
- High-risk path documentation completion

### 📋 Pending

- Golden tests for timestamp integrity
- Performance benchmarks for clock abstraction
- Rollback strategy documentation

