# IST-ZUSTAND Architecture & Logic Report
**Agent Orchestration Monorepo — Current State Audit**

**Date:** 2026-02-18  
**Auditor:** Repo Auditor  
**Scope:** Complete system architecture, runtime, governance, time handling, and skill-equivalent mechanisms

---

## 1. System Overview

- **Monorepo Structure:** NestJS API (`apps/api`), Next.js Web UI (`apps/web`), shared packages (`packages/*`), operational artifacts (`ops/agent-team/`)
- **Agent Runtime:** Profile-based agent system with JSON profiles loaded from `packages/agent-runtime/src/profiles/*.json` at startup, cached in-memory
- **Orchestration:** `Orchestrator` class (`packages/agent-runtime/src/orchestrator/orchestrator.ts`) mediates all agent runs, enforces permissions, handles review gates, commit tokens, and time gap detection
- **Tool Execution:** `ToolRouter` (`packages/agent-runtime/src/execution/tool-router.ts`) routes tool calls to handlers, validates permissions via `TOOL_PERMISSION_MAP`, executes tools registered in `agents.runtime.ts`
- **Governance V2:** Self-validating meta-layer with workstream validation, document header validation, timestamp integrity checks, decision history store, scorecard engine
- **Governance V1:** Policy engine (`packages/governance/src/policy/policy-engine.ts`) handles authorization, sanitization, redaction for customer data access
- **Customer Data Plane:** Multi-source connector registry, capability registry, operation allowlisting, client-scoped data access with policy enforcement
- **Knowledge Layer:** Simple search interface (`packages/knowledge/src/retrieval/search.ts`), ingestion via `upload.ts`, minimal implementation (returns mock data)
- **Workflow Engine:** Phase-based project workflow (`packages/workflow/src/engine/phase-runner.ts`), YAML definitions, escalation manager
- **Time Abstraction:** `Clock` interface (`packages/governance-v2/src/runtime/clock.ts`) with `SystemClock` and `FakeClock` implementations, ESLint rules enforce usage, gap detection at 50-minute threshold
- **Review System:** PostgreSQL-backed review store (`apps/api/src/runtime/postgres-review-store.ts`), commit token verification, SHA-256 token hashing
- **Audit Trail:** Action logger interface, PostgreSQL action logs, decision history store (JSONL format), runtime state store (file-based)

---

## 2. Architecture Map

### 2.1 Applications

#### `apps/api/` (NestJS Backend)
**Entry Point:** `apps/api/src/main.ts` → `AppModule` → HTTP server on port 4000

**Modules:**
- **`AgentsModule`** (`apps/api/src/modules/agents/`)
  - `AgentsController.execute()` → `POST /agents/execute` endpoint
  - `agents.runtime.ts` → Factory: `createOrchestrator()` builds `Orchestrator` with tool handlers
  - Tool handlers registered in `toolHandlers()` function (lines 33-653)
  - Customer data providers: `createConnectorRegistry()`, `createCapabilityRegistry()`
- **`DecisionsModule`** (`apps/api/src/modules/decisions/`)
  - `DecisionsService` → Creates/finalizes decision drafts
  - `DecisionsController` → HTTP endpoints for decisions
- **`KnowledgeModule`** (`apps/api/src/modules/knowledge/`)
  - `KnowledgeService` → Search across decisions/reviews/logs
  - `KnowledgeController` → HTTP endpoints
- **`ProjectsModule`** (`apps/api/src/modules/projects/`)
  - `ProjectsService` → Project context management
  - `ProjectsContextController` → HTTP endpoints
- **`ReviewsModule`** (`apps/api/src/modules/reviews/`)
  - `ReviewsController` → HTTP endpoints
- **`LogsModule`** (`apps/api/src/modules/logs/`)
  - `LogsController` → HTTP endpoints for action logs
- **`MonitoringModule`** (`apps/api/src/modules/monitoring/`)
  - `MonitoringService` → System monitoring
  - `MonitoringController` → HTTP endpoints

**Runtime Components:**
- `PostgresActionLogger` (`apps/api/src/runtime/postgres-action-logger.ts`) → Writes to `action_logs` table
- `PostgresReviewStore` (`apps/api/src/runtime/postgres-review-store.ts`) → Manages review requests, commit tokens
- `PostgresReviewQueue` (`apps/api/src/runtime/postgres-review-queue.ts`) → Review queue management

#### `apps/web/` (Next.js Frontend)
**Entry Points:**
- `apps/web/src/app/page.tsx` → Root page
- `apps/web/src/app/(dashboard)/approval/page.tsx` → Approval inbox UI
- `apps/web/src/app/(dashboard)/audit/page.tsx` → Audit ledger UI
- `apps/web/src/app/(dashboard)/governance/page.tsx` → Governance dashboard
- `apps/web/src/app/(dashboard)/fleet/page.tsx` → Agent fleet view

**Components:**
- `AdvisorCard` (`apps/web/src/components/governance/AdvisorCard.tsx`) → Policy violation advice display
- `AuditLedgerViewSection` → Audit log visualization
- `GovernanceShieldSection` → Governance metrics display
- `InteractiveTrustDemo` → Trust/verification UI
- `MultiTenantSafetySection` → Multi-tenant safety visualization

**Clock Abstraction:** `apps/web/src/lib/clock.ts` → Client-side clock wrapper

### 2.2 Packages

#### `packages/agent-runtime/`
**Core Components:**
- **`Orchestrator`** (`src/orchestrator/orchestrator.ts`)
  - `run(ctx, input)` → Main execution flow
  - Gap detection (50-minute threshold, configurable via `TIME_GAP_DETECTION` env)
  - Governance v2 preflight validation (if `governanceValidator` provided)
  - Review gate enforcement (`enforceReviewGate()`)
  - Commit token verification (SHA-256 hash comparison)
  - Payload tamper detection (hash comparison)
  - Tool execution loop
- **`ToolRouter`** (`src/execution/tool-router.ts`)
  - `execute(profile, ctx, call)` → Routes tool calls
  - Permission enforcement via `TOOL_PERMISSION_MAP`
  - Tool handler registry
- **`AgentExecutor`** (`src/execution/agent-executor.ts`)
  - `execute(agent, input, metadata)` → Delegates to `agent.handle()`
