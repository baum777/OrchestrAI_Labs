# Agent Data Flow Audit Report

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** strategy  
**Last Updated:** 2026-02-13T18:00:00Z  
**Definition of Done:**
- [x] All entry points mapped
- [x] Agent data acquisition analyzed
- [x] Data transformations documented
- [x] Persistence points identified
- [x] Governance traceability verified
- [x] Risk assessment completed
- [x] Gaps identified
- [x] Recommendations provided

---

## 1. System Entry Map

### 1.1 API Endpoints

| Endpoint | Method | Controller | Purpose | Data Source |
|----------|--------|------------|---------|-------------|
| `/agents/execute` | POST | `AgentsController` | Agent execution entry point | Request body (userMessage, intendedAction) |
| `/projects/:projectId/decisions/draft` | POST | `DecisionsController` | Create decision draft | Request body (DTO validated) |
| `/projects/:projectId/decisions` | GET | `DecisionsController` | List decisions by project | PostgreSQL (decisions table) |
| `/decisions/:id` | GET | `DecisionsController` | Get decision by ID | PostgreSQL (decisions table) |
| `/knowledge/search` | GET | `KnowledgeController` | Search knowledge base | PostgreSQL (decisions, reviews, logs) |
| `/reviews` | GET | `ReviewsController` | List reviews | PostgreSQL (review_requests) |
| `/reviews/:id/approve` | POST | `ReviewsController` | Approve review + issue commit token | PostgreSQL (review_requests, review_actions) |
| `/reviews/:id/reject` | POST | `ReviewsController` | Reject review | PostgreSQL (review_requests, review_actions) |
| `/projects/:projectId/context` | GET | `ProjectsContextController` | Get project context | PostgreSQL (projects) + In-Memory (ProjectPhaseStore) |
| `/projects/:projectId/phase` | PUT | `ProjectsContextController` | Update project phase | In-Memory (ProjectPhaseStore) + Audit Log |
| `/monitoring/drift` | GET | `MonitoringController` | Get drift metrics | PostgreSQL (aggregated queries) |
| `/logs` | GET | `LogsController` | List action logs | PostgreSQL (action_logs) |
| `/health` | GET | `HealthController` | Health check | None (static) |

### 1.2 UI → API Flows

**Current State:** Minimal UI implementation
- `apps/web/src/app/page.tsx`: Static placeholder page
- `apps/web/src/lib/api-client.ts`: Generic fetch wrapper (uses `NEXT_PUBLIC_API_URL` env var)
- **No active UI flows identified** - UI is not yet connected to agent execution

**Potential Flow (when implemented):**
```
UI Component → api-client.ts → API Endpoint → Service → Database
```

### 1.3 External Webhooks

**Status:** None identified
- No webhook handlers found in codebase
- No webhook registration mechanisms
- No external event triggers

### 1.4 Scheduled Triggers

**Status:** None identified
- No cron jobs
- No scheduled tasks
- No background workers
- No periodic triggers

### 1.5 Entry Point Summary Table

| Trigger | Service | Agent | Workflow | Notes |
|---------|---------|-------|----------|-------|
| `POST /agents/execute` | `Orchestrator.run()` | Selected by `agentId` in request | Tool execution via `ToolRouter` | Primary agent entry point |
| `POST /projects/:projectId/decisions/draft` | `DecisionsService.createDraft()` | N/A (direct API) | N/A | Bypass agent path (REST-only) |
| `POST /reviews/:id/approve` | `ReviewsController.approve()` | N/A (human reviewer) | Generates commit token | Human-in-the-loop approval |

---

## 2. Agent Input Sources

### 2.1 Agent Runtime Input Acquisition

**Primary Entry:** `POST /agents/execute`

**Input Structure:**
```typescript
{
  agentId: string;           // Selects agent profile
  userId: string;            // User context
  projectId?: string;        // Project context
  clientId?: string;         // Client context
  userMessage: string;        // User input text
  intendedAction?: {          // Pre-structured action
    permission: Permission;
    toolCalls: ToolCall[];
    reviewCommit?: {          // Commit token for finalization
      reviewId: string;
      commitToken: string;
    };
  };
}
```

