# Governance v2 Implementation Plan

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** strategy  
**Last Updated:** 2026-02-18T13:00:00+01:00  
**Definition of Done:**
- [ ] Alle Workstreams haben Owner, Scope, Autonomy Tier, Layer, Structural Model, Risks, DoD
- [ ] Milestones sind definiert und trackbar
- [ ] Approval Gates sind dokumentiert
- [ ] Keine Layer-Vermischung (nur strategy)

---

## Workstreams

| Workstream | Owner | Status | Scope (paths) | Autonomy Tier | Next Action | Blockers |
|---|---|---|---|---|---|---|
| PHASE 1 — Deterministic Structure Hardening | @implementer_codex | completed | `ops/agent-team/**` | 3 | ✅ Abgeschlossen | - |
| PHASE 2 — Validation Engine | @implementer_codex | todo | `packages/governance-v2/**` | 3 | Workstream Validator implementieren | Reviewer Approval |
| CI STABILIZATION — Phase 2 CI Closure | @teamlead_orchestrator | completed | `.github/workflows/**`, `apps/web/**`, `ops/agent-team/**` | 2 | ✅ CI-blocking issues fixed, TODO list created | - |
| PHASE 3 — Clarification Layer | @implementer_codex | todo | `packages/governance-v2/clarification/**` | 3 | Ambiguity Detection implementieren | - |
| PHASE 4 — CI Integration + Continuous Audit | @observability_eval | todo | `.github/workflows/**`, `packages/governance-v2/audit/**` | 2 | Governance Linter erstellen | - |
| SKILLS — Phase 0-1: Scaffold + Pilot Skill | @implementer_codex | in_progress | `packages/skills/**`, `packages/agent-runtime/src/orchestrator/**`, `apps/api/src/modules/agents/**` | 3 | Implement skill layer foundation + pilot skill | Reviewer Approval Required |
| CUSTOMER DATA PLANE — Step 1: Read-only Interface | @teamlead_orchestrator | planning | `packages/customer-data/**`, `apps/api/src/modules/agents/**` | 2 | Contracts Spec + Plan Update | - |
| CUSTOMER DATA PLANE — Step 2: PolicyEngine + Governance Hardening | @teamlead_orchestrator | planning | `packages/policy/**` or `packages/governance/**`, `apps/api/src/modules/**` | 2 | PolicyEngine Spec + Plan Update | - |
| CUSTOMER DATA PLANE — Step 3: Scalability, Onboarding & Operational Stability | @teamlead_orchestrator | planning | `docs/**`, `packages/customer-data/**`, `apps/api/src/modules/projects/**`, `infrastructure/db/migrations/**` | 2 | Onboarding Framework Spec + Plan Update | - |
| CUSTOMER DATA PLANE — Step 1-3 Integration | @implementer_codex | in_progress | `packages/customer-data/**`, `packages/governance/**`, `apps/api/src/modules/**`, `infrastructure/db/migrations/**` | 3 | Full Integration Implementation | Reviewer Approval Required |
| ANALYTICS — v1 Read-only KPIs | @implementer_codex | in_progress | `apps/api/src/modules/analytics/**` | 3 | Read-only analytics + logging audit | - |

---

## ANALYTICS — v1 Read-only KPIs

**Owner:** @implementer_codex  
**Autonomy Tier:** 3 (execute-with-approval)  
**Layer:** implementation  
**Status:** in_progress

**Scope:**
- `apps/api/src/modules/analytics/**` (new module)
- Read-only aggregation over action_logs, review_requests, review_actions

**Structural Model:**
```
apps/api/src/modules/analytics/
├── analytics.module.ts
├── analytics.controller.ts
├── analytics.service.ts
└── dto/
    └── analytics-query.dto.ts
```

**Deliverables:**
- GET /analytics/overview, /skills, /reviews, /governance, /time
- from/to range (default 7d, max 90d), optional projectId/clientId/agentId filters
- Aggregated KPIs only, no PII, no raw payload_json

**Definition of Done:**
- [ ] All endpoints return correct KPIs
- [ ] Tests pass (service unit + controller smoke)
- [ ] Logging integrity audit documented in team_findings.md
- [ ] pnpm -r lint, pnpm -r test pass

**Risks:**
- **Risk 1:** Logging integrity — Impact: medium — Mitigation: Pre-implementation audit, enrichment plan if gaps
- **Risk 2:** DB performance — Impact: low — Mitigation: Indexes on action, ts, projectId, agentId, clientId

**Rollback Plan:**
- Remove AnalyticsModule wiring from AppModule

---

## PHASE 1 — Deterministic Structure Hardening

**Owner:** @implementer_codex  
**Autonomy Tier:** 3  
**Layer:** implementation  
**Status:** completed

**Scope:**
- `ops/agent-team/**`

**Structural Model:**
```
ops/agent-team/
├── Header Template Definition (Version, Owner, Last Updated, DoD, Layer)
├── Migration aller Artefakte (team_plan.md, team_findings.md, team_progress.md, team_decisions.md, autonomy_policy.md, scorecard_definition.md)
├── DoD Enforcement (Definition of Done in jedem Artefakt)
└── Layer-Tag Einführung (strategy|architecture|implementation|governance)
```

**Deliverables:**
- Header Template Definition
- Migration aller Artefakte
- DoD Enforcement
- Layer-Tag Einführung

**Definition of Done:**
- ✅ Alle Artefakte enthalten Version, Owner, Last Updated, DoD, Layer
- ✅ Runtime Validator blockiert Dokumente ohne vollständigen Header
- ✅ Tests vorhanden (7 Tests für DocumentHeaderValidator)
- ✅ Layer-Reinheit sichergestellt
- CI validiert Header-Struktur (optional, kann in Phase 4 implementiert werden)

**Risks:**
- **Risk 1:** Dokumentations-Drift während Migration
  - **Impact:** medium
  - **Mitigation:** Single Migration PR, alle Änderungen atomar

---

## PHASE 2 — Validation Engine

**Owner:** @implementer_codex  
**Reviewer:** @reviewer_claude  
**Autonomy Tier:** 3  
**Layer:** architecture  
**Status:** todo

**Scope:**
- `packages/governance-v2/**`

**Structural Model:**
```
packages/governance-v2/
├── validator/
│   ├── workstream-validator.ts (validiert Workstreams)
│   └── schema.ts (JSON Schema)
├── compiler/
│   └── decision-compiler.ts (Decision Pipeline)
├── policy/
│   ├── policy-engine.ts (Policy Parser)
│   └── autonomy-guard.ts (Autonomy Enforcement)
└── types/
    └── governance.types.ts (Core Interfaces)
```

**Deliverables:**
- Workstream Validator
- Decision Compiler
- Policy Parser
- Autonomy Guard