- **`ProfileLoader`** (`src/profiles/profile-loader.ts`)
  - `loadAll()` → Loads JSON profiles from filesystem, validates with Zod schema
  - `getById(id)` → Returns cached profile
  - Profiles: `knowledge.json`, `project.json`, `documentation.json`, `junior.json`, `governance.json`
- **`BaseAgent`** (`src/agents/base-agent.ts`)
  - Abstract base class, `handle()` method
  - Agent implementations: `KnowledgeAgent`, `ProjectAgent`, `DocumentationAgent`, `JuniorAgent`, `GovernanceAgent`
- **`IntentClassifier`** (`src/orchestrator/intent-classifier.ts`)
  - `classify(input)` → Returns `AgentDomain` (governance/workflow/knowledge/tools)
- **`AgentSelector`** (`src/orchestrator/agent-selector.ts`)
  - `select(domain, agents)` → Selects agent by domain match

#### `packages/governance-v2/`
**Core Components:**
- **`PolicyEngine`** (`src/policy/policy-engine.ts`)
  - `loadPolicyRules()` → Parses `ops/agent-team/policy_approval_rules.yaml` (simplified parser, returns empty rules)
  - `loadAutonomyPolicy()` → Parses `ops/agent-team/autonomy_policy.md` (hardcoded ladder: 1=read-only, 2=draft-only, 3=execute-with-approval, 4=autonomous-with-limits)
  - `checkDecision()` → Placeholder (always returns `{ allowed: true }`)
- **`WorkstreamValidator`** (`src/validator/workstream-validator.ts`)
  - `validate(workstream)` → Checks owner, scope, structural model, risks, layer, autonomy tier, DoD
  - Returns `{ status: 'pass' | 'blocked', reasons?, requiresReview? }`
- **`DocumentHeaderValidator`** (`src/validator/document-header-validator.ts`)
  - `validateDocument(filePath)` → Validates markdown headers
  - Required fields: Version, Owner, Layer, Last Updated, Definition of Done
  - Timestamp validation: max skew 5 minutes (configurable via `LAST_UPDATED_MAX_SKEW_MIN` env)
  - Timestamp integrity: `validateTimestampIntegrity()` checks `updatedAt >= createdAt`
  - Self-healing: `selfHealTimestampIntegrity()` corrects inconsistencies
- **`AutonomyGuard`** (`src/policy/autonomy-guard.ts`)
  - `checkEscalation(decision)` → Checks hard rules (no_secrets, confirm_destructive)
  - `checkWorkstreamEscalation(workstream)` → Checks autonomy tier requirements
- **`ScorecardEngine`** (`src/scorecard/scorecard-engine.ts`)
  - `calculateScorecard(workstreams, decisions)` → Calculates 6 metrics (layer purity, workstream completeness, escalation discipline, decision traceability, DoD enforcement, clarification compliance)
  - Returns normalized score (0-10)
- **`DecisionHistoryStore`** (`src/history/decision-history-store.ts`)
  - `append(decision)` → Appends to JSONL file (`ops/agent-team/team_decisions.jsonl`)
  - `list(filter?)` → Filters by layer, owner, since, scopePrefix
- **`RuntimeStateStore`** (`src/runtime/runtime-state-store.ts`)
  - `loadState()` → Loads from `ops/agent-team/runtime_state.json`
  - `saveState(state)` → Atomic write (temp file + rename)
  - Stores `last_seen_at` (ISO-8601 UTC)
- **`Clock`** (`src/runtime/clock.ts`)
  - Interface: `now()`, `parseISO(iso)`, `setTimeout(cb, ms)`
  - `SystemClock` → Real system time
  - `FakeClock` → Test clock with `set()`, `advance(ms)`
- **`TimeUtils`** (`src/runtime/time-utils.ts`)
  - `formatBerlin(dt)` → Display-only formatting (Europe/Berlin timezone)
  - `calculateGapMinutes(lastSeenIso, nowIso, clock?)` → Calculates gap in minutes
- **`AmbiguityDetector`** (`src/clarification/ambiguity-detector.ts`)
  - `detectAmbiguities(workstream)` → Detects missing fields, conflicting requirements
- **`ConflictDetector`** (`src/clarification/conflict-detector.ts`)
  - `detectConflicts(workstream, history)` → Detects scope conflicts, layer violations
- **`DecisionCompiler`** (`src/compiler/decision-compiler.ts`)
  - `compile(workstream, history)` → Compiles workstream into decision
- **`AuditRunner`** (`src/audit/audit-runner.ts`)
  - `runAudit()` → Runs governance audit checks
- **`GovernanceHook`** (`src/runtime/governance-hook.ts`)
  - Runtime hook for governance integration
- **Bridge:** `v1-adapter.ts` → Adapter for governance v1 compatibility

#### `packages/governance/` (V1)
**Core Components:**
- **`PolicyEngine`** (`src/policy/policy-engine.ts`)
  - `authorize(ctx, operation, params)` → RBAC, permission checks, clientId scoping, cross-tenant protection, premium feature license checks
  - `sanitize(params, capability, operationId)` → Rejects raw SQL, applies constraints, validates allowed fields
  - `redact(result, capability, operationId)` → Removes denyFields, filters to allowedFields
  - Returns `PolicyDecision` with `decisionHash` (deterministic, excludes timestamp)
- **`ReviewEngine`** (`src/review/review-engine.ts`)
  - Review request management
- **`ActionPolicy`** (`src/policies/action-policy.ts`)
  - Action-level policy enforcement
- **`ReviewPolicy`** (`src/policies/review-policy.ts`)
  - Review-level policy enforcement
- **`Enforcement`** (`src/policies/enforcement.ts`)
  - `enforcePermission(profile, perm)` → Throws if permission denied
  - `enforceReviewGate(profile, perm)` → Returns `{ ok, mode, reason? }`
- **`LicenseManager`** (`src/license/license-manager.ts`)
  - License/feature access checks
- **`ActionLogger`** (`src/logging/action-log.ts`)
  - Action log interface
- **`InMemoryActionLogger`** (`src/logging/inmemory-action-logger.ts`)
  - In-memory implementation

#### `packages/customer-data/`
**Core Components:**
- **`MultiSourceConnectorRegistry`** (`src/registry.ts`)
  - `getConnector(clientId, source)` → Returns connector for clientId + source
  - `register(clientId, source, connector)` → Registers connector
  - `getSources(clientId)` → Returns all sources for clientId