**Data Flow:**
1. Request received by `AgentsController.execute()`
2. Context extracted: `{ userId, projectId, clientId }`
3. Passed to `Orchestrator.run(ctx, input)`
4. Agent profile loaded via `ProfileLoader.getById(agentId)`
5. Profile loaded from filesystem: `packages/agent-runtime/src/profiles/*.json`

### 2.2 Context Data Sources

| Context Type | Source | Sync/Async | Deterministisch? |
|-------------|--------|------------|------------------|
| Agent Profile | Filesystem (`profiles/*.json`) | Sync (cached at startup) | ✅ Yes (static JSON files) |
| Project Context | PostgreSQL (`projects` table) | Async (DB query) | ✅ Yes (deterministic queries) |
| Client Context | Request body / PostgreSQL | Async (if DB lookup) | ⚠️ Partial (depends on request) |
| User Context | Request body | Sync (from request) | ⚠️ Partial (user-provided) |
| Review State | PostgreSQL (`review_requests`) | Async (DB query) | ✅ Yes (deterministic) |
| Decision History | PostgreSQL (`decisions`) | Async (DB query) | ✅ Yes (deterministic) |
| Action Logs | PostgreSQL (`action_logs`) | Async (DB query) | ✅ Yes (append-only) |

### 2.3 External Adapters

**Status:** None identified
- No external API adapters
- No third-party integrations
- No data import/export mechanisms
- No webhook receivers

### 2.4 ENV / Config Dependencies

| Dependency | Source | Usage | Required? |
|------------|--------|-------|-----------|
| `DATABASE_URL` | Environment variable | PostgreSQL connection | ✅ Yes (runtime) |
| `NEXT_PUBLIC_API_URL` | Environment variable | Web app API base URL | ⚠️ Optional (defaults to localhost:4000) |
| Profile files path | Hardcoded: `packages/agent-runtime/src/profiles` | Agent profile loading | ✅ Yes (build-time) |

**Risk:** Profile path is hardcoded relative to `process.cwd()`, may break in different execution contexts.

### 2.5 Agent Data Acquisition Summary

| Agent | Data Source | Sync/Async | Deterministisch? | Notes |
|-------|-------------|------------|-------------------|-------|
| All agents | Request body (`userMessage`, `intendedAction`) | Sync | ⚠️ Partial | User-provided input |
| All agents | Agent Profile (JSON files) | Sync (cached) | ✅ Yes | Static configuration |
| All agents | Tool Context (`projectId`, `clientId`, `userId`) | Sync | ⚠️ Partial | From request context |
| Knowledge Agent | `tool.knowledge.search` → PostgreSQL | Async | ✅ Yes | Deterministic queries |
| Decision Agent | `tool.decisions.createDraft` → PostgreSQL | Async | ✅ Yes | Deterministic writes |
| Decision Agent | `tool.decisions.finalizeFromDraft` → PostgreSQL | Async | ✅ Yes | With governance checks |

---

## 3. Data Flow Graph (Logical Description)

### 3.1 Primary Agent Execution Flow

```
[User/UI] 
  ↓ POST /agents/execute
[AgentsController]
  ↓ Extract context {userId, projectId, clientId}
[Orchestrator.run()]
  ↓ Load agent profile (ProfileLoader)
[Agent Profile] (from filesystem JSON)
  ↓ Validate intendedAction
[Governance Preflight] (optional GovernanceValidator)
  ↓ Check reviewCommit (if present)
[ReviewStore.getApprovedForCommit()]
  ↓ Validate commit token + payload hash
[ToolRouter.execute()]
  ↓ Route to tool handler
[Tool Handler] (e.g., tool.decisions.createDraft)
  ↓ Execute tool logic
[Service Layer] (e.g., DecisionsService)
  ↓ Database operation
[PostgreSQL]
  ↓ Return result
[ActionLogger.append()] (audit log)
  ↓ Return to orchestrator
[Orchestrator] (log execution result)
  ↓ Return to controller
[Response to User]
```

### 3.2 Decision Finalization Flow (Governance-Protected)

