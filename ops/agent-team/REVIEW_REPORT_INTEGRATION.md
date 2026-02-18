# Full Integration Review — Customer Data Plane + PolicyEngine + Time Semantics

**Reviewer:** @reviewer_claude  
**Date:** 2026-02-18T16:30:00+01:00  
**Scope:** Step 1-3 Integration + Real-Time Orientation Logic  
**Mode:** review-only

---

## 1. Governance Integrity

**RiskRating:** **HIGH** ⚠️

### Findings:

#### ✅ PolicyEngine Global Enforcement — VERIFIED
- **Customer Data Tools:** All `customer_data.*` tools call `policyEngine.authorize()` before execution
- **Review Endpoints:** `ReviewsController.approve()` and `reject()` enforce PolicyEngine authorization
- **No Bypass Paths:** All sensitive operations route through PolicyEngine

#### ✅ ActionLogger Mandatory — VERIFIED
- **DecisionsService.finalizeFromDraft:** ActionLogger parameter is required (no optional path)
- **Customer Data Tools:** All tools check for logger and block if missing
- **ProjectsService.updatePhase:** Audit logging mandatory, rollback on failure

#### ✅ Cross-Tenant Protection — VERIFIED
- **PolicyEngine Rule 4:** Explicit check `if (params.clientId && params.clientId !== ctx.clientId)` → throws `CROSS_TENANT_DENIED`
- **ClientId Scoping:** All customer_data operations require `ctx.clientId` match

#### ⚠️ CRITICAL VIOLATION: Direct System Time Usage
- **Location:** `packages/agent-runtime/src/orchestrator/orchestrator.ts`
  - **Lines 227, 250, 273, 301, 317, 318, 337, 356, 357, 376, 392, 393, 427, 442, 456, 471, 493, 508:** Multiple `new Date().toISOString()` calls
  - **Impact:** Breaks determinism, non-testable, potential time-based attacks
  - **Severity:** BLOCKING

- **Location:** `packages/governance/src/policy/policy-engine.ts`
  - **Line 30:** `const timestamp = new Date().toISOString();` in `authorize()` method
  - **Impact:** PolicyDecision timestamps non-deterministic, breaks replay
  - **Severity:** BLOCKING

- **Location:** `apps/api/src/modules/agents/agents.runtime.ts`
  - **Lines 202, 276, 363, 432, 496, 562:** `Date.now()` for latency calculation
  - **Line 121:** `Date.now()` for draftId generation
  - **Impact:** Non-deterministic latency metrics, breaks replay
  - **Severity:** HIGH

- **Location:** `packages/governance-v2/src/audit/audit-runner.ts`
  - **Line 66:** `new Date().toISOString()`
  - **Severity:** HIGH

- **Location:** `packages/governance-v2/src/clarification/ambiguity-detector.ts`
  - **Lines 48, 86:** `Date.now()` for ID generation
  - **Severity:** MEDIUM

- **Location:** `apps/api/src/modules/projects/projects.service.ts`
  - **Line 85:** `new Date().toISOString()`
  - **Severity:** HIGH

- **Location:** `apps/api/src/modules/decisions/decisions.service.ts`
  - **Lines 90, 287, 335:** `new Date().toISOString()`
  - **Severity:** HIGH

---

## 2. Data Plane & Policy Integration

**RiskRating:** **LOW** ✅

### Findings:

#### ✅ Execution Flow — VERIFIED
- **Exact Chain:** Controller → Orchestrator → ToolRouter → PolicyEngine.authorize() → ConnectorRegistry → Connector.execute() → PolicyEngine.redact() → ActionLogger.append()
- **No Alternative Branches:** All customer_data.* tools follow exact chain
- **Multi-Source Routing:** Deterministic operationId → source mapping

#### ✅ PolicyEngine Integration — VERIFIED
- **Authorization:** All customer_data operations call `policyEngine.authorize()`
- **Sanitization:** All parameters sanitized via `policyEngine.sanitize()`
- **Redaction:** All results redacted via `policyEngine.redact()`
- **Cross-Tenant Protection:** Enforced in PolicyEngine Rule 4

#### ✅ Audit Logging — VERIFIED
- **Enriched Metadata:** All logs include `requestId`, `policyDecisionHash`, `resultHash`, `sourceType`, `latencyMs`
- **Mandatory Enforcement:** Logger failure blocks operation
- **Policy Violations:** All violations logged with structured payload

---

## 3. Time Semantics & Clock Model

**RiskRating:** **HIGH** ⚠️

### Findings:

#### ✅ Clock Abstraction — IMPLEMENTED
- **Interface:** `Clock` interface exists with `now(): Date`
- **SystemClock:** Returns `new Date()` (correct for production)
- **FakeClock:** Implements `set(date)` and `advance(ms)` (correct for tests)
- **Tests:** FakeClock tests exist and pass

#### ✅ DocumentHeaderValidator — CLOCK-BASED
- **Clock DI:** Accepts optional `Clock` parameter, defaults to `SystemClock`
- **Future Skew:** Enforces `maxSkewMinutes` (default: 5, configurable via env)
- **Format Validation:** Blocks `invalid_last_updated_format` and `last_updated_in_future`
- **Tests:** Uses FakeClock in tests (verified)

#### ✅ Orchestrator Gap Detection — CLOCK-BASED
- **Gap Detection:** Uses `this.clock.now()` (correct)
- **50-Minute Threshold:** Configurable via `gapThresholdMinutes` (default: 50)
- **TIME_GAP_DETECTED:** Logged with structured payload
- **Runtime State:** Updates `last_seen_at` using clock-based timestamp

#### ❌ CRITICAL VIOLATION: Direct System Time Usage (Multiple Locations)

**Violation Count:** 20+ instances across codebase

**Affected Components:**
1. **Orchestrator** (after gap detection): 18 instances of `new Date().toISOString()`
2. **PolicyEngine**: 1 instance in `authorize()` method
3. **Customer Data Tools**: 7 instances of `Date.now()` for latency
4. **DecisionsService**: 3 instances
5. **ProjectsService**: 1 instance
6. **AuditRunner**: 1 instance
7. **AmbiguityDetector**: 2 instances

**Impact:**
- **Determinism Broken:** Cannot replay logs deterministically
- **Testability Broken:** Cannot test time-dependent behavior
- **Replay Broken:** Timestamps will differ on replay
- **Security Risk:** Potential time-based attack surface

**Required Fix:**
- All components must accept `Clock` via DI
- Replace all `new Date()` and `Date.now()` with `clock.now()`
- Orchestrator must pass clock to all downstream components

#### ✅ UTC Storage — VERIFIED
- **Database:** All timestamps stored as `TIMESTAMPTZ` (PostgreSQL UTC-aware)
- **Runtime State:** `last_seen_at` stored as ISO-8601 UTC string
- **Action Logs:** `ts` field uses `toISOString()` (UTC)
- **No Timezone Mixing:** No locale-specific timezone storage detected

#### ✅ Berlin Formatting — DISPLAY ONLY
- **formatBerlin():** Uses `Intl.DateTimeFormat` with `Europe/Berlin` timezone
- **Usage:** Only for display, never for storage
- **Source of Truth:** UTC ISO-8601 remains source of truth

---

## 4. Replay & Determinism

**RiskRating:** **HIGH** ⚠️

### Findings:

#### ✅ Replay-Ready Metadata — VERIFIED
- **requestId:** Generated via `crypto.randomUUID()` (non-deterministic, but logged)
- **policyDecisionHash:** SHA256 hash of decision data (deterministic)
- **resultHash:** SHA256 hash of result data (deterministic, excludes PII)
- **sourceType:** Connector source identifier (deterministic)
- **latencyMs:** Execution time in milliseconds (NON-DETERMINISTIC — see violation)

#### ❌ CRITICAL VIOLATION: Non-Deterministic Timestamps
- **PolicyDecision.timestamp:** Generated via `new Date().toISOString()` in PolicyEngine
- **ActionLog.ts:** Generated via `new Date().toISOString()` in multiple locations
- **Impact:** Replay will have different timestamps, breaking determinism

#### ❌ CRITICAL VIOLATION: Non-Deterministic Latency
- **Location:** `apps/api/src/modules/agents/agents.runtime.ts`
- **Method:** `Date.now()` for start/end time calculation
- **Impact:** Latency metrics non-deterministic, breaks replay verification

#### ✅ ResultHash Stability — VERIFIED
- **Implementation:** `generateResultHash()` uses deterministic SHA256
- **PII Exclusion:** Excludes denyFields from hash
- **Normalization:** Sorts object keys for deterministic hashing
- **Tests:** Should verify same input → same hash (not explicitly tested)

---

## 5. Critical Violations

### BLOCKING VIOLATIONS (Must Fix Before Merge):

1. **Direct System Time Usage in Orchestrator**
   - **File:** `packages/agent-runtime/src/orchestrator/orchestrator.ts`
   - **Lines:** 227, 250, 273, 301, 317, 318, 337, 356, 357, 376, 392, 393, 427, 442, 456, 471, 493, 508
   - **Fix:** Replace all `new Date().toISOString()` with `this.clock.now().toISOString()`
   - **Severity:** BLOCKING

2. **Direct System Time Usage in PolicyEngine**
   - **File:** `packages/governance/src/policy/policy-engine.ts`
   - **Line:** 30
   - **Fix:** Accept `Clock` via constructor, use `this.clock.now().toISOString()`
   - **Severity:** BLOCKING

3. **Direct System Time Usage in Customer Data Tools**
   - **File:** `apps/api/src/modules/agents/agents.runtime.ts`
   - **Lines:** 202, 276, 363, 432, 496, 562 (latency), 121 (draftId)
   - **Fix:** Pass `Clock` to tool handlers, use `clock.now()` for timestamps and `Date.now()` replacement
   - **Severity:** HIGH (BLOCKING for replay)

4. **Direct System Time Usage in DecisionsService**
   - **File:** `apps/api/src/modules/decisions/decisions.service.ts`
   - **Lines:** 90, 287, 335
   - **Fix:** Accept `Clock` via constructor or method parameter
   - **Severity:** HIGH

5. **Direct System Time Usage in ProjectsService**
   - **File:** `apps/api/src/modules/projects/projects.service.ts`
   - **Line:** 85
   - **Fix:** Accept `Clock` via constructor
   - **Severity:** HIGH

### HIGH SEVERITY VIOLATIONS:

6. **Non-Deterministic Latency Calculation**
   - **File:** `apps/api/src/modules/agents/agents.runtime.ts`
   - **Impact:** Breaks replay determinism
   - **Fix:** Use `clock.now()` for start/end time, calculate difference

7. **Non-Deterministic ID Generation**
   - **File:** `apps/api/src/modules/agents/agents.runtime.ts` (line 121), `packages/governance-v2/src/clarification/ambiguity-detector.ts`
   - **Impact:** Breaks replay determinism
   - **Fix:** Use deterministic ID generation or accept as non-deterministic (document)

---

## 6. Required Fixes Before Merge

### MANDATORY (Blocking):

1. **Refactor Orchestrator to use Clock for all timestamps**
   - Replace all `new Date().toISOString()` with `this.clock.now().toISOString()`
   - Ensure clock is passed to all downstream components that need time

2. **Refactor PolicyEngine to accept Clock**
   - Add `Clock` parameter to constructor
   - Replace `new Date().toISOString()` with `this.clock.now().toISOString()`
   - Update all PolicyEngine instantiations

3. **Refactor Customer Data Tools to use Clock**
   - Pass `Clock` to tool handlers
   - Replace `Date.now()` with `clock.now().getTime()` for latency
   - Replace `Date.now()` with deterministic ID generation or clock-based ID

4. **Refactor DecisionsService to use Clock**
   - Accept `Clock` via constructor or method parameter
   - Replace all `new Date().toISOString()` with `clock.now().toISOString()`

5. **Refactor ProjectsService to use Clock**
   - Accept `Clock` via constructor
   - Replace `new Date().toISOString()` with `clock.now().toISOString()`

### OPTIONAL (Recommended):

6. **Add Tests for Replay Determinism**
   - Test that same input produces same resultHash
   - Test that same input produces same policyDecisionHash
   - Test that timestamps are deterministic with FakeClock

7. **Document Non-Deterministic Elements**
   - Document that `requestId` is non-deterministic (by design)
   - Document that `latencyMs` may vary (acceptable for metrics)

---

## 7. Merge Decision

### **BLOCK** ❌

**Reason:** Critical violations of time abstraction requirements. Multiple instances of direct system time usage break determinism and replay capability.

**Required Actions:**
1. Fix all BLOCKING violations (items 1-5 above)
2. Verify all timestamps use Clock abstraction
3. Re-run tests with FakeClock to verify determinism
4. Re-submit for review

**Estimated Effort:** 2-4 hours of refactoring

---

## Summary

### ✅ Strengths:
- PolicyEngine global enforcement verified
- Cross-tenant protection implemented
- ActionLogger mandatory enforcement verified
- Clock abstraction correctly implemented
- UTC storage verified
- Replay-ready metadata structure correct

### ❌ Critical Issues:
- **20+ instances** of direct system time usage
- **Non-deterministic timestamps** break replay
- **Non-deterministic latency** breaks replay verification
- **Clock not propagated** to all components

### Risk Assessment:
- **Governance Integrity:** HIGH risk due to time abstraction violations
- **Security:** MEDIUM risk (time-based attacks possible)
- **Determinism:** HIGH risk (replay broken)
- **Testability:** HIGH risk (cannot test time-dependent behavior)

---

**End of Review Report**