- **`CapabilityRegistry`** (`src/registry.ts`)
  - `getCapabilities(clientId)` → Returns `CapabilityMap` for clientId
  - `register(clientId, capabilities)` → Registers capabilities
  - `isOperationAllowed(clientId, operationId)` → Checks allowlist
  - `getSourceForOperation(clientId, operationId)` → Returns source mapping
- **`Connector`** (`src/connector.ts`)
  - `executeReadModel(operationId, params, constraints)` → Executes read operation
- **`Constraints`** (`src/constraints.ts`)
  - `applyConstraints(params, capability, operationId)` → Applies maxRows, allowedFields, denyFields
  - `validateAllowedFields(requested, allowed)` → Validates field allowlist
  - `containsRawSql(params)` → Detects raw SQL injection attempts
- **`ResultHash`** (`src/result-hash.ts`)
  - `generateResultHash(data, denyFields)` → Deterministic hash (no PII)

#### `packages/knowledge/`
**Core Components:**
- **`Search`** (`src/retrieval/search.ts`)
  - `searchKnowledge(query, clock)` → Returns mock `KnowledgeItem[]`
- **`Upload`** (`src/ingestion/upload.ts`)
  - `uploadDocument(source, content, clock)` → Returns mock document ID
- **`Chunker`** (`src/ingestion/chunker.ts`)
  - Document chunking logic
- **`Parser`** (`src/ingestion/parser.ts`)
  - Document parsing logic
- **`KnowledgeItem`** (`src/models/knowledge-item.ts`)
  - Knowledge item model

#### `packages/workflow/`
**Core Components:**
- **`PhaseRunner`** (`src/engine/phase-runner.ts`)
  - `getPhase(id)` → Returns phase by ID
  - `getNextPhase(currentId)` → Returns next phase
- **`EscalationManager`** (`src/engine/escalation.ts`)
  - `notify(projectId, reason)` → Escalation notification
- **`Validator`** (`src/engine/validator.ts`)
  - Phase validation logic
- **Definitions:** `default-phases.yaml`, `consulting-project.yaml`

#### `packages/shared/`
**Core Components:**
- **Types:** `agent.ts`, `decision.ts`, `governance.ts`, `project-phase.ts`, `review.ts`
- **Utils:**
  - `timestamp-integrity.ts` → Timestamp validation, self-healing, correction callbacks
  - `timestamp-monitoring.ts` → Timestamp correction event monitoring

#### `packages/premium/marketer/`
**Premium Module:**
- **`MarketerAgent`** (`agents/marketer-agent.ts`)
- **`MarketingTool`** (`tools/marketing-tool.ts`)
- **`KPIParser`** (`utils/kpi-parser.ts`)
- Dynamically loaded via `require()` in `agents.runtime.ts` (lines 48-61)

### 2.3 Operational Artifacts (`ops/agent-team/`)

**Mandatory Files:**
- `team_plan.md` → Workstream tracking, owners, status, blockers
- `team_findings.md` → Discoveries, root causes
- `team_progress.md` → Timestamped execution log
- `team_decisions.md` → Decision records
- `team_decisions.jsonl` → Append-only decision history (JSONL format)
- `autonomy_policy.md` → Autonomy ladder (4 tiers), hard rules
- `policy_approval_rules.yaml` → Approval triggers (large_change, destructive_ops, ci_or_build, prompt_or_agent_core, prod_config)
- `scorecard_definition.md` → Scoring rubric
- `golden_tasks.yaml` → Baseline tasks
- `trace_schema.json` → Telemetry contract
- `runtime_state.json` → Runtime state (`last_seen_at`)

**Templates:**
- `_governance_header_template.md` → Header template for governance documents

---

## 3. Runtime Flow (Agent/Workflow)

### 3.1 HTTP Request Flow

```
HTTP POST /agents/execute
  ↓
AgentsController.execute(@Body() body)
  ↓
Orchestrator.run(ctx, input)
  ↓
[Gap Detection Preflight]
  - loadState() → Check last_seen_at
  - calculateGapMinutes() → If ≥50 min → Log TIME_GAP_DETECTED, set sessionMode="fresh"
  - saveState({ last_seen_at: nowIso })
  ↓
[Profile Loading]
  - ProfileLoader.getById(agentId) → Returns cached profile from JSON files
  ↓
[Governance V2 Preflight Validation] (if governanceValidator provided)
  - Derive workstream from tool calls
  - WorkstreamValidator.validate(workstream)
  - If blocked/conflict/clarification_required → Log and return { status: 'blocked' }
  ↓
[Commit Token Verification] (if intendedAction.reviewCommit present)
  - ReviewStore.getApprovedForCommit({ reviewId, token })
  - Verify token hash (SHA-256)
  - Verify agentId/permission match
  - Verify payload hash (SHA-256) → Detect tampering
  - ReviewStore.markTokenUsed(reviewId)
  ↓
[Review Gate Check] (if no commit token)
  - enforceReviewGate(profile, perm)
  - If review required → ReviewStore.create(req) → Return { status: 'blocked', reviewId }
  ↓
[Tool Execution Loop]
  For each toolCall in intendedAction.toolCalls:
    - ToolRouter.execute(profile, ctx, call)
      - Check tool in profile.tools
      - enforcePermission(profile, TOOL_PERMISSION_MAP[tool])
      - Handler.call(ctx, input)
      - Log result
  ↓
[Action Logging]
  - ActionLogger.append({ agentId, userId, action, input, output, ts, blocked? })
  ↓
Return { status: 'ok' | 'blocked', data }
```

### 3.2 Tool Execution Flow