```
[Agent with reviewCommit]
  ↓ POST /agents/execute (with reviewCommit)
[Orchestrator.run()]
  ↓ Validate commit token
[ReviewStore.getApprovedForCommit()]
  ↓ Verify: status=approved, token valid, not used
[Orchestrator] (payload hash validation)
  ↓ SHA256(verify.payload) === SHA256(current payload)
[ToolRouter.execute(tool.decisions.finalizeFromDraft)]
  ↓ DecisionsService.finalizeFromDraft()
[Service Checks:]
  - Decision status === 'draft'
  - Review exists + approved
  - Review.projectId === Decision.projectId
[ActionLogger.append()] (intent log - blocks on failure)
[PostgreSQL UPDATE] (atomar: WHERE status='draft')
[ActionLogger.append()] (finalized log - blocks on failure)
[Return DecisionFinal]
```

### 3.3 Knowledge Search Flow

```
[Agent calls tool.knowledge.search]
  ↓ ToolRouter.execute()
[KnowledgeService.search()]
  ↓ Validate ActionLogger present (audit requirement)
[PostgreSQL Queries:]
  - Search decisions (ILIKE on multiple fields)
  - Search reviews (ILIKE on status, comments)
  - Search logs (ILIKE on action, reason)
[Result aggregation & sorting]
[ActionLogger.append()] (audit log - blocks on failure)
[Return SearchResponse]
```

### 3.4 Review Approval Flow

```
[Human Reviewer]
  ↓ POST /reviews/:id/approve
[ReviewsController.approve()]
  ↓ Generate commit token (crypto.randomBytes)
[PostgreSQL Transaction:]
  - UPDATE review_requests (status='approved', commit_token_hash=SHA256(token))
  - INSERT review_actions (action='approve')
[Return {reviewId, commitToken}]
[Agent uses commitToken in reviewCommit]
```

### 3.5 Data Flow Characteristics

| Flow | Deterministic? | Traceable? | Auditierbar? | Notes |
|------|----------------|------------|--------------|-------|
| Agent Execution | ⚠️ Partial | ✅ Yes | ✅ Yes | User input non-deterministic, but execution is logged |
| Decision Creation | ✅ Yes | ✅ Yes | ✅ Yes | All writes logged |
| Decision Finalization | ✅ Yes | ✅ Yes | ✅ Yes | Governance-protected, double-logged |
| Knowledge Search | ✅ Yes | ✅ Yes | ✅ Yes | Audit log required, blocks on failure |
| Review Approval | ⚠️ Partial | ✅ Yes | ✅ Yes | Human decision non-deterministic, but logged |
| Project Phase Update | ✅ Yes | ✅ Yes | ✅ Yes | Audit log required, rollback on failure |

---

## 4. Transformation Points

### 4.1 Parsing Transformations

| Location | Input | Output | File Reference |
|----------|-------|--------|----------------|
| `ProfileLoader.loadAll()` | JSON files (filesystem) | `AgentProfile[]` (validated) | `packages/agent-runtime/src/profiles/profile-loader.ts:46-62` |
| `AgentsController.execute()` | HTTP request body | `ExecuteDto` (TypeScript) | `apps/api/src/modules/agents/agents.controller.ts:22-28` |
| `DecisionsController.createDraft()` | HTTP request body | `CreateDecisionDraftDto` (validated) | `apps/api/src/modules/decisions/decisions.controller.ts:17-18` |
| `PostgresActionLogger.append()` | TypeScript object | JSONB (PostgreSQL) | `apps/api/src/runtime/postgres-action-logger.ts:22-41` |
| `DecisionsService.mapRow()` | PostgreSQL row (snake_case) | TypeScript object (camelCase) | `apps/api/src/modules/decisions/decisions.service.ts:57-86` |

### 4.2 Enrichment Transformations

| Location | Input | Enrichment | Output | File Reference |
|----------|-------|------------|--------|----------------|
| `Orchestrator.run()` | `intendedAction` | Adds `reviewId` to `tool.decisions.finalizeFromDraft` input | Enriched `ToolCall` | `packages/agent-runtime/src/orchestrator/orchestrator.ts:340-349` |
| `KnowledgeService.search()` | Raw DB rows | Generates snippets with query highlighting | `SearchResult[]` with snippets | `apps/api/src/modules/knowledge/knowledge.service.ts:265-282` |
| `ProjectsService.getContext()` | Project ID | Adds phase hints (focus, reviewChecklist, commonRisks) | `ProjectContext` | `apps/api/src/modules/projects/projects.service.ts:97-154` |

### 4.3 Memory Injection

**Status:** Not implemented
- No memory injection mechanisms found
- No context memory persistence
- No conversation history storage
- Agent profiles define `memoryScopes` but not used in runtime