**Definition of Done:**
- Workstream ohne Structural Model wird blockiert
- Decision mit falschem Layer wird blockiert
- Policy Rules werden korrekt geparst und angewendet
- Autonomy Escalation wird erkannt

**Risks:**
- **Risk 1:** False Positives bei Layer Detection
  - **Impact:** medium
  - **Mitigation:** Reviewer Validation Gate, Escalation Override Mechanismus

---

## PHASE 3 — Clarification Layer

**Owner:** @implementer_codex  
**Autonomy Tier:** 3  
**Layer:** architecture  
**Status:** todo

**Scope:**
- `packages/governance-v2/clarification/**`

**Structural Model:**
```
packages/governance-v2/clarification/
├── ambiguity-detector.ts (erkennt Mehrdeutigkeiten)
├── conflict-detector.ts (erkennt Konflikte)
└── clarification-generator.ts (generiert gezielte Rückfragen)
```

**Deliverables:**
- Ambiguity Detection
- Conflict Detection
- Clarification Generator

**Definition of Done:**
- Mehrdeutige Workstreams erzeugen gezielte Rückfragen
- Keine impliziten Annahmen mehr
- Konflikte zwischen Autonomy-Regeln werden erkannt

**Risks:**
- **Risk 1:** Overblocking legitimer Workflows
  - **Impact:** medium
  - **Mitigation:** Escalation Override Mechanismus, Reviewer kann Override genehmigen

---

## PHASE 4 — CI Integration + Continuous Audit

**Owner:** @observability_eval  
**Autonomy Tier:** 2  
**Layer:** governance  
**Status:** todo

**Scope:**
- `.github/workflows/**`
- `packages/governance-v2/audit/**`

**Structural Model:**
```
.github/workflows/
└── governance-audit.yml (CI Job für Governance Linting)

packages/governance-v2/audit/
├── audit-runner.ts (Audit Execution)
├── scorecard-engine.ts (Scorecard Berechnung)
└── failure-injection.ts (Failure Injection Tests)
```

**Deliverables:**
- Governance Linter
- Scorecard Engine
- Weekly Entropy Report
- Failure Injection Tests

**Definition of Done:**
- CI Fail bei Governance Score < 8.0
- Weekly Audit Report generiert
- Failure Injection Tests laufen in CI

**Risks:**
- **Risk 1:** CI Runtime Verlängerung
  - **Impact:** low
  - **Mitigation:** Audit in separatem Job, kann parallel laufen

---

## SKILLS — Phase 0-1: Scaffold + Pilot Skill

**Owner:** @implementer_codex  
**Reviewer:** @reviewer_claude  
**Autonomy Tier:** 3 (execute-with-approval)  
**Layer:** implementation  
**Status:** in_progress

**Scope:**
- `packages/skills/**` (new package)
- `packages/agent-runtime/src/orchestrator/orchestrator.ts` (skill execution path)
- `apps/api/src/modules/agents/**` (DTO support, registry wiring)
- `packages/shared/src/types/agent.ts` (optional skills field)

**Structural Model:**
```
packages/skills/
├── src/
│   ├── spec/              # TypeScript interfaces, JSON Schema
│   ├── registry/           # Manifest loading, discovery
│   ├── loader/             # Lazy loading (instructions, resources)
│   ├── executor/           # Skill compilation and execution
│   ├── telemetry/          # Telemetry collection
│   └── templates/          # Templates for skill authoring
└── skills/                 # Skill implementations
    └── governance.workstream_validate/
        ├── manifest.json
        └── instructions.md
```

**Deliverables:**
- Skill layer foundation (spec, registry, loader, executor)
- Feature-flagged skill execution path in Orchestrator
- Pilot skill: governance.workstream_validate
- Unit tests (FakeClock where relevant)
- Integration test for skill execution path
- Documentation updates

**Definition of Done:**
- [ ] packages/skills scaffold created (spec, registry, loader, executor)
- [ ] Feature flag SKILLS_ENABLED (default: false) implemented
- [ ] Orchestrator skill execution path (feature-flagged, no breaking changes)
- [ ] Pilot skill governance.workstream_validate implemented
- [ ] Input schema validation working
- [ ] Deterministic compilation to tool calls OR direct validator call
- [ ] Action logs include skillId/version/skillRunId
- [ ] All time operations use Clock interface
- [ ] Unit tests pass (registry, loader, executor)
- [ ] Integration test passes (Orchestrator + skill execution)
- [ ] With SKILLS_ENABLED=false, existing behavior unchanged
- [ ] No ToolRouter bypass (skills execute via ToolRouter)
- [ ] No lint violations (Date/setTimeout restrictions)
- [ ] team_plan.md updated
- [ ] team_progress.md updated

**Risks:**
- **Risk 1:** Breaking changes in Orchestrator
  - **Impact:** high (regression)
  - **Mitigation:** Feature flag, skill path separate from tool path, comprehensive tests
- **Risk 2:** Skill execution bypasses governance
  - **Impact:** high (security)
  - **Mitigation:** Skills must go through Orchestrator governance hooks, no bypass
- **Risk 3:** Performance impact (skill discovery/loading)
  - **Impact:** low (startup time)
  - **Mitigation:** Metadata-first discovery, lazy loading, in-memory caching
- **Risk 4:** Non-deterministic skill compilation
  - **Impact:** medium (replay-friendliness)
  - **Mitigation:** Deterministic compiler, no LLM calls, fixed tool call sequences

**Test Plan:**
1. Unit tests: SkillRegistry, SkillLoader, SkillExecutor (with FakeClock)
2. Integration test: Orchestrator + SkillExecutor + ToolRouter (mocked)
3. E2E test: POST /agents/execute with skillRequest (SKILLS_ENABLED=true)
4. Regression test: Existing tool flow unchanged (SKILLS_ENABLED=false)

**Rollback Plan:**
- Feature flag SKILLS_ENABLED=false disables skill execution path
- Git revert all commits if needed
- No database migrations (no schema changes)

**Approval Gate:**
- Touching `packages/agent-runtime/src/orchestrator/**` OR `apps/api/src/modules/agents/**` requires @reviewer_claude approval per policy_approval_rules.yaml

---

## CUSTOMER DATA PLANE — Step 1: Read-only Interface

**Owner:** @teamlead_orchestrator  
**Autonomy Tier:** 2 (draft-only)  
**Layer:** architecture  
**Status:** planning

**Scope:**
- `packages/customer-data/**` (new package)
- `apps/api/src/modules/agents/agents.runtime.ts` (tool handlers)
- `packages/agent-runtime/src/execution/tool-permissions.ts` (permission mapping)
- `packages/shared/src/types/agent.ts` (ToolRef + Permission types)