```
ToolRouter.execute(profile, ctx, call)
  ↓
[Permission Check]
  - enforcePermission(profile, TOOL_PERMISSION_MAP[call.tool])
  ↓
[Handler Lookup]
  - handlers[call.tool] → ToolHandler
  ↓
[Handler Execution]
  - handler.call(ctx, call.input)
    ↓
  [Customer Data Tools] (tool.customer_data.*)
    - PolicyEngine.authorize(ctx, operation, params)
      - RBAC checks
      - Permission checks
      - ClientId scoping
      - Cross-tenant protection
      - Premium license checks
      - Returns PolicyDecision with decisionHash
    ↓
    - CapabilityRegistry.getCapabilities(clientId)
    - CapabilityRegistry.isOperationAllowed(clientId, operationId)
    - CapabilityRegistry.getSourceForOperation(clientId, operationId)
    ↓
    - PolicyEngine.sanitize(params, capability, operationId)
      - Reject raw SQL
      - Apply constraints (maxRows, allowedFields)
    ↓
    - ConnectorRegistry.getConnector(clientId, source)
    - connector.executeReadModel(operationId, sanitized.params, constraints)
    ↓
    - PolicyEngine.redact(result, capability, operationId)
      - Remove denyFields
      - Filter to allowedFields
    ↓
    - generateResultHash(redacted.data, denyFields)
    ↓
    - ActionLogger.append({ action: 'customer_data.access', decisionHash, resultHash, ... })
    ↓
    Return { ok: true, output: { data, metadata, executionMetrics } }
  ↓
  [Decision Tools] (tool.decisions.*)
    - DecisionsService.createDraft() or finalizeFromDraft()
    - ActionLogger.append({ action: 'decision.draft.created' | 'decision.finalized' })
  ↓
  [Knowledge Tools] (tool.knowledge.*)
    - KnowledgeService.search(projectId, q, sources, limit, logger, ...)
    - ActionLogger.append({ action: 'knowledge.search' })
  ↓
  [Premium Tools] (tool.marketing.*)
    - LicenseManager.hasFeatureAccess(clientId, 'marketer')
    - MarketingTool.call(ctx, input)
  ↓
Return ToolResult { ok, output?, error? }
```

### 3.3 Call Graph (High-Level)

```
main.ts
  → AppModule
    → AgentsModule
      → AgentsController
        → Orchestrator (injected)
          → ProfileLoader (static, loaded at module init)
          → ToolRouter
            → Tool Handlers (registered in agents.runtime.ts)
              → DecisionsService
              → KnowledgeService
              → PolicyEngine
              → ConnectorRegistry
              → CapabilityRegistry
              → ActionLogger (PostgresActionLogger)
          → ReviewStore (PostgresReviewStore)
          → GovernanceValidator (optional, WorkstreamValidator)
          → Clock (SystemClock)
```

---

## 4. Governance & Quality Gates

### 4.1 Enforcement Points

#### Pre-Execution Gates (Orchestrator)
1. **Gap Detection** (`orchestrator.ts:132-178`)
   - Location: `packages/agent-runtime/src/orchestrator/orchestrator.ts`
   - Trigger: Every `Orchestrator.run()` call
   - Threshold: 50 minutes (configurable via `TIME_GAP_DETECTED` env, default enabled)
   - Action: Logs `TIME_GAP_DETECTED`, sets `sessionMode="fresh"`, updates `last_seen_at`

2. **Governance V2 Workstream Validation** (`orchestrator.ts:202-286`)
   - Location: `packages/agent-runtime/src/orchestrator/orchestrator.ts`
   - Trigger: If `governanceValidator` provided
   - Validates: Owner, scope, structural model, risks, layer, autonomy tier, DoD
   - Returns: `blocked` | `conflict` | `clarification_required` | `pass`
   - Action: Blocks execution, logs reason

3. **Commit Token Verification** (`orchestrator.ts:288-403`)
   - Location: `packages/agent-runtime/src/orchestrator/orchestrator.ts`
   - Trigger: If `intendedAction.reviewCommit` present
   - Checks:
     - Review exists and approved
     - Token hash matches (SHA-256)
     - AgentId/permission match
     - Payload hash matches (tamper detection)
   - Action: Blocks if invalid, marks token used if valid

4. **Review Gate** (`orchestrator.ts:451-481`)
   - Location: `packages/agent-runtime/src/orchestrator/orchestrator.ts`
   - Trigger: If no commit token and permission requires review
   - Checks: `enforceReviewGate(profile, perm)`
   - Action: Creates review request, blocks execution, returns `reviewId`

#### Tool Execution Gates (ToolRouter)
5. **Tool Permission Check** (`tool-router.ts:29-35`)
   - Location: `packages/agent-runtime/src/execution/tool-router.ts`
   - Trigger: Every tool call
   - Checks: Tool in `profile.tools`, permission via `TOOL_PERMISSION_MAP`
   - Action: Returns `{ ok: false, error }` if denied

#### Customer Data Gates (PolicyEngine)
6. **Authorization** (`policy-engine.ts:145-269`)
   - Location: `packages/governance/src/policy/policy-engine.ts`
   - Trigger: `customer_data.*` tool calls
   - Checks:
     - RBAC (reviewer/admin/partner roles)
     - Permission (`customer_data.read`)
     - ClientId scoping
     - Cross-tenant protection
     - Premium license (for `tool.marketing.*`)
   - Action: Throws `PolicyError` if denied

7. **Sanitization** (`policy-engine.ts:274-313`)
   - Location: `packages/governance/src/policy/policy-engine.ts`
   - Trigger: Before connector execution
   - Checks:
     - Raw SQL detection
     - Constraint application (maxRows, allowedFields)
   - Action: Throws `PolicyError` if invalid

8. **Redaction** (`policy-engine.ts:318-384`)
   - Location: `packages/governance/src/policy/policy-engine.ts`
   - Trigger: After connector execution
   - Action: Removes `denyFields`, filters to `allowedFields`

#### Document Validation Gates
9. **Document Header Validation** (`document-header-validator.ts:53-139`)
   - Location: `packages/governance-v2/src/validator/document-header-validator.ts`
   - Trigger: `validateDocument(filePath)` or `validateContent(content)`
   - Checks:
     - Required fields: Version, Owner, Layer, Last Updated, DoD
     - Layer value validity
     - Timestamp format (ISO-8601)
     - Timestamp future check (max 5 min skew)
     - Timestamp integrity (`updatedAt >= createdAt`)
   - Action: Returns `{ status: 'blocked', reasons }` if invalid

10. **Workstream Validation** (`workstream-validator.ts:20-77`)
    - Location: `packages/governance-v2/src/validator/workstream-validator.ts`
    - Trigger: `validate(workstream)`
    - Checks: Owner, scope, structural model, risks, layer, autonomy tier, DoD
    - Action: Returns `{ status: 'blocked', reasons }` if invalid