**Gap:** Memory scopes defined in agent profiles (`packages/agent-runtime/src/profiles/*.json`) but no runtime implementation.

### 4.4 Prompt Construction

**Status:** Not implemented
- No prompt construction logic found
- No LLM integration
- Agents are abstract (`BaseAgent`) but no concrete implementations use prompts
- `AgentExecutor` exists but not used in current flow

**Gap:** Agent execution path uses `Orchestrator` → `ToolRouter` directly, bypassing `AgentExecutor` and `BaseAgent.handle()`.

### 4.5 Decision Structuring

| Location | Input | Transformation | Output | File Reference |
|----------|-------|----------------|--------|----------------|
| `DecisionsService.createDraft()` | `CreateDecisionDraftInput` | Validates arrays, sets defaults, generates ID | `DecisionDraft` | `apps/api/src/modules/decisions/decisions.service.ts:88-142` |
| `DecisionsService.finalizeFromDraft()` | `DecisionDraft` + `reviewId` | Updates status, validates governance | `DecisionFinal` | `apps/api/src/modules/decisions/decisions.service.ts:179-351` |
| `Orchestrator.sha256Json()` | Tool call payload | SHA256 hash for tamper detection | Hash string | `packages/agent-runtime/src/orchestrator/orchestrator.ts:86-88` |

### 4.6 Transformation Summary

| Transformation Type | Count | Deterministic? | Traceable? |
|---------------------|-------|----------------|------------|
| Parsing | 5 | ✅ Yes | ⚠️ Partial (some logged) |
| Enrichment | 3 | ✅ Yes | ⚠️ Partial (some logged) |
| Memory Injection | 0 | N/A | N/A |
| Prompt Construction | 0 | N/A | N/A |
| Decision Structuring | 3 | ✅ Yes | ✅ Yes (all logged) |

---

## 5. Persistence Map

### 5.1 Database Tables

| Table | Purpose | Access Path | Write Operations | Read Operations |
|-------|---------|-------------|------------------|-----------------|
| `projects` | Project metadata | `ProjectsService`, `DecisionsService`, `KnowledgeService` | None (read-only) | ✅ Yes |
| `decisions` | Decision drafts and finals | `DecisionsService` | `createDraft()`, `finalizeFromDraft()` | `getById()`, `listByProject()` |
| `review_requests` | Review workflow state | `PostgresReviewStore`, `ReviewsController` | `create()`, `approve()`, `reject()`, `markTokenUsed()` | `getApprovedForCommit()`, `list()` |
| `review_actions` | Review action history | `ReviewsController` | `approve()`, `reject()` | Via `review_requests` JOIN |
| `action_logs` | Audit trail (append-only) | `PostgresActionLogger`, `KnowledgeService`, `MonitoringService` | `append()` | `KnowledgeService.searchLogs()`, `MonitoringService`, `LogsController` |

### 5.2 In-Memory State

| Store | Purpose | Access Path | Persistence | Risk |
|--------|---------|-------------|-------------|------|
| `ProfileLoader.cache` | Agent profiles | `ProfileLoader.getById()` | None (lost on restart) | ⚠️ Medium (profiles reloaded from filesystem) |
| `ProjectPhaseStore` | Project phases | `ProjectsService.getContext()`, `updatePhase()` | None (lost on restart) | ⚠️ High (phase state not persisted) |

**Critical Gap:** `ProjectPhaseStore` is in-memory only. Phase updates are lost on server restart.

### 5.3 KV Usage

**Status:** None
- No key-value stores
- No Redis
- No in-memory KV caches (except ProfileLoader cache)

### 5.4 Memory Scopes

**Status:** Defined but not implemented
- Agent profiles define `memoryScopes` (global, client, project)
- No runtime implementation found
- No memory persistence mechanism

### 5.5 Decision Logs

| Log Type | Location | Format | Retention |
|----------|----------|--------|-----------|
| Action Logs | `action_logs` table | JSONB (input_json, output_json) | Permanent (append-only) |
| Review Actions | `review_actions` table | Structured (action, comment) | Permanent (CASCADE on review delete) |
| Decision Audit | `action_logs` (action='decision.draft.created', 'decision.finalized') | JSONB | Permanent |

### 5.6 Replay Mechanisms

**Status:** Not implemented
- No replay functionality
- No event sourcing
- Action logs are append-only but no replay engine
- Decision history queryable but not replayable

**Gap:** Action logs contain sufficient data for replay but no mechanism exists.

### 5.7 Persistence Summary

| Persisted Object | Location | Access Path | Deterministic? | Auditierbar? |
|------------------|----------|-------------|----------------|--------------|
| Decisions | PostgreSQL (`decisions`) | `DecisionsService` | ✅ Yes | ✅ Yes (via action_logs) |
| Reviews | PostgreSQL (`review_requests`, `review_actions`) | `PostgresReviewStore`, `ReviewsController` | ✅ Yes | ✅ Yes (via action_logs) |
| Action Logs | PostgreSQL (`action_logs`) | `PostgresActionLogger` | ✅ Yes | ✅ Yes (append-only) |
| Project Phases | In-Memory (`ProjectPhaseStore`) | `ProjectsService` | ⚠️ No (lost on restart) | ⚠️ Partial (logged but not persisted) |
| Agent Profiles | Filesystem (`profiles/*.json`) | `ProfileLoader` | ✅ Yes | ⚠️ No (no versioning) |

---

## 6. Governance Traceability

### 6.1 Logging Coverage

| Operation | Logged? | Log Action | Blocks on Failure? | File Reference |
|-----------|---------|------------|---------------------|----------------|
| Agent execution start | ✅ Yes | `agent.run` | ❌ No | `orchestrator.ts:119-128` |
| Agent execution (commit) | ✅ Yes | `agent.executed.commit` | ❌ No | `orchestrator.ts:370-379` |
| Agent execution (draft) | ✅ Yes | `agent.executed.draft_only` | ❌ No | `orchestrator.ts:441` |
| Agent blocked (governance) | ✅ Yes | `agent.blocked.*` | ❌ No | Multiple locations |
| Decision draft created | ✅ Yes | `decision.draft.created` | ❌ No | `orchestrator.ts:420-430` |
| Decision finalization intent | ✅ Yes | `decision.finalize.intent` | ✅ Yes | `decisions.service.ts:281-296` |
| Decision finalized | ✅ Yes | `decision.finalized` | ✅ Yes | `decisions.service.ts:330-347` |
| Knowledge search | ✅ Yes | `knowledge.search` | ✅ Yes | `knowledge.service.ts:73-93` |
| Project phase update | ✅ Yes | `project.phase.update` | ✅ Yes | `projects.service.ts:76-94` |
| Escalation events | ✅ Yes | `escalation` | ❌ No | `orchestrator.ts:242-257, 278-296, 317-333` |

### 6.2 CommitToken Verification

**Implementation:** ✅ Complete
- Token generation: `ReviewsController.approve()` generates `crypto.randomBytes(32)`
- Token hashing: SHA256 stored in `review_requests.commit_token_hash`
- Token validation: `PostgresReviewStore.getApprovedForCommit()` verifies:
  - Review exists
  - Status = 'approved'
  - Token hash matches
  - Token not used (`commit_token_used = FALSE`)
- Token usage: `markTokenUsed()` sets `commit_token_used = TRUE` (atomar)

**File References:**
- Token generation: `apps/api/src/modules/reviews/reviews.controller.ts:31-32`
- Token validation: `apps/api/src/runtime/postgres-review-store.ts:38-71`
- Token usage: `apps/api/src/runtime/postgres-review-store.ts:73-85`

### 6.3 Payload Tamper Detection

**Implementation:** ✅ Complete
- Hash calculation: `Orchestrator.sha256Json()` on stored payload
- Hash comparison: Current payload hash vs. stored hash
- Blocking: Blocks execution if mismatch
- Escalation: Logs escalation event on tamper attempt

**File Reference:** `packages/agent-runtime/src/orchestrator/orchestrator.ts:300-334`

### 6.4 Unverified Mutations

**Identified Risks:**

| Mutation | Verification | Risk Rating |
|----------|---------------|-------------|
| `DecisionsService.createDraft()` | ✅ DTO validation | ✅ Low |
| `DecisionsService.finalizeFromDraft()` | ✅ Governance checks (status, review, projectId) | ✅ Low |
| `ReviewsController.approve()` | ⚠️ No verification of reviewer identity | ⚠️ Medium |
| `ReviewsController.reject()` | ⚠️ No verification of reviewer identity | ⚠️ Medium |
| `ProjectsService.updatePhase()` | ⚠️ No verification of caller identity | ⚠️ Medium |
| `PostgresActionLogger.append()` | ❌ No verification (trusted internal) | ✅ Low (internal) |

**Gap:** Review approval/rejection endpoints do not verify reviewer identity or authorization.

### 6.5 Hidden State Couplings

**Identified Couplings:**

| Coupling | Type | Risk Rating | Mitigation |
|----------|------|-------------|------------|
| `ProjectPhaseStore` (in-memory) vs. `projects` table | State split | ⚠️ High | Phase should be in DB |
| `ProfileLoader` path hardcoded | Filesystem dependency | ⚠️ Medium | Use config/env var |
| `ToolRouter` tool handlers closure | Runtime coupling | ✅ Low | Acceptable (internal) |
| `Orchestrator` → `ToolRouter` → Service layer | Dependency chain | ✅ Low | Acceptable (explicit) |
| `DecisionsService.finalizeFromDraft()` requires `ActionLogger` | Optional dependency | ⚠️ Medium | Should be required, not optional |

**Critical Gap:** `ProjectPhaseStore` state is not synchronized with database, leading to potential inconsistencies.

### 6.6 Governance Traceability Summary

| Aspect | Status | Coverage | Risk Rating |
|--------|--------|----------|-------------|
| Logging | ✅ Complete | All critical operations logged | ✅ Low |
| CommitToken | ✅ Complete | Full verification chain | ✅ Low |
| Payload Tamper Detection | ✅ Complete | SHA256 hash validation | ✅ Low |
| Reviewer Verification | ⚠️ Partial | No identity/authorization checks | ⚠️ Medium |
| State Consistency | ⚠️ Partial | ProjectPhaseStore not persisted | ⚠️ High |
| Audit Trail | ✅ Complete | Append-only action_logs | ✅ Low |

---

## 7. Risk Assessment

### 7.1 High Risk Paths

| Risk | Path | Impact | Likelihood | Mitigation Status |
|------|------|--------|------------|-------------------|
| **Project Phase State Loss** | `ProjectPhaseStore` in-memory → Server restart | Phase state lost, context inconsistent | High | ❌ Not mitigated |
| **Reviewer Identity Not Verified** | `POST /reviews/:id/approve` → No auth check | Unauthorized approvals possible | Medium | ❌ Not mitigated |
| **Profile Path Hardcoded** | `ProfileLoader` uses `process.cwd()` → Different execution context | Profiles not found, agent execution fails | Medium | ❌ Not mitigated |

### 7.2 Medium Risk Paths

| Risk | Path | Impact | Likelihood | Mitigation Status |
|------|------|--------|------------|-------------------|
| **ActionLogger Optional in finalizeFromDraft** | `DecisionsService.finalizeFromDraft()` accepts optional logger | Finalization without audit log possible | Low | ⚠️ Partial (tool handler enforces, but service allows optional) |
| **No Memory Scope Implementation** | Agent profiles define memoryScopes but not used | Memory context not available to agents | Low | ❌ Not implemented |
| **No Replay Mechanism** | Action logs exist but no replay engine | Cannot replay decision history | Low | ❌ Not implemented |

### 7.3 Low Risk Paths

| Risk | Path | Impact | Likelihood | Mitigation Status |
|------|------|--------|------------|-------------------|
| **ProfileLoader Cache** | In-memory cache lost on restart | Profiles reloaded (acceptable) | Low | ✅ Acceptable |
| **ToolRouter Closure Coupling** | Tool handlers via closure | Internal coupling (acceptable) | Low | ✅ Acceptable |

### 7.4 Risk Summary by Flow

| Flow | Risk Rating | Critical Issues |
|------|-------------|-----------------|
| Agent Execution | ✅ Low | None |
| Decision Creation | ✅ Low | None |
| Decision Finalization | ✅ Low | None (governance-protected) |
| Knowledge Search | ✅ Low | None (audit-enforced) |
| Review Approval | ⚠️ Medium | Reviewer identity not verified |
| Project Phase Update | ⚠️ High | State not persisted |
| Monitoring/Drift | ✅ Low | None (read-only) |

---

## 8. Identified Gaps

### 8.1 Determinism Gaps

1. **Project Phase State Not Persisted**
   - **Location:** `apps/api/src/modules/projects/project-phase.store.ts`
   - **Impact:** Phase state lost on server restart
   - **Risk:** High
   - **Recommendation:** Store phase in `projects` table or separate `project_phases` table

2. **Profile Path Hardcoded**
   - **Location:** `packages/agent-runtime/src/profiles/profile-loader.ts:9`
   - **Impact:** Breaks in different execution contexts (Docker, different working directories)
   - **Risk:** Medium
   - **Recommendation:** Use environment variable or config file

3. **ActionLogger Optional in Service Layer**
   - **Location:** `apps/api/src/modules/decisions/decisions.service.ts:182-188`
   - **Impact:** Service allows finalization without audit log (though tool handler enforces)
   - **Risk:** Medium
   - **Recommendation:** Make logger required parameter in service method

### 8.2 Observability Gaps

1. **No Memory Scope Implementation**
   - **Location:** Agent profiles define `memoryScopes` but no runtime usage
   - **Impact:** Memory context not available to agents
   - **Risk:** Low
   - **Recommendation:** Implement memory scope persistence and retrieval

2. **No Replay Mechanism**
   - **Location:** Action logs exist but no replay engine
   - **Impact:** Cannot replay decision history for debugging/audit
   - **Risk:** Low
   - **Recommendation:** Implement replay engine using action_logs

3. **No Agent Profile Versioning**
   - **Location:** Profile files are static JSON, no versioning
   - **Impact:** Cannot track profile changes over time
   - **Risk:** Low
   - **Recommendation:** Add version field to profiles, track changes

### 8.3 Coupling Gaps

1. **ProjectPhaseStore In-Memory vs. Database**
   - **Location:** `ProjectPhaseStore` (in-memory) vs. `projects` table (database)
   - **Impact:** State inconsistency, data loss on restart
   - **Risk:** High
   - **Recommendation:** Persist phase in database

2. **Tool Handlers Closure Coupling**
   - **Location:** `apps/api/src/modules/agents/agents.runtime.ts:22-188`
   - **Impact:** Tool handlers tightly coupled to service instances
   - **Risk:** Low (acceptable for MVP)
   - **Recommendation:** Consider dependency injection pattern for future scalability

### 8.4 Audit Hardening Gaps

1. **Reviewer Identity Not Verified**
   - **Location:** `apps/api/src/modules/reviews/reviews.controller.ts:29-62`
   - **Impact:** Unauthorized approvals possible
   - **Risk:** Medium
   - **Recommendation:** Add authentication/authorization middleware

2. **No Audit Log for Profile Loading**
   - **Location:** `ProfileLoader.loadAll()`
   - **Impact:** Cannot track which profiles were loaded when
   - **Risk:** Low
   - **Recommendation:** Log profile loading events

3. **No Audit Log for Review List Access**
   - **Location:** `ReviewsController.list()`
   - **Impact:** Cannot track who accessed review list
   - **Risk:** Low
   - **Recommendation:** Add audit logging for read operations

---

## 9. Recommendations

### 9.1 Determinism Improvements

1. **Persist Project Phase State**
   - **Priority:** High
   - **Action:** Add `phase` column to `projects` table or create `project_phases` table
   - **File:** `infrastructure/db/migrations/004_project_phases.sql`
   - **Impact:** Eliminates state loss on restart

2. **Make Profile Path Configurable**
   - **Priority:** Medium
   - **Action:** Use `PROFILES_DIR` environment variable with fallback
   - **File:** `packages/agent-runtime/src/profiles/profile-loader.ts`
   - **Impact:** Works in different execution contexts

3. **Make ActionLogger Required in finalizeFromDraft**
   - **Priority:** Medium
   - **Action:** Remove optional `?` from logger parameter
   - **File:** `apps/api/src/modules/decisions/decisions.service.ts:182`
   - **Impact:** Enforces audit logging at service layer

### 9.2 Observability Improvements

1. **Implement Memory Scope Persistence**
   - **Priority:** Low
   - **Action:** Create `agent_memory` table, implement scope-based storage/retrieval
   - **File:** New package `packages/memory/` or extend `packages/knowledge/`
   - **Impact:** Enables agent memory context

2. **Implement Replay Engine**
   - **Priority:** Low
   - **Action:** Create replay service that reads `action_logs` and reconstructs state
   - **File:** New `packages/replay/` package
   - **Impact:** Enables debugging and audit replay

3. **Add Profile Versioning**
   - **Priority:** Low
   - **Action:** Add `version` field to profile schema, track changes
   - **File:** `packages/agent-runtime/src/profiles/profile-loader.ts`
   - **Impact:** Tracks profile evolution

### 9.3 Coupling Reduction

1. **Persist Project Phase in Database**
   - **Priority:** High
   - **Action:** Migrate `ProjectPhaseStore` to database-backed implementation
   - **File:** `apps/api/src/modules/projects/project-phase.store.ts`
   - **Impact:** Eliminates state inconsistency

2. **Refactor Tool Handlers to Dependency Injection**
   - **Priority:** Low (future)
   - **Action:** Use NestJS dependency injection for tool handlers
   - **File:** `apps/api/src/modules/agents/agents.runtime.ts`
   - **Impact:** Reduces coupling, improves testability

### 9.4 Audit Hardening

1. **Add Reviewer Authentication/Authorization**
   - **Priority:** Medium
   - **Action:** Add auth middleware to `ReviewsController`, verify reviewer role
   - **File:** `apps/api/src/modules/reviews/reviews.controller.ts`
   - **Impact:** Prevents unauthorized approvals

2. **Add Audit Logging for Read Operations**
   - **Priority:** Low
   - **Action:** Log access to sensitive read endpoints (reviews list, logs, decisions)
   - **File:** Multiple controllers
   - **Impact:** Complete audit trail

3. **Add Profile Loading Audit Log**
   - **Priority:** Low
   - **Action:** Log profile loading events to `action_logs`
   - **File:** `packages/agent-runtime/src/profiles/profile-loader.ts`
   - **Impact:** Tracks profile lifecycle

### 9.5 Implementation Priority Matrix

| Recommendation | Priority | Risk if Not Addressed | Effort | Impact |
|----------------|----------|----------------------|--------|--------|
| Persist Project Phase | High | High (data loss) | Medium | High |
| Reviewer Authentication | Medium | Medium (security) | Low | Medium |
| Profile Path Configurable | Medium | Medium (deployment) | Low | Medium |
| ActionLogger Required | Medium | Medium (audit gap) | Low | Medium |
| Memory Scope Implementation | Low | Low (feature) | High | Low |
| Replay Engine | Low | Low (debugging) | High | Low |
| Profile Versioning | Low | Low (traceability) | Low | Low |

---

## 10. Audit Completeness Checklist

- [x] All high-risk paths inspected
- [x] No blind spots in agent-runtime
- [x] All flows mapped end-to-end
- [x] Findings logged in `team_findings.md`
- [x] Progress logged in `team_progress.md`
- [x] Audit report generated
- [x] Risk assessment completed
- [x] Gaps identified
- [x] Recommendations provided

**Audit Status:** ✅ Complete

---

## Appendix A: File Reference Index

### Core Runtime
- `packages/agent-runtime/src/orchestrator/orchestrator.ts` - Main orchestrator logic
- `packages/agent-runtime/src/execution/tool-router.ts` - Tool routing
- `packages/agent-runtime/src/profiles/profile-loader.ts` - Profile loading

### API Layer
- `apps/api/src/modules/agents/agents.controller.ts` - Agent execution endpoint
- `apps/api/src/modules/agents/agents.runtime.ts` - Tool handlers
- `apps/api/src/modules/decisions/decisions.service.ts` - Decision service
- `apps/api/src/modules/knowledge/knowledge.service.ts` - Knowledge service
- `apps/api/src/modules/reviews/reviews.controller.ts` - Review endpoints
- `apps/api/src/modules/projects/projects.service.ts` - Project service

### Persistence
- `apps/api/src/runtime/postgres-action-logger.ts` - Action logging
- `apps/api/src/runtime/postgres-review-store.ts` - Review store
- `infrastructure/db/migrations/` - Database schema

### Governance
- `packages/governance/src/policies/enforcement.ts` - Policy enforcement
- `packages/agent-runtime/src/orchestrator/orchestrator.ts` - Governance hooks

---

**End of Audit Report**