**Structural Model:**
```
packages/customer-data/
├── src/
│   ├── connector.ts              (CustomerConnector interface)
│   ├── registry.ts                (ConnectorRegistry + CapabilityRegistry)
│   ├── capability.schema.ts       (types + validation)
│   ├── constraints.ts             (maxRows/fields enforcement)
│   └── index.ts
apps/api/src/modules/agents/
└── agents.runtime.ts              (add tool.customer_data.* handlers)
```

**Deliverables:**
- CustomerConnector interface (transport abstraction)
- ConnectorRegistry (clientId → connector mapping)
- CapabilityRegistry (clientId → capability map; allowlisted operations)
- Tool surface: `tool.customer_data.executeReadModel`, `tool.customer_data.getEntity`, `tool.customer_data.search`
- Action logging: `action="customer_data.access"` with metadata (rowCount, fieldsReturned, latencyMs, sourceType)
- Hard constraints: maxRows default (200), allowlisted fields, NO raw SQL in tool calls
- Unit tests + minimal integration tests
- Documentation: "How to add a new connector + capability map"

**Definition of Done:**
- [ ] team_plan.md updated with workstreams, owners, autonomy tiers, next actions
- [ ] New customer-data contract + registries exist
- [ ] ToolRouter can execute at least one customer_data tool end-to-end
- [ ] Action log entry recorded for each successful customer_data access
- [ ] Tests pass locally (unit + minimal integration)
- [ ] Docs: "How to add a new connector + capability map" added

**Risks:**
- **Risk 1:** Raw SQL injection via tool calls
  - **Impact:** high (security)
  - **Mitigation:** Explicit rejection of "sql", "query", "statement", "raw" fields in payload validation
- **Risk 2:** Unbounded data access (no maxRows enforcement)
  - **Impact:** medium (performance, cost)
  - **Mitigation:** Default maxRows=200, capability can override lower, never higher
- **Risk 3:** Missing audit trail for customer data access
  - **Impact:** high (compliance, traceability)
  - **Mitigation:** ActionLogger required, blocks execution if logging fails
- **Risk 4:** Connector configuration exposes secrets
  - **Impact:** high (security)
  - **Mitigation:** Step 1: no DB creds in app env beyond existing DATABASE_URL, connector config via files/env (non-secret for step 1)

**Workstreams:**

**WS1 — Architecture & Contracts** (Owner: @reviewer_claude, Autonomy: 2)
- Define TypeScript interfaces: CustomerConnector, Registry contracts, Capability schema
- Define tool API shape: operationId + params + context (no SQL)
- Define ActionLog schema fields for customer_data.access
- Deliverable: "Contracts Spec" in team_findings.md + suggested file layout

**WS2 — Implementation Wiring** (Owner: @implementer_codex, Autonomy: 3)
- Add packages/customer-data/ with connector interface, registries, validators
- Add tool handlers in apps/api/src/modules/agents/agents.runtime.ts
- Ensure logs written via PostgresActionLogger with action="customer_data.access"
- Deliverable: Code changes + unit tests

**WS3 — QA Tests & Harness** (Owner: @observability_eval, Autonomy: 2)
- Add E2E or integration tests: calling /agents/execute triggers customer tool → logs exist
- maxRows applied
- disallow "sql" or "query" fields in payload
- Deliverable: Test suite + instructions to run

**WS4 — DevOps/Config Guidance** (Owner: @teamlead_orchestrator, Autonomy: 2)
- Provide deployment-safe guidance: no DB creds in app env beyond existing DATABASE_URL
- Connector config via config files or env (non-secret for step 1)
- Deliverable: small doc snippet (no secrets)

**Non-Goals (Step 1):**
- No Write-Operations to customer system
- No Full Auth/RBAC/RLS Engine (comes Step 2)
- No MemoryScopes / Replay
- No UI

---

## CUSTOMER DATA PLANE — Step 2: PolicyEngine + Governance Hardening

**Owner:** @teamlead_orchestrator  
**Autonomy Tier:** 2 (draft-only)  
**Layer:** architecture  
**Status:** planning

**Scope:**
- `packages/policy/**` OR `packages/governance/**` (decision required)
- `apps/api/src/modules/reviews/reviews.controller.ts` (AuthZ enforcement)
- `apps/api/src/modules/projects/projects.service.ts` (AuthZ enforcement)
- `apps/api/src/modules/decisions/decisions.service.ts` (mandatory ActionLogger)
- `apps/api/src/modules/agents/agents.runtime.ts` (PolicyEngine integration for customer_data tools)

**Structural Model:**
```
packages/policy/  (OR packages/governance/policy/)
├── src/
│   ├── policy-engine.ts      (PolicyEngine class: authorize, sanitize, redact)
│   ├── errors.ts              (PolicyError types)
│   └── types.ts               (PolicyDecision, PolicyContext types)

apps/api/src/modules/
├── reviews/reviews.controller.ts    (add reviewer role check)
├── projects/projects.service.ts     (add permission check)
├── decisions/decisions.service.ts   (make ActionLogger required)
└── agents/agents.runtime.ts         (integrate PolicyEngine for customer_data.*)
```

**Deliverables:**
- PolicyEngine with authorize(), sanitize(), redact() methods
- AuthN/AuthZ enforcement for ReviewsController (approve/reject)
- AuthN/AuthZ enforcement for ProjectsService.updatePhase()
- Mandatory ActionLogger in DecisionsService.finalizeFromDraft()
- PolicyEngine integration in customer_data tool handlers
- Scope/tenant enforcement (clientId validation)
- Mandatory audit logging enforcement (block on failure)
- Unit tests + integration tests
- Threat model documentation