#### ESLint Gates
11. **Date/setTimeout Restrictions** (`.eslintrc.json:14-24`)
    - Location: `.eslintrc.json`, `packages/governance-v2/.eslintrc.json`
    - Trigger: Build/lint time
    - Rules:
      - `no-restricted-globals`: `Date`, `setTimeout`, `setInterval`
      - `no-restricted-syntax`: `new Date()`, `Date.now()`
    - Exceptions: `**/runtime/clock.ts`, `**/clock.ts`, test files (warn only)
    - Action: Build fails if violated

### 4.2 Logging & Audit Trail

#### Action Logging
- **Interface:** `ActionLogger` (`orchestrator.ts:47-60`)
- **Implementation:** `PostgresActionLogger` (`apps/api/src/runtime/postgres-action-logger.ts`)
- **Storage:** PostgreSQL `action_logs` table
- **Fields:** `agentId`, `userId`, `projectId`, `clientId`, `action`, `input`, `output`, `ts` (ISO-8601), `blocked?`, `reason?`
- **Log Points:**
  - `agent.run` → Request received
  - `TIME_GAP_DETECTED` → Gap detected
  - `agent.blocked.governance_validation` → Governance blocked
  - `agent.blocked.governance_conflict` → Conflict detected
  - `agent.blocked.clarification_required` → Clarification needed
  - `agent.blocked.invalid_commit_token` → Invalid token
  - `agent.blocked.commit_mismatch` → Agent/permission mismatch
  - `agent.blocked.payload_tamper` → Payload tampered
  - `agent.blocked.review_required` → Review needed
  - `escalation` → Escalation events
  - `decision.draft.created` → Draft created
  - `decision.finalized` → Decision finalized
  - `agent.executed` → Execution completed
  - `agent.executed.draft_only` → Draft-only execution
  - `agent.executed.commit` → Commit execution
  - `customer_data.access` → Customer data access (with `decisionHash`, `resultHash`)
  - `policy.violation` → Policy violation

#### Decision History
- **Store:** `DecisionHistoryStore` (`packages/governance-v2/src/history/decision-history-store.ts`)
- **Storage:** `ops/agent-team/team_decisions.jsonl` (JSONL format, append-only)
- **Fields:** `Decision` type (id, owner, layer, timestamp, rationale, implications, etc.)
- **Operations:** `append()`, `list(filter?)`, `getLatestByLayer()`, `getByOwner()`, `getByScopePathPrefix()`

#### Review Store
- **Store:** `PostgresReviewStore` (`apps/api/src/runtime/postgres-review-store.ts`)
- **Storage:** PostgreSQL `review_requests` table
- **Fields:** `id`, `project_id`, `client_id`, `user_id`, `agent_id`, `permission`, `payload_json`, `status`, `reviewer_roles`, `created_at`, `commit_token_hash`, `commit_token_used`
- **Operations:** `create()`, `getApprovedForCommit()`, `markTokenUsed()`

#### Runtime State
- **Store:** `RuntimeStateStore` (`packages/governance-v2/src/runtime/runtime-state-store.ts`)
- **Storage:** `ops/agent-team/runtime_state.json` (file-based, atomic write)
- **Fields:** `last_seen_at` (ISO-8601 UTC)
- **Operations:** `loadState()`, `saveState(state)`

### 4.3 Approval Rules

**Location:** `ops/agent-team/policy_approval_rules.yaml`

**Rules:**
1. **large_change** → If `files_changed_gt: 20` OR `loc_changed_gt: 500` → Requires 1 approval from `reviewer_claude`
2. **destructive_ops** → If operations include `delete_file`, `git_reset`, `git_rebase_interactive`, `force_push` → Requires 2 approvals from `teamlead_orchestrator` + `reviewer_claude`, confirmation required
3. **ci_or_build** → If touches `.github/**`, `**/ci/**`, `package.json`, `pnpm-lock.yaml`, `turbo.json` → Requires 1 approval from `reviewer_claude`
4. **prompt_or_agent_core** → If touches `**/prompts/**`, `**/agents/**`, `**/system_prompt/**`, `ops/agent-team/**` → Requires 1 approval from `reviewer_claude`
5. **prod_config** → If touches `vercel.json`, `.env*`, `**/config/**` → Requires 2 approvals from `teamlead_orchestrator` + `reviewer_claude`, denies `.env`, `.env.local`

**Enforcement:** Currently not enforced in code (YAML parser returns empty rules). Mentioned in `AGENTS.md` as manual check.

### 4.4 Autonomy Ladder

**Location:** `ops/agent-team/autonomy_policy.md`, `packages/governance-v2/src/policy/policy-engine.ts:103-108`

**Tiers:**
1. **read-only** → No write operations
2. **draft-only** → Can create drafts, requires review for finalization
3. **execute-with-approval** → Can execute after review approval
4. **autonomous-with-limits** → Can execute autonomously within limits

**Defaults:**
- `repo_default_tier: 2` (draft-only)
- `implementer_default_tier: 3` (execute-with-approval)

**Hard Rules:**
- `no_secrets` → Never read/write secrets or `.env` contents
- `confirm_destructive` → Ask for explicit confirmation before destructive actions
- `policy_gate_required` → If approval rules match, merge requires reviewer approval

**Enforcement:** `AutonomyGuard` (`packages/governance-v2/src/policy/autonomy-guard.ts`) checks hard rules, but autonomy tier enforcement is not fully implemented in orchestrator.

---

## 5. Context / Knowledge

### 5.1 Knowledge Retrieval

**Interface:** `KnowledgeService` (`apps/api/src/modules/knowledge/knowledge.service.ts`)

**Search Function:**
- `search(projectId, q, sources, limit, logger, agentId, userId, clientId)`
- **Sources:** `["decisions", "reviews", "logs"]` (allowlist)
- **Limit:** Max 25, default 10
- **Storage:** PostgreSQL queries across `decisions`, `reviews`, `action_logs` tables
- **Audit:** Requires `ActionLogger` (audit requirement)

**Implementation Status:** Minimal. `packages/knowledge/src/retrieval/search.ts` returns mock data.

### 5.2 RAG / Embeddings

**Components:**
- `packages/knowledge/src/embeddings/index.ts` → Embedding interface (not implemented)
- `packages/knowledge/src/ingestion/chunker.ts` → Document chunking (not implemented)
- `packages/knowledge/src/ingestion/parser.ts` → Document parsing (not implemented)
- `packages/knowledge/src/ingestion/upload.ts` → Upload function (returns mock ID)

**Status:** Not implemented. Infrastructure exists but returns mock data.

### 5.3 Context Injection

**Context Sources:**
1. **Agent Profile** → Loaded from JSON files at startup, cached in-memory
2. **Project Context** → From PostgreSQL `projects` table (via `ProjectsService`)
3. **Client Context** → From request body or PostgreSQL
4. **User Context** → From request body
5. **Review State** → From PostgreSQL `review_requests` table
6. **Decision History** → From `team_decisions.jsonl` (via `DecisionHistoryStore`)
7. **Action Logs** → From PostgreSQL `action_logs` table

**Context Assembly:**
- `ToolContext` type: `{ projectId?, clientId?, userId }`
- Passed to all tool handlers
- Agent profile loaded via `ProfileLoader.getById(agentId)`

**Size Controls:** None identified. Knowledge search has `limit` parameter (max 25).

---

## 6. Time/Clock & Timestamps

### 6.1 Clock Abstraction

**Interface:** `Clock` (`packages/governance-v2/src/runtime/clock.ts:8-24`)
- `now(): Date` → Returns current UTC time
- `parseISO(iso: string): Date` → Parses ISO-8601 timestamp
- `setTimeout(cb: () => void, ms: number): ReturnType<typeof setTimeout>` → Schedules callback

**Implementations:**
- `SystemClock` → Real system time, uses `new Date()`, `setTimeout()`
- `FakeClock` → Test clock with `set(date)`, `advance(ms)`, pending timeouts queue

**Usage:** All time operations must use `Clock` interface. ESLint enforces this.

### 6.2 Timestamp Rules

**Source of Truth:** UTC ISO-8601 via `Date.toISOString()`

**Format:** ISO-8601 (e.g., `2026-02-18T10:30:00.000Z`)

**Validation:**
- **Max Skew:** 5 minutes (configurable via `LAST_UPDATED_MAX_SKEW_MIN` env, default 5)
- **Location:** `packages/governance-v2/src/validator/document-header-validator.ts:295-312`
- **Check:** `updatedAt` must not be >5 minutes in future

**Integrity Rules:**
- **Rule:** `updatedAt >= createdAt` (always)
- **Location:** `packages/shared/src/utils/timestamp-integrity.ts:59-136`
- **Self-Healing:** If `updatedAt < createdAt`, sets `updatedAt = createdAt`
- **Monitoring:** Correction events emitted via `TimestampCorrectionCallback`

**Gap Detection:**
- **Threshold:** 50 minutes (configurable via `TIME_GAP_DETECTION` env, default enabled)
- **Location:** `packages/agent-runtime/src/orchestrator/orchestrator.ts:132-178`
- **Check:** `calculateGapMinutes(last_seen_at, nowIso) >= 50`
- **Action:** Logs `TIME_GAP_DETECTED`, sets `sessionMode="fresh"`

### 6.3 ESLint Restrictions

**Location:** `.eslintrc.json:14-24`, `packages/governance-v2/.eslintrc.json:11-25`

**Rules:**
- `no-restricted-globals`: `Date`, `setTimeout`, `setInterval` → Error
- `no-restricted-syntax`: `new Date()`, `Date.now()` → Error

**Exceptions:**
- `**/runtime/clock.ts`, `**/clock.ts` → Rules disabled
- Test files → Rules set to `warn` only

**Enforcement:** Build fails if violated.

### 6.4 Timestamp Utilities

**Location:** `packages/governance-v2/src/runtime/time-utils.ts`

**Functions:**
- `formatBerlin(dt)` → Display-only formatting (Europe/Berlin timezone, `de-DE` locale)
- `calculateGapMinutes(lastSeenIso, nowIso, clock?)` → Calculates gap in minutes

**Location:** `packages/shared/src/utils/timestamp-integrity.ts`

**Functions:**
- `validateTimestampIntegrity(createdAt, updatedAt, clock?, entity?, sourceLayer?)` → Validates integrity, returns corrections
- `enforceTimestampIntegrity(createdAt, updatedAt)` → Enforces integrity, returns corrected pair
- `generateCreationTimestamps(clock)` → Generates `{ createdAt: now, updatedAt: now }`
- `generateUpdateTimestamps(originalCreatedAt, clock)` → Generates `{ createdAt: original, updatedAt: now }`
- `registerTimestampCorrectionCallback(callback)` → Registers monitoring callback

### 6.5 Time Policy Summary

**Policy:**
1. All time operations use `Clock` interface (enforced by ESLint)
2. Source of truth: UTC ISO-8601 via `Date.toISOString()`
3. Display formatting: Europe/Berlin timezone (display-only, not source of truth)
4. Timestamp validation: Max 5-minute skew for `updatedAt`
5. Timestamp integrity: `updatedAt >= createdAt` (self-healing)
6. Gap detection: 50-minute threshold for session continuity
7. Deterministic hashing: Decision hashes exclude timestamps for replay-friendliness

**Enforcement Points:**
- ESLint (build time)
- `DocumentHeaderValidator` (runtime)
- `Orchestrator` gap detection (runtime)
- `TimestampIntegrity` utilities (runtime)

---

## 7. "Skills-like" Mechanisms Found

### 7.1 Agent Profiles

**Name:** Agent Profiles  
**Location:** `packages/agent-runtime/src/profiles/*.json`, `packages/agent-runtime/src/profiles/profile-loader.ts`  
**What it does:** Defines agent capabilities, permissions, tools, escalation rules, memory scopes, review policies  
**How it loads:** `ProfileLoader.loadAll()` → Reads JSON files from filesystem, validates with Zod schema, caches in-memory Map  
**Inputs:** JSON files (`knowledge.json`, `project.json`, `documentation.json`, `junior.json`, `governance.json`)  
**Outputs:** `AgentProfile` objects (id, name, role, objectives, permissions, tools, escalationRules, memoryScopes, reviewPolicy)  
**Permissions/Gates:** Profile defines `permissions[]` and `tools[]`, enforced by `ToolRouter` and `enforcePermission()`  
**Gaps/Risks:**
- Static loading (no hot-reload)
- No versioning
- No discovery mechanism
- No lazy loading
- No metadata beyond profile fields

### 7.2 Tool Handlers

**Name:** Tool Handlers  
**Location:** `apps/api/src/modules/agents/agents.runtime.ts:33-653`  
**What it does:** Implements tool execution logic (decisions, knowledge, workflow, docs, reviews, customer_data, premium tools)  
**How it loads:** Registered in `toolHandlers()` function, passed to `ToolRouter` constructor  
**Inputs:** `ToolContext`, `input` (unknown)  
**Outputs:** `ToolResult { ok, output?, error? }`  
**Permissions/Gates:** Tool must be in `profile.tools[]`, permission checked via `TOOL_PERMISSION_MAP`, customer data tools go through `PolicyEngine`  
**Gaps/Risks:**
- Hardcoded registry (no dynamic discovery)
- No versioning
- Premium tools loaded via `require()` (dynamic, but fragile)
- No metadata beyond tool name

### 7.3 Capability Maps

**Name:** Capability Maps  
**Location:** `packages/customer-data/src/capability.schema.ts`, `packages/customer-data/src/registry.ts`  
**What it does:** Defines allowed operations, field allowlists/denylists, source mappings per clientId  
**How it loads:** Registered via `CapabilityRegistry.register(clientId, capabilities)` (in-memory Map)  
**Inputs:** `CapabilityMap` JSON structure  
**Outputs:** Operation schemas, source mappings, allowlist checks  
**Permissions/Gates:** `CapabilityRegistry.isOperationAllowed(clientId, operationId)`, enforced by `PolicyEngine`  
**Gaps/Risks:**
- In-memory only (no persistence)
- No versioning
- No discovery mechanism
- Client-scoped (not agent-scoped)

### 7.4 Connector Registry

**Name:** Connector Registry  
**Location:** `packages/customer-data/src/registry.ts`, `packages/customer-data/src/connector.ts`  
**What it does:** Manages connector instances per clientId and source, routes read operations to appropriate data source  
**How it loads:** Registered via `MultiSourceConnectorRegistry.register(clientId, source, connector)` (in-memory Map)  
**Inputs:** `clientId`, `source`, `CustomerConnector` instance  
**Outputs:** Connector instances for execution  
**Permissions/Gates:** Connector access controlled by `CapabilityRegistry.getSourceForOperation()`  
**Gaps/Risks:**
- In-memory only (no persistence)
- No versioning
- No discovery mechanism
- Client-scoped (not agent-scoped)

### 7.5 Workflow Definitions

**Name:** Workflow Definitions  
**Location:** `packages/workflow/src/definitions/*.yaml` (`default-phases.yaml`, `consulting-project.yaml`)  
**What it does:** Defines project phases, transitions, validation rules  
**How it loads:** YAML files loaded by `PhaseRunner` (not shown in code, inferred from usage)  
**Inputs:** YAML workflow definitions  
**Outputs:** `WorkflowDefinition` objects with phases  
**Permissions/Gates:** None identified  
**Gaps/Risks:**
- Static loading (no hot-reload)
- No versioning
- No discovery mechanism
- Minimal implementation

### 7.6 Premium Modules

**Name:** Premium Modules  
**Location:** `packages/premium/marketer/`  
**What it does:** Provides premium features (marketing tools, KPI parsing)  
**How it loads:** Dynamically loaded via `require()` in `agents.runtime.ts:48-61` (try-catch, optional)  
**Inputs:** Module path (`@premium/marketer/tools/marketing-tool`)  
**Outputs:** Tool handlers registered in `premiumTools` object  
**Permissions/Gates:** `LicenseManager.hasFeatureAccess(clientId, 'marketer')`  
**Gaps/Risks:**
- Fragile dynamic loading (no type safety)
- No versioning
- No discovery mechanism
- Core-extension separation (good), but no formal contract

### 7.7 Governance Validators

**Name:** Governance Validators  
**Location:** `packages/governance-v2/src/validator/*.ts`  
**What it does:** Validates workstreams, document headers, timestamp integrity  
**How it loads:** Instantiated in code, passed to `Orchestrator` (optional)  
**Inputs:** Workstream objects, file paths, document content  
**Outputs:** `ValidationResult { status, reasons?, requiresReview? }`  
**Permissions/Gates:** None (validation only)  
**Gaps/Risks:**
- Not always enabled (optional in orchestrator)
- No discovery mechanism
- No versioning

### 7.8 Inventory Summary

| Name | Location | Loading | Versioning | Discovery | Permissions | Gaps |
|------|----------|---------|-----------|-----------|------------|------|
| Agent Profiles | `packages/agent-runtime/src/profiles/*.json` | Static (startup) | ❌ | ❌ | Profile-based | No hot-reload, no versioning |
| Tool Handlers | `apps/api/src/modules/agents/agents.runtime.ts` | Hardcoded registry | ❌ | ❌ | ToolRouter + PolicyEngine | No dynamic discovery |
| Capability Maps | `packages/customer-data/src/registry.ts` | In-memory registration | ❌ | ❌ | CapabilityRegistry | No persistence, client-scoped |
| Connector Registry | `packages/customer-data/src/registry.ts` | In-memory registration | ❌ | ❌ | CapabilityRegistry | No persistence, client-scoped |
| Workflow Definitions | `packages/workflow/src/definitions/*.yaml` | YAML loading (inferred) | ❌ | ❌ | None | Minimal implementation |
| Premium Modules | `packages/premium/marketer/` | Dynamic `require()` | ❌ | ❌ | LicenseManager | Fragile, no type safety |
| Governance Validators | `packages/governance-v2/src/validator/*.ts` | Code instantiation | ❌ | ❌ | None | Optional, not always enabled |

**Common Patterns:**
- Static/hardcoded loading (no dynamic discovery)
- No versioning
- No metadata beyond basic fields
- In-memory registries (no persistence)
- Client-scoped (not agent-scoped) for customer data

---

## 8. Gaps (Factual Gaps Only)

### 8.1 Missing Implementation

1. **Knowledge RAG/Embeddings** → Infrastructure exists (`packages/knowledge/src/embeddings/`, `chunker.ts`, `parser.ts`) but returns mock data
2. **Workflow Phase Runner** → YAML definitions exist but loading/execution logic is minimal
3. **Policy Approval Rules Enforcement** → YAML parser returns empty rules, not enforced in code
4. **Autonomy Tier Enforcement** → `AutonomyGuard` exists but tier enforcement not fully integrated in orchestrator
5. **Governance V2 Integration** → `governanceValidator` is optional in orchestrator, not always enabled

### 8.2 Missing Documentation

1. **Tool Handler Contracts** → No formal interface/documentation for tool handler implementation
2. **Connector Interface** → `CustomerConnector` interface exists but no usage examples
3. **Capability Map Schema** → Schema exists but no documentation/examples
4. **Workflow Definition Schema** → YAML structure not documented

### 8.3 Missing Tests

1. **Orchestrator Integration Tests** → Unit tests exist but no E2E tests for full flow
2. **Tool Handler Tests** → No tests for individual tool handlers
3. **Governance V2 Integration Tests** → Validators tested but not orchestrator integration
4. **Customer Data Plane Tests** → Test script exists (`scripts/test-governance-integrity.ts`) but not in test suite

### 8.4 Missing Contracts

1. **Tool Handler Interface** → `ToolHandler` interface exists but no versioning/metadata contract
2. **Connector Interface** → `CustomerConnector` interface exists but no versioning/metadata contract
3. **Agent Profile Schema** → Zod schema exists but no versioning field
4. **Workstream Schema** → Validated in code but no formal JSON Schema

### 8.5 Missing Observability

1. **Timestamp Correction Monitoring** → Callback exists but no aggregation/dashboard
2. **Gap Detection Metrics** → Logged but no metrics/dashboard
3. **Policy Violation Metrics** → Logged but no aggregation
4. **Tool Execution Metrics** → No latency/error rate tracking

---

## 9. Evidence Appendix

### Top 20 Most Important Files

1. **`packages/agent-runtime/src/orchestrator/orchestrator.ts`** → Core orchestration logic, gap detection, governance validation, commit token verification, review gates
2. **`apps/api/src/modules/agents/agents.runtime.ts`** → Tool handler registry, orchestrator factory, customer data tool implementations
3. **`packages/agent-runtime/src/execution/tool-router.ts`** → Tool routing, permission enforcement
4. **`packages/governance/src/policy/policy-engine.ts`** → Authorization, sanitization, redaction for customer data
5. **`packages/governance-v2/src/validator/workstream-validator.ts`** → Workstream validation logic
6. **`packages/governance-v2/src/validator/document-header-validator.ts`** → Document header validation, timestamp integrity
7. **`packages/governance-v2/src/runtime/clock.ts`** → Clock abstraction interface and implementations
8. **`packages/shared/src/utils/timestamp-integrity.ts`** → Timestamp integrity validation and self-healing
9. **`packages/agent-runtime/src/profiles/profile-loader.ts`** → Agent profile loading and validation
10. **`packages/customer-data/src/registry.ts`** → Connector and capability registries
11. **`apps/api/src/runtime/postgres-review-store.ts`** → Review store with commit token verification
12. **`apps/api/src/runtime/postgres-action-logger.ts`** → Action logging implementation
13. **`packages/governance-v2/src/runtime/runtime-state-store.ts`** → Runtime state persistence
14. **`packages/governance-v2/src/history/decision-history-store.ts`** → Decision history (JSONL)
15. **`packages/governance-v2/src/policy/autonomy-guard.ts`** → Autonomy policy enforcement
16. **`packages/governance-v2/src/scorecard/scorecard-engine.ts`** → Governance scorecard calculation
17. **`apps/api/src/modules/agents/agents.controller.ts`** → HTTP endpoint for agent execution
18. **`ops/agent-team/policy_approval_rules.yaml`** → Approval rules definition
19. **`ops/agent-team/autonomy_policy.md`** → Autonomy ladder definition
20. **`.eslintrc.json`** → ESLint rules enforcing Clock usage

---

## NEXT-STEP INPUTS

### Facts That Will Constrain Skill Architecture

1. **Policy Gates:** `PolicyEngine` enforces authorization, sanitization, redaction. Skills must integrate with this.
2. **Tool Mediation:** `ToolRouter` mediates all tool calls, enforces permissions via `TOOL_PERMISSION_MAP`. Skills must register tools here.
3. **Context Builder Shape:** Context assembled from agent profile, project/client/user context, review state, decision history, action logs. Skills need access to this context.
4. **Clock Abstraction:** All time operations use `Clock` interface (enforced by ESLint). Skills must use `Clock` for timestamps.
5. **Governance V2:** Workstream validation, document header validation, timestamp integrity. Skills may need to generate workstreams.
6. **Customer Data Plane:** Multi-source connector registry, capability registry, client-scoped. Skills accessing customer data must go through this.
7. **Review System:** Commit token verification, SHA-256 hashing, payload tamper detection. Skills requiring review must integrate with this.
8. **Profile System:** Agent profiles loaded from JSON files, cached in-memory. Skills may need to extend profile schema.
9. **Action Logging:** All actions logged to PostgreSQL with `decisionHash`, `resultHash`. Skills must log actions.
10. **Gap Detection:** 50-minute threshold for session continuity. Skills may need to handle gap events.

### Unknowns to Verify in Step 2

1. **Skill Discovery Mechanism:** How will skills be discovered? File system scan? Registry? Package manager?
2. **Skill Versioning:** How will skill versions be managed? Semantic versioning? Compatibility checks?
3. **Skill Metadata:** What metadata is needed beyond current profile/tool fields? Dependencies? Permissions? Lifecycle hooks?
4. **Skill Loading:** Lazy loading? Hot reload? Static loading at startup?
5. **Skill Permissions:** How will skill permissions integrate with existing `TOOL_PERMISSION_MAP`? Agent-scoped? Skill-scoped?
6. **Skill Context:** How will skills access context? Dependency injection? Context object?
7. **Skill Execution:** How will skills execute? Subprocess? In-process? Sandboxed?
8. **Skill Dependencies:** How will skill dependencies be managed? Package manager? Registry?
9. **Skill Testing:** How will skills be tested? Unit tests? Integration tests? E2E tests?
10. **Skill Observability:** How will skill execution be observed? Metrics? Logs? Traces?

---

**End of Report**