**Definition of Done:**
- [ ] PolicyEngine integrated and tested
- [ ] All sensitive endpoints use PolicyEngine
- [ ] ActionLogger mandatory everywhere (no optional paths)
- [ ] Reviewer/AuthZ enforced (ReviewsController)
- [ ] Cross-tenant protection verified (tests)
- [ ] All policy violations logged
- [ ] Tests pass (unit + integration)
- [ ] Plan + logs updated
- [ ] Reviewer approval obtained for high-risk paths (agents/**, governance/**)

**Risks:**
- **Risk 1:** Privilege Escalation (unauthorized review approval)
  - **Impact:** high (security, compliance)
  - **Mitigation:** PolicyEngine.authorize() enforces reviewer role before approve/reject
- **Risk 2:** Tenant Hopping (cross-client data access)
  - **Impact:** high (data breach, compliance)
  - **Mitigation:** Scope enforcement: ctx.clientId must match capability.clientId, operationId allowlisted
- **Risk 3:** Silent Data Access (missing audit logs)
  - **Impact:** high (compliance, traceability)
  - **Mitigation:** ActionLogger mandatory, block execution on logging failure
- **Risk 4:** Replay Misuse (token reuse, payload tampering)
  - **Impact:** medium (security)
  - **Mitigation:** PolicyDecision logged with operation hash, deterministic constraints enforced
- **Risk 5:** Breaking Changes (optional → required parameters)
  - **Impact:** medium (backward compatibility)
  - **Mitigation:** Careful migration, update all call sites, comprehensive tests

**Workstreams:**

**WS1 — PolicyEngine Core** (Owner: @reviewer_claude, Autonomy: 2)
- Create centralized PolicyEngine with authorize(), sanitize(), redact()
- Define PolicyDecision object for logging
- Define PolicyError types (deterministic, structured)
- Threat model: privilege escalation, tenant hopping, replay misuse, unauthorized review approval
- Deliverable: Policy spec in team_findings.md + threat model section

**WS2 — AuthN/AuthZ Hardening** (Owner: @implementer_codex, Autonomy: 3)
- ReviewsController: enforce reviewer role before approve/reject, log "review.access.denied" if blocked
- ProjectsService.updatePhase: enforce permission (e.g., "project.manage"), validate caller identity
- DecisionsService.finalizeFromDraft: remove optional ActionLogger parameter, make logger required, fail fast if unavailable
- Tool.customer_data.*: call PolicyEngine.authorize() before Connector execution, call PolicyEngine.redact() before return
- Deliverable: Code changes + unit tests
- **Approval Gate:** Touching apps/api/modules/agents/** OR packages/governance/** requires @reviewer_claude approval

**WS3 — Scope Enforcement & Tenant Safety** (Owner: @implementer_codex, Autonomy: 3)
- Every customer_data call must verify: ctx.clientId matches capability.clientId, operationId is allowed for clientId
- Disallow cross-tenant operation even if params contain valid IDs
- Add invariant test: attempt cross-client call → must fail
- Deliverable: Code changes + tests

**WS4 — Mandatory Audit Logging** (Owner: @observability_eval + @implementer_codex, Autonomy: 2)
- Enforce: all customer_data.access, review approval, project phase updates, decision finalization must block if ActionLogger fails
- Add tests: simulate logger failure → operation must abort
- Ensure logs include: userId, clientId, operation, policyDecision summary
- Deliverable: Tests + enforcement code

**Non-Goals (Step 2):**
- No Multi-Source Router
- No Replay Engine
- No UI
- No Write-Operations to customer system

**Expected Risk Elimination:**

| Risk | Status After Step 2 |
|------|---------------------|
| Unauthorized Review Approval | ✅ Eliminated |
| Cross-Tenant Data Leak | ✅ Eliminated |
| Silent Data Access | ✅ Eliminated |
| Missing Audit Logs | ✅ Eliminated |
| Replay Misuse | ⚠️ Mitigated |

---

## CUSTOMER DATA PLANE — Step 3: Scalability, Onboarding & Operational Stability

**Owner:** @teamlead_orchestrator  
**Autonomy Tier:** 2 (draft-only)  
**Layer:** architecture  
**Status:** planning

**Scope:**
- `docs/customer-integration-guide.md` (new)
- `docs/capability-map-schema.md` (new)
- `packages/customer-data/routing/` (new: multi-source routing)
- `packages/customer-data/result-hash.ts` (new: deterministic hashing)
- `apps/api/src/modules/projects/project-phase.store.ts` (refactor: DB-backed)
- `infrastructure/db/migrations/004_project_phases.sql` (new: phase persistence)

**Structural Model:**
```
docs/
├── customer-integration-guide.md
└── capability-map-schema.md

packages/customer-data/
├── routing/
│   └── multi-source-registry.ts
├── result-hash.ts
└── ... (existing from Step 1)

apps/api/src/modules/projects/
├── project-phase.store.ts        (refactored: DB-backed)
└── projects.service.ts            (updated to use DB store)

infrastructure/db/migrations/
└── 004_project_phases.sql        (add phase column to projects)
```

**Deliverables:**
- Customer Onboarding Framework (template + checklist)
- Multi-Source Data Router (multiple connectors per clientId)
- ProjectPhaseStore Persistence Fix (DB-backed, restart-safe)
- Operational Observability (replay-ready metadata, resultHash)
- Production Readiness Hardening (health checks, timeouts, circuit breakers)
- Documentation: Customer Integration Guide

**Definition of Done:**
- [ ] Onboarding template exists (capability-map.example.yaml, connector-config.example.json)
- [ ] Multi-source routing works (operationId → source mapping)
- [ ] ProjectPhase persistence implemented (DB-backed, migration added)
- [ ] Logging enriched with replay-ready metadata (requestId, policyDecisionHash, resultHash)
- [ ] Health checks for connectors implemented
- [ ] Tests pass (unit + integration)
- [ ] Docs updated (Customer Integration Guide)
- [ ] Reviewer approval for governance-sensitive touches

**Risks:**
- **Risk 1:** Onboarding Complexity (manual errors in config)
  - **Impact:** medium (integration failures)
  - **Mitigation:** Comprehensive template, validation, checklist
- **Risk 2:** Multi-Source Routing Errors (wrong source selected)
  - **Impact:** high (data access failures)
  - **Mitigation:** Explicit source mapping in capability map, validation, tests
- **Risk 3:** Migration Failure (ProjectPhase persistence)
  - **Impact:** high (data loss, downtime)
  - **Mitigation:** Careful migration script, rollback plan, tests
- **Risk 4:** Replay Metadata Inconsistency (non-deterministic hashes)
  - **Impact:** medium (replay failures)
  - **Mitigation:** Deterministic hash algorithm, stable resultHash generation
- **Risk 5:** Connector Health Check Overhead (performance)
  - **Impact:** low (latency increase)
  - **Mitigation:** Async health checks, caching, timeout defaults

**Workstreams:**

**WS1 — Customer Onboarding Framework** (Owner: @reviewer_claude, Autonomy: 2)
- Create onboarding-template/ with: capability-map.example.yaml, connector-config.example.json, read-model SQL template (if DB), top-10-operation checklist, permission mapping guide
- Define Onboarding Contract: Required (clientId, connector type, read-only credential strategy, capability map, RBAC mapping), Optional (field redaction policy, data classification level)
- Deliverable: "Customer Integration Guide" in docs/ + onboarding checklist in team_findings.md

**WS2 — Multi-Source Data Router** (Owner: @implementer_codex, Autonomy: 3)
- Enhance ConnectorRegistry: supports multiple connectors per clientId, operationId maps to specific source
- Extend CapabilityMap: operations include source field (e.g., `source: postgres`, `source: rest_crm`)
- Constraints: PolicyEngine still runs BEFORE routing, Logging still mandatory, No source-specific policy duplication
- Deliverable: Code changes + tests
- **Approval Gate:** Touching packages/customer-data/** requires @reviewer_claude approval if governance-sensitive

**WS3 — ProjectPhaseStore Persistence Fix** (Owner: @implementer_codex, Autonomy: 3)
- Replace in-memory store with DB-backed implementation
- Options: Add `phase` column to `projects` table OR create `project_phases` table
- Must: Maintain existing API contract, Add migration, Add tests, Log phase updates (block on failure)
- Deliverable: DB migration + refactored store + tests

**WS4 — Observability & Replay Preparation** (Owner: @observability_eval + @reviewer_claude, Autonomy: 2)
- Standardized Event Metadata: requestId, policyDecisionHash, connectorSource, latencyMs
- Add stable resultHash generation for: customer_data.access, decision.finalized
- Document replay strategy: how action_logs reconstruct state
- No replay engine yet — only structured logs ready for replay
- Deliverable: Metadata schema + resultHash implementation + documentation

**WS5 — Production Readiness Hardening** (Owner: @observability_eval + @reviewer_claude, Autonomy: 2)
- Health checks for connectors (declare health() method)
- Timeout defaults (configurable per connector)
- Circuit breaker pattern (minimal, fail-safe)
- Safe failure modes (no partial execution)
- Deliverable: Health check interface + timeout config + circuit breaker + tests

**Non-Goals (Step 3):**
- No full Replay Engine (only preparation)
- No UI
- No Write-Operations to customer system
- No Multi-Source Router for non-customer-data operations

**Expected System Maturity After Step 3:**

| Dimension | Status |
|-----------|--------|
| Security | Enterprise |
| Multi-Tenant | Hardened |
| Auditability | Full |
| Scalability | Multi-Source Ready |
| Onboarding | Template-driven |
| Operational Stability | Restart-safe |

**Expected Risk Elimination:**

| Risk | Status After Step 2 |
|------|---------------------|
| Unauthorized Review Approval | ✅ Eliminated |
| Cross-Tenant Data Leak | ✅ Eliminated |
| Silent Data Access | ✅ Eliminated |
| Missing Audit Logs | ✅ Eliminated |
| Replay Misuse | ⚠️ Mitigated |

---

## CI STABILIZATION — Phase 2 CI Closure

**Owner:** @teamlead_orchestrator  
**Reviewer:** @reviewer_claude  
**Autonomy Tier:** 2 (draft-only)  
**Layer:** implementation  
**Status:** completed

**Scope:**
- `packages/agent-runtime/src/orchestrator/orchestrator.ts` (TypeScript import/type fixes)

**Structural Model:**
```
packages/agent-runtime/src/orchestrator/
└── orchestrator.ts              (fix imports, type definitions)
```

**Deliverables:**
- Fix missing module imports (runtime-state-store, time-utils)
- Resolve SkillManifest type mismatches
- Fix reviewPolicy.reviewerRoles type access
- Fix result.output spread type error
- Ensure no Clock policy regressions

**Definition of Done:**
- [x] All CI-blocking errors resolved
- [x] `pnpm -r lint` passes (web-app config issue fixed)
- [x] Secrets-scan workflow uses correct trufflehog image/tag
- [x] lint:clock script exists in root package.json
- [x] Non-blocking errors documented in team_todo_ci_closure.md
- [ ] `pnpm -C apps/api test:compliance` passes (test pattern issue, non-blocking)
- [ ] Clock policy migration (non-blocking, separate workstream)

**Risks:**
- **Risk 1:** Type changes break existing code
  - **Impact:** medium (regression)
  - **Mitigation:** Careful type alignment, comprehensive tests
- **Risk 2:** Import path changes break module resolution
  - **Impact:** medium (build failures)
  - **Mitigation:** Verify package.json exports, test imports
- **Risk 3:** Clock policy regression
  - **Impact:** high (governance violation)
  - **Mitigation:** No new Date() usage, all time via Clock interface

**Workstreams:**

**WS1 — Import Path Fixes** (Owner: @teamlead_orchestrator, Autonomy: 2)
- Fix `@agent-system/governance-v2/runtime/runtime-state-store` → `@agent-system/governance-v2`
- Fix `@agent-system/governance-v2/runtime/time-utils` → `@agent-system/governance-v2`
- Verify package.json exports are correct
- Deliverable: Corrected import statements

**WS2 — Type Definition Alignment** (Owner: @teamlead_orchestrator, Autonomy: 2)
- Align SkillRegistry.getManifest() return type with SkillManifest interface
- Fix reviewPolicy.reviewerRoles optional property access
- Fix result.output spread type (unknown → object check)
- Deliverable: Type-safe code without any assertions

**WS3 — Verification & Testing** (Owner: @teamlead_orchestrator, Autonomy: 2)
- Run `pnpm -r lint` to verify no new errors
- Run `pnpm -C apps/api test:compliance` to verify tests pass
- Verify Clock policy compliance (no new Date() usage)
- Deliverable: All tests passing, CI green

**Approval Gate:**
- No approval required (TypeScript fixes only, no logic changes)

---

## Milestones

- [x] M1: PHASE 1 abgeschlossen (Deterministic Structure Hardening) — 2026-02-18T11:57:00+01:00
- [ ] M2: PHASE 2 abgeschlossen (Validation Engine)
- [ ] M3: PHASE 3 abgeschlossen (Clarification Layer)
- [ ] M4: PHASE 4 abgeschlossen (CI Integration + Continuous Audit)
- [ ] M5: CUSTOMER DATA PLANE Step 1 abgeschlossen (Read-only Interface)
- [ ] M6: CUSTOMER DATA PLANE Step 2 abgeschlossen (PolicyEngine + Governance Hardening)
- [ ] M7: CUSTOMER DATA PLANE Step 3 abgeschlossen (Scalability, Onboarding & Operational Stability)

---
| Agentensystem Onepager (Pitch + Architektur) | GPT-5.2 (Cloud Agent) | in_progress | `docs/onepager-agentensystem-pitch.md`, `docs/onepager-agentensystem-architektur.md`, `ops/agent-team/*` | T1 (Docs-only) | Pitch- und Architektur-Onepager aus `docs/ist-zustand-agent-system.md` ableiten und schreiben | — |
| Geschäftspartner-Onboarding (Business Paper) | GPT-5.2 (Cloud Agent) | pending | `docs/geschaeftspartner-onboarding-konzept.md`, `ops/agent-team/*` | T1 (Docs-only) | Onboarding-Paper strukturieren und schreiben (ohne Tech-Stack) | — |
| BLOCK 10 · Governance-Bypass Tests (E2E) | GPT-5.2 (Cloud Agent) | in_progress | `apps/api/test/**`, `apps/api/jest.config.cjs`, `apps/api/package.json`, `ops/agent-team/*` | T2 (Tests-only) | Golden E2E Suite um negative Bypass-Fälle erweitern (Escalation + action_logs asserted), ohne Produktcode-Änderungen | Missing/unstimmiger Test-Harness im Repo (test:golden zeigt auf nicht vorhandene Datei) |

## Milestones
- [ ] M1: Agentensystem Onepager (Pitch) fertig
- [ ] M2: Agentensystem Onepager (Architektur) fertig
- [ ] M3: Agent-Artefakte (Plan/Findings/Progress/Decisions) aktualisiert
- [ ] M4: Commit + Push auf Feature-Branch

### Parking Lot (später)
- Geschäftspartner-Onboarding: Produkt-/Vertriebs-Kontext aus Repo-Doku extrahiert
- Geschäftspartner-Onboarding: Onboarding-Paper (Businessmodell + Produkt + Verkaufskonzept) fertiggestellt und reviewed (intern)

## Approval Gates Needed

- [ ] SKILLS Phase 0-1: Reviewer Approval (@reviewer_claude) erforderlich (touches agents/** per policy_approval_rules.yaml)
- [ ] PHASE 2: Reviewer Approval (@reviewer_claude) erforderlich
- [ ] CUSTOMER DATA PLANE WS2: Reviewer Approval (@reviewer_claude) erforderlich (touches agents/** per policy_approval_rules.yaml)
- [ ] CUSTOMER DATA PLANE Step 2 WS2: Reviewer Approval (@reviewer_claude) erforderlich (touches agents/** AND governance/** per policy_approval_rules.yaml)
- [ ] COMPLIANCE HARDENING Phase 1: Reviewer Approval (@reviewer_claude) erforderlich (touches governance/**, users/**)
- [ ] COMPLIANCE HARDENING Phase 2: Reviewer Approval (@reviewer_claude) erforderlich (touches governance/**, users/**, middleware/**)
- [ ] COMPLIANCE HARDENING Phase 3: Reviewer Approval (@reviewer_claude) erforderlich (touches governance/**, infrastructure/**)

---

## Notes

- Default lead: GPT-5.2 Thinking
- Governance v2 erweitert das bestehende Agent-System um eine selbstvalidierende Meta-Ebene
- Ziel: Agent-System → Self-Regulating Agent-OS

---

## Final Target State

Nach Phase 4:

- ✅ Kein Workstream ohne formale Validierung
- ✅ Keine Layer-Vermischung möglich
- ✅ Keine Annahmen ohne Clarification
- ✅ Jede Eskalation getrackt
- ✅ Governance-Score deterministisch messbar

---

## CUSTOMER DATA PLANE — Step 1-3 Integration

**Owner:** @implementer_codex  
**Autonomy Tier:** 3 (execute-with-approval)  
**Layer:** implementation  
**Status:** in_progress

**Scope:**
- `packages/customer-data/**` (new: Step 1 implementation)
- `packages/governance/src/policy/**` (new: PolicyEngine for Customer Data Plane)
- `apps/api/src/modules/agents/agents.runtime.ts` (tool handlers integration)
- `apps/api/src/modules/reviews/reviews.controller.ts` (AuthZ enforcement)
- `apps/api/src/modules/projects/projects.service.ts` (AuthZ enforcement)
- `apps/api/src/modules/decisions/decisions.service.ts` (mandatory ActionLogger)
- `apps/api/src/modules/projects/project-phase.store.ts` (DB-backed refactor)
- `infrastructure/db/migrations/004_project_phases.sql` (new: phase persistence)

**Structural Model:**
```
packages/customer-data/
├── src/
│   ├── connector.ts              (CustomerConnector interface)
│   ├── registry.ts                (ConnectorRegistry + MultiSourceConnectorRegistry)
│   ├── capability.schema.ts       (CapabilityMap types + validation)
│   ├── constraints.ts             (maxRows/fields enforcement, SQL rejection)
│   ├── routing/
│   │   └── multi-source-registry.ts
│   ├── result-hash.ts             (deterministic hash generation)
│   └── index.ts

packages/governance/src/policy/
├── policy-engine.ts               (authorize, sanitize, redact)
├── errors.ts                      (PolicyError types)
└── types.ts                       (PolicyContext, PolicyDecision types)

apps/api/src/modules/projects/
└── project-phase.store.ts         (DB-backed, async)

infrastructure/db/migrations/
└── 004_project_phases.sql         (add phase column)
```

**Deliverables:**
- Complete Step 1-3 integration
- PolicyEngine global enforcement (no gaps)
- Multi-source routing working
- ProjectPhase restart-safe
- All logs replay-ready
- Comprehensive test coverage
- Documentation updated

**Definition of Done:**
- [ ] All Step 1-3 components integrated
- [ ] PolicyEngine global enforcement verified (no bypass paths)
- [ ] Multi-source routing stable (operationId → source mapping)
- [ ] ProjectPhase restart-safe (DB-backed, migration added)
- [ ] Logs replay-ready (requestId, policyDecisionHash, resultHash)
- [ ] Tests passing (security, data plane, audit, persistence)
- [ ] No governance regression (existing flows still work)
- [ ] Reviewer approval obtained

**Risks:**
- **Risk 1:** Architectural Drift (duplicate policy logic)
  - **Impact:** high (maintenance burden, inconsistencies)
  - **Mitigation:** Centralize all policy logic in PolicyEngine, remove duplicates
- **Risk 2:** Breaking Changes (existing flows fail)
  - **Impact:** high (regression)
  - **Mitigation:** Comprehensive regression tests, careful migration
- **Risk 3:** Integration Complexity (multiple components)
  - **Impact:** medium (implementation errors)
  - **Mitigation:** Phase-by-phase implementation, tests at each phase
- **Risk 4:** Performance Impact (PolicyEngine overhead)
  - **Impact:** low (latency increase)
  - **Mitigation:** Efficient implementation, caching where appropriate

**Integration Phases:**

**PHASE 1 — Structural Consolidation**
- Create packages/customer-data/ structure
- Verify PolicyEngine location (packages/governance/src/policy/)
- Remove duplicate policy logic
- Ensure single source of truth

**PHASE 2 — Execution Flow Validation**
- Ensure exact chain: Controller → Orchestrator → ToolRouter → PolicyEngine → Connector
- Remove alternative branches
- Refactor direct DB access to use PolicyEngine

**PHASE 3 — Multi-Source Routing Verification**
- Implement MultiSourceConnectorRegistry
- CapabilityRegistry maps operationId → source
- Routing logic deterministic
- No default source (explicit error if missing)

**PHASE 4 — ProjectPhase Persistence Fix**
- Remove in-memory ProjectPhaseStore
- Implement DB-backed persistence
- Add migration 004_project_phases.sql
- Ensure restart-safe, atomic updates, audit log mandatory

**PHASE 5 — Audit & Replay Preparation**
- Enrich logs with metadata (requestId, policyDecisionHash, resultHash)
- Implement deterministic resultHash generation
- No PII in logs
- Test: same input → same resultHash

**Approval Gate:**
- Touching agents/**, governance/**, customer-data/** requires @reviewer_claude approval before merge

---

## COMPLIANCE HARDENING — Phase 1: Kritische Blocker (0-2 Wochen)

**Owner:** @implementer_codex  
**Reviewer:** @reviewer_claude  
**Autonomy Tier:** 3 (execute-with-approval)  
**Layer:** implementation  
**Status:** planning

**Scope:**
- `infrastructure/docker-compose.yml` (Secrets-Management)
- `infrastructure/db/migrations/005_user_consents.sql` (new)
- `infrastructure/db/migrations/006_data_deletion.sql` (new)
- `apps/api/src/modules/users/consent.service.ts` (new)
- `apps/api/src/modules/users/data-deletion.service.ts` (new)
- `packages/governance/src/policy/policy-engine.ts` (Consent-Check)
- `.github/workflows/secrets-scan.yml` (new)

**Structural Model:**
```
infrastructure/db/migrations/
├── 005_user_consents.sql          (consent tracking)
└── 006_data_deletion.sql          (deletion audit)

apps/api/src/modules/users/
├── consent.service.ts              (consent CRUD)
├── consent.controller.ts           (API endpoints)
├── data-deletion.service.ts        (deletion + anonymization)
└── data-deletion.controller.ts    (DELETE /users/:id/data)

packages/governance/src/policy/
└── policy-engine.ts                (consent check in authorize())

.github/workflows/
└── secrets-scan.yml                (truffleHog / git-secrets)
```

**Deliverables:**
- R-003: Secrets aus docker-compose.yml entfernt, .env.example erstellt
- R-003b: Secrets-Scanning in CI integriert (truffleHog / git-secrets)
- R-001: Consent-Management-System (Tabelle + Service + API + PolicyHook)
- R-002: DataDeletionService (Löschung + Log-Anonymisierung)

**Definition of Done:**
- [ ] Kein Secret im Repo (docker-compose.yml, .env.example)
- [ ] CI fail bei Secret-Detection
- [ ] Consent-Tabelle existiert (user_consents)
- [ ] Consent-Check in PolicyEngine.authorize() (customer_data.*)
- [ ] API-Endpoints: POST/DELETE/GET /users/:userId/consent
- [ ] DataDeletionService anonymisiert action_logs korrekt
- [ ] API-Endpoint: DELETE /users/:userId/data (mit Auth)
- [ ] Tests: Consent fehlt → Zugriff blockiert
- [ ] Tests: Consent widerrufen → Zugriff blockiert
- [ ] Tests: DataDeletion anonymisiert Logs
- [ ] Reviewer approval (@reviewer_claude)

**Risks:**
- **Risk 1:** Consent-Enforcement-Lücken (bypass paths)
  - **Impact:** high (DSGVO-Verletzung)
  - **Mitigation:** PolicyEngine als einziger Enforcement-Punkt, keine Bypass-Paths
- **Risk 2:** Data-Deletion Race Conditions (concurrent access)
  - **Impact:** medium (data loss)
  - **Mitigation:** Transactional deletion, soft-delete für audit logs
- **Risk 3:** Secrets-Scanning False Positives
  - **Impact:** low (CI noise)
  - **Mitigation:** Whitelist für bekannte false positives

**Workstreams:**

**WS1 — Secrets-Management (R-003, R-003b)** (Owner: @implementer_codex, Support: @ops_team)
- Entferne Passwörter aus docker-compose.yml
- Erstelle .env.example (ohne echte Secrets)
- Integriere truffleHog / git-secrets in CI
- Deliverable: Refactored docker-compose, .env.example, CI-Integration

**WS2 — Consent-Management (R-001)** (Owner: @implementer_codex, Support: @reviewer_claude)
- DB Migration: user_consents Tabelle
- ConsentService: CRUD-Operationen
- PolicyEngine: Consent-Check in authorize()
- API-Endpoints: POST/DELETE/GET /users/:userId/consent
- Deliverable: Consent-System vollständig integriert

**WS3 — Data-Deletion (R-002)** (Owner: @implementer_codex, Support: @reviewer_claude)
- DB Migration: data_deletion_audit Tabelle (optional)
- DataDeletionService: Löschung + Anonymisierung
- API-Endpoint: DELETE /users/:userId/data
- Deliverable: Lösch-Service + Log-Anonymisierung

**WS4 — QA Tests** (Owner: @observability_eval, Support: @implementer_codex)
- Consent fehlt → Zugriff blockiert
- Consent widerrufen → Zugriff blockiert
- DataDeletion anonymisiert Logs korrekt
- CI bricht bei Secret ab
- Deliverable: Test-Suite für Phase 1

**Approval Gate:**
- Touching governance/**, users/** requires @reviewer_claude approval

---

## COMPLIANCE HARDENING — Phase 2: Compliance-Struktur (2-6 Wochen)

**Owner:** @implementer_codex  
**Reviewer:** @reviewer_claude  
**Autonomy Tier:** 3 (execute-with-approval)  
**Layer:** implementation  
**Status:** planning

**Scope:**
- `infrastructure/db/migrations/007_user_roles.sql` (new)
- `apps/api/src/modules/users/user-roles.service.ts` (new)
- `packages/governance/src/policy/policy-engine.ts` (RBAC-Erweiterung)
- `apps/api/src/filters/policy-error.filter.ts` (Error-Sanitization)
- `apps/api/src/middleware/audit-log.middleware.ts` (new)

**Structural Model:**
```
infrastructure/db/migrations/
└── 007_user_roles.sql              (user_roles + permissions)

apps/api/src/modules/users/
└── user-roles.service.ts            (role management)

packages/governance/src/policy/
└── policy-engine.ts                 (RBAC + permission guard)

apps/api/src/
├── filters/
│   └── policy-error.filter.ts       (production-safe errors)
└── middleware/
    └── audit-log.middleware.ts      (mandatory logging)
```

**Deliverables:**
- R-004: Vollständiges RBAC (user_roles + permission matrix)
- R-005: Mandatory Audit Logging (Middleware)
- R-005b: Log Retention Policy (Config)
- R-008: Error Sanitization (Production-safe ErrorFilter)

**Definition of Done:**
- [ ] user_roles Tabelle existiert
- [ ] Permission-Mapping implementiert
- [ ] PolicyEngine Permission Guard für alle Operationen
- [ ] Role-Hierarchie (admin > reviewer > user)
- [ ] Audit-Log-Middleware für alle kritischen Endpoints
- [ ] Log-Retention-Config (7 Jahre audit, 90 Tage app)
- [ ] ErrorFilter sanitized für Production
- [ ] Tests: Role-switch, Unauthorized Access, Escalation Fail
- [ ] Reviewer approval (@reviewer_claude)

**Risks:**
- **Risk 1:** Privilege Escalation (unauthorized role-switch)
  - **Impact:** high (security breach)
  - **Mitigation:** Role-Hierarchie-Validierung, Permission-Guard
- **Risk 2:** Audit-Logging-Lücken (optional paths)
  - **Impact:** high (compliance violation)
  - **Mitigation:** Middleware als einziger Logging-Punkt, keine Bypass-Paths
- **Risk 3:** Error-Sanitization zu aggressiv (Debugging erschwert)
  - **Impact:** low (developer experience)
  - **Mitigation:** Environment-basierte Sanitization (dev vs. prod)

**Workstreams:**

**WS1 — RBAC Implementation (R-004)** (Owner: @implementer_codex, Support: @reviewer_claude)
- DB Migration: user_roles Tabelle
- UserRolesService: Role-Management
- PolicyEngine: Permission-Guard erweitern
- Role-Hierarchie implementieren
- Deliverable: Vollständiges RBAC-System

**WS2 — Mandatory Audit Logging (R-005, R-005b)** (Owner: @implementer_codex, Support: @observability_eval)
- Audit-Log-Middleware erstellen
- Alle kritischen Endpoints instrumentieren
- Log-Retention-Config definieren
- Deliverable: Mandatory Logging + Retention Policy

**WS3 — Error Sanitization (R-008)** (Owner: @implementer_codex, Support: @observability_eval)
- ErrorFilter für Production erweitern
- Environment-basierte Sanitization
- Security-Headers setzen
- Deliverable: Production-safe Error-Handling

**WS4 — QA Tests** (Owner: @observability_eval, Support: @implementer_codex)
- Role-switch Tests
- Unauthorized Access Tests
- Escalation Fail Cases
- Audit-Logging-Coverage Tests
- Deliverable: Test-Suite für Phase 2

**Approval Gate:**
- Touching governance/**, users/**, middleware/** requires @reviewer_claude approval

---

## COMPLIANCE HARDENING — Phase 3: Enterprise Hardening (6-12 Wochen)

**Owner:** @implementer_codex  
**Reviewer:** @reviewer_claude  
**Autonomy Tier:** 2 (draft-only)  
**Layer:** architecture  
**Status:** planning

**Scope:**
- `packages/governance/src/policy/prompt-sanitizer.ts` (new)
- `packages/governance/src/policy/dlp.ts` (new)
- `docs/infrastructure-security.md` (new)
- `infrastructure/gateway/` (new: TLS, Rate Limiting)
- `infrastructure/monitoring/` (new: Alerting Pipeline)

**Structural Model:**
```
packages/governance/src/policy/
├── prompt-sanitizer.ts             (prompt injection protection)
└── dlp.ts                          (data loss prevention)

docs/
└── infrastructure-security.md      (network diagram, TLS, firewall)

infrastructure/
├── gateway/
│   └── hardened-gateway.ts         (TLS, rate limiting)
└── monitoring/
    └── alerting-pipeline.ts        (failed logins, unusual access)
```

**Deliverables:**
- R-006: Prompt Sanitizer (Prompt-Injection-Schutz)
- R-007: Data Loss Prevention (DLP) (Export Limits + Domain Blocking)
- INF-001: Infrastructure Security Docs (Network Diagram)
- INF-002: TLS / Rate Limiting (Hardened Gateway)
- INF-003: Monitoring & Alerting (Alerting Pipeline)

**Definition of Done:**
- [ ] PromptSanitizer implementiert (FORBIDDEN_PATTERNS)
- [ ] DLP-Service implementiert (MAX_EXPORT_ROWS, BLOCKED_DOMAINS)
- [ ] Infrastructure-Security-Dokumentation erstellt
- [ ] TLS für alle Verbindungen
- [ ] Rate-Limiting für API-Endpoints
- [ ] Alerting-Pipeline (Failed Logins, Unusual Access)
- [ ] Tests: Prompt-Injection-Block, Export-Limit, Domain-Block
- [ ] Reviewer approval (@reviewer_claude)

**Risks:**
- **Risk 1:** Prompt-Sanitization zu aggressiv (legitime Prompts blockiert)
  - **Impact:** medium (functionality loss)
  - **Mitigation:** Whitelist für bekannte legitime Patterns
- **Risk 2:** DLP False Positives (legitime Exports blockiert)
  - **Impact:** medium (user experience)
  - **Mitigation:** Configurable thresholds, admin override
- **Risk 3:** Infrastructure-Dokumentation veraltet
  - **Impact:** low (maintenance burden)
  - **Mitigation:** Automated documentation updates in CI

**Workstreams:**

**WS1 — Prompt Sanitizer (R-006)** (Owner: @implementer_codex, Support: @reviewer_claude)
- PromptSanitizer implementieren
- FORBIDDEN_PATTERNS definieren
- Input-Validierung erweitern
- Deliverable: Prompt-Injection-Schutz

**WS2 — Data Loss Prevention (R-007)** (Owner: @implementer_codex, Support: @ops_team)
- DLP-Service implementieren
- Export-Limits definieren
- Domain-Blocking implementieren
- Deliverable: DLP-System

**WS3 — Infrastructure Security (INF-001, INF-002, INF-003)** (Owner: @ops_team, Support: @reviewer_claude)
- Infrastructure-Security-Dokumentation
- TLS-Konfiguration
- Rate-Limiting-Integration
- Alerting-Pipeline
- Deliverable: Hardened Infrastructure

**WS4 — QA Tests** (Owner: @observability_eval, Support: @implementer_codex)
- Prompt-Injection-Block Tests
- Export-Limit Tests
- Domain-Block Tests
- Infrastructure-Security-Validation
- Deliverable: Test-Suite für Phase 3

**Approval Gate:**
- Touching governance/**, infrastructure/** requires @reviewer_claude approval

---

## Compliance Hardening — Abhängigkeitslogik

```
Secrets Fix (R-003)
    ↓
Consent Layer (R-001)
    ↓
Data Deletion (R-002)
    ↓
RBAC (R-004)
    ↓
Audit Completion (R-005)
    ↓
DLP & Sanitization (R-006, R-007)
    ↓
Enterprise Readiness (INF-001, INF-002, INF-003)
```

**Kritische Erfolgsfaktoren:**
- ✅ Keine "Compliance als Feature" – sondern als Systemlayer
- ✅ PolicyEngine ist der zentrale Enforcement-Punkt
- ✅ Audit Logging darf niemals optional sein
- ✅ Secrets niemals im Repo
- ✅ Timezone / Clock-Integrity sauber halten

**Erwartete Compliance-Verbesserung:**

| Phase | DSGVO | ISO 27001 | SOC 2 | Gesamt |
|-------|-------|-----------|-------|--------|
| **Jetzt** | 4/10 | 5/10 | 6/10 | 5/10 |
| **Phase 1** | 7.5/10 | 7/10 | 6.5/10 | 7/10 |
| **Phase 2** | 8.5/10 | 8/10 | 7.5/10 | 8/10 |
| **Phase 3** | 9/10 | 9/10 | 8.5/10 | 9/10 |

---