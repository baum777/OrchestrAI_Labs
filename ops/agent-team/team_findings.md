# Team Findings (Log)

**Version:** 1.0.0  
**Owner:** @implementer_codex  
**Layer:** implementation  
**Last Updated:** 2026-02-21T08:53:32Z  
**Definition of Done:**
- [ ] Findings haben Timestamp, Owner, Impact, Suggested Action
- [ ] Format ist konsistent (ISO Timestamp)
- [ ] Keine Layer-Vermischung (nur implementation findings)

---

## Format
- YYYY-MM-DDTHH:MM:SSZ — [Owner] Finding — Impact — Suggested action

---

## ANALYTICS v1 Security Hardening — Enterprise Compliance (2026-02-19T22:00:00Z)

**Finding:** Enterprise compliance audit NON-COMPLIANT due to: 1) Missing AuthN/AuthZ on /analytics/*, 2) Tenant isolation not enforced (clientId/projectId freely selectable via query), 3) Timestamps not guaranteed ISO-UTC (MAX(created_at)::text), 4) Input validation evidence unclear, 5) Migration 008 detection optional.

**Impact:** High — Compliance gap, potential cross-tenant data access.

**Action:** Security Hardening Run (Phases 1–7) — AuthN via X-User-Id guard, AuthZ via PolicyEngine analytics.read, Tenant binding via X-Client-Id required, ISO timestamps in service, ValidationPipe on controller.

---

## ANALYTICS v1 — Logging Integrity Audit (2026-02-19T19:00:00Z)

### 1. Event Inventory (ActionLogger Usage)

| action | file location | fields logged | format |
|--------|---------------|---------------|--------|
| TIME_GAP_DETECTED | orchestrator.ts:182 | agentId, userId, projectId, clientId, action, input{gapMin,lastSeen,nowIso}, output{sessionMode,threshold}, ts, blocked | flat + input/output JSON |
| skill.blocked.* | orchestrator.ts | agentId, userId, projectId, clientId, action, input, output, ts, blocked, reason, skillId?, skillVersion?, skillBlockReason? | flat + JSON |
| skill.executed / skill.failed | orchestrator.ts:398 | agentId, userId, projectId, clientId, action, input, output, ts, blocked, reason, skillId, skillVersion, skillRunId, skillStatus, skillDurationMs | flat + JSON |
| skill.warn.deprecated | orchestrator.ts:332 | agentId, userId, projectId, clientId, action, input, output, ts, blocked, skillId, skillVersion, skillStatus | flat + JSON |
| agent.run | orchestrator.ts:447 | agentId, userId, projectId, clientId, action, input{sessionMode}, output, ts | flat + JSON |
| agent.blocked.* | orchestrator.ts | agentId, userId, projectId, clientId, action, input, output, ts, blocked, reason | flat + JSON |
| escalation | orchestrator.ts, escalation-log.ts | agentId, userId, projectId, clientId, action, input{reason,details,context}, output{escalated,timestamp}, ts, blocked, reason | flat + input JSON |
| decision.draft.created | orchestrator.ts:651 | agentId, userId, projectId, clientId, action, input, output, ts | flat + JSON |
| decision.finalized | orchestrator.ts:689, decisions.service.ts | agentId, userId, projectId, clientId, action, input, output, ts | flat + JSON |
| decision.draft.intent | decisions.service.ts:288 | agentId, userId, projectId, clientId, action, input, output, ts | flat + JSON |
| agent.executed / agent.executed.commit | orchestrator.ts | agentId, userId, projectId, clientId, action, input, output, ts | flat + JSON |
| project.phase.updated | projects.service.ts:84 | agentId, userId, projectId, clientId, action, input, output, ts | flat + JSON |
| knowledge.search | knowledge.service.ts:77 | agentId, userId, projectId, clientId, action, input, output, ts | flat + JSON |
| review.access.denied | reviews.controller.ts | user_id, agent_id, action, input_json, output_json, blocked, reason, created_at, project_id, client_id | direct INSERT (project_id/client_id from review_requests, best-effort) — FIXED 2026-02-19 |
| customer_data.access | agents.runtime.ts | agentId, userId, projectId, clientId, action, input, output{rowCount,fieldsReturned,latencyMs,sourceType,resultHash?}, ts | flat + JSON |
| data.deletion.executed | data-deletion.service.ts:83 | agentId, userId, projectId?, clientId?, action, input, output, ts | flat + JSON |
| http.* | audit-log.middleware.ts:100 | agentId, userId, projectId, clientId, action, input{method,path,query,body,headers}, output{statusCode,body,latencyMs}, ts, blocked, reason | flat + JSON |

### 2. Field Integrity Matrix

| field | Skill | Governance | Review | Status |
|-------|-------|------------|--------|--------|
| skillId | present (optional) | - | - | present |
| skillVersion | present (optional) | - | - | present |
| skillRunId | present (skill execution) | - | - | present |
| skillStatus | present (optional) | - | - | present |
| skillDurationMs | present (skill execution) | - | - | present |
| skillBlockReason | present (blocked) | - | - | present |
| action | present | present | present | present |
| ts (UTC ISO) | present | present | present (via created_at) | present |
| projectId | present | present | present (review.access.denied — from review_requests) | present |
| clientId | present | present | present (review.access.denied — from review_requests) | present |
| agentId | present | present | present | present |
| reason | present (blocked) | present | present | present |
| decisionHash | - | in output_json (customer_data) | - | present (enriched) |
| reviewId | - | - | in input_json | present |
| permission | - | - | in review_requests | present |
| status | - | - | in review_requests | present |
| commit_token_used | - | - | in review_requests | present |

### 3. Logging Gaps Report

- **Gap 1 (FIXED 2026-02-19):** ReviewsController direct INSERT — project_id, client_id now populated from review_requests (best-effort) before INSERT. Analytics filters work for review.access.denied.
- **Gap 2:** ReviewsController uses `now()` instead of Clock — Minor; created_at is server time. No change required for analytics.
- **Conclusion:** Logging is sufficient for Analytics v1. Gap 1 resolved in hardening pass.

### 4. Minimal Logging Enrichment Plan

**Implemented:** review.access.denied now fetches project_id, client_id from review_requests WHERE id = reviewId before INSERT. Best-effort (null if review not found).

**Logging Readiness Score: 9/10** — Core fields present, review.access.denied gap fixed.

---

## Entries

- 2026-02-21T08:53:32Z — [@teamlead_orchestrator] `docs/DOCS_BLUEPRINT_SPEC.md` fehlte als geforderte Source-of-Truth fuer Doku-Topologie und Trigger-Logik — Ohne zentrale Spezifikation entstehen widerspruechliche, nicht pruefbare Regeln ueber mehrere Dateien — Canonical Blueprint Spec eingefuehrt und als Referenz fuer Layer, Trigger-Mapping und PR-Ausgabeformat gesetzt
- 2026-02-21T08:53:32Z — [@teamlead_orchestrator] `PR_DESCRIPTION.md` war als zustandsspezifischer Bericht belegt statt als wiederverwendbares Template — Uneinheitliche PR-Outputs und fehlende Pflichtsektionen (Risk/Rollback/Verification) — Datei auf blueprint-konformes Template mit verpflichtenden Sections normalisiert
- 2026-02-21T08:53:32Z — [@teamlead_orchestrator] Dokumentationsregeln sind ueber Root/Docs/Partner/Marketing verstreut und teils redundant — Drift-Risiko bei Governance-/Lifecycle-Aussagen und unklare Canonical-Quelle — Vollstaendige Inventory+Conflict Tabelle erstellt (`docs/DOCS_BLUEPRINT_ALIGNMENT_DRAFT.md`) und Canonical/derived Trennung festgelegt
- 2026-02-21T08:53:32Z — [@teamlead_orchestrator] Golden-Task-Evidence ist inkonsistent (8 Task-Dokumente vs. 2 Fixture-Eintraege in `testdata/golden-tasks/index.json`; `minimum_required: 25`) — Verifikation kann uneinheitlich ausfallen — Im Draft als Gap dokumentiert; Follow-up Workstream fuer Fixture-/Baseline-Abgleich empfohlen
- 2026-02-21T08:53:32Z — [@teamlead_orchestrator] Kurzdocs `docs/project-phases.md` und `docs/agent-types.md` kollidieren mit detailierteren Canonical-Quellen — Gefahr von semantischer Doppelpflege — Als deprecate-Kandidaten mit Verweisstrategie im Alignment-Draft markiert (ohne destructive/move Aktion)

- 2026-02-21T08:02:06Z — [@implementer_codex] Es gibt kein dediziertes Repo-Dokument mit kompakter Produktlogik-Spezifikation (Kurzbeschreibung + fachliche Muss-Regeln) — Uneinheitliche Kommunikation von Scope, Invarianten und Ablauf zwischen Pitch, Architektur und Operations-Doku — Neues Referenzdokument `docs/produktlogik-spezifikation.md` anlegen und im `README.md` verlinken
- 2026-02-15T17:57:43Z — [GPT-5.2] Test-Harness Drift: `apps/api/package.json` referenziert `test/golden-tasks/golden-tasks.e2e.spec.ts`, aber `apps/api/test/**` enthält aktuell nur `test/app.e2e-spec.ts` Placeholder — `pnpm -C apps/api test:golden` ist im IST-Zustand nicht ausführbar — Test-only Harness-Dateien (jest config + utils + golden specs) wiederherstellen/neu anlegen, ohne Produktcode zu ändern
- 2026-02-15T17:57:43Z — [GPT-5.2] Reale Governance-Block Reasons (Runtime) existieren bereits und sind testbar — Finalize: `finalize_review_not_found`, `finalize_review_not_approved`, `finalize_project_mismatch`, `finalize_invalid_status` (in `DecisionsService.finalizeFromDraft` via `logEscalation`); Commit-Run: `invalid_commit_token`, `commit_mismatch`, `payload_tamper` (in `Orchestrator.run`, action='escalation', `input.reason`) — Tests sollen `action_logs` (action='escalation', blocked=true, input_json.reason) assertieren
- 2026-02-14T00:00:00Z — [GPT-5.2] Keine bestehende Partner-/Vertriebs-Doku gefunden — Onboarding-Paper muss neu erstellt werden — Neues Dokument in `docs/geschaeftspartner-onboarding-konzept.md` anlegen, konsistent zum Produktüberblick in `README.md`
- 2026-02-14T14:54:41Z — [GPT-5.2] Agentensystem-IST ist bereits detailliert dokumentiert — Onepager kann als kondensierte Ableitung erstellt werden, ohne neue technische Annahmen einzuführen — `docs/onepager-agentensystem-pitch.md` und `docs/onepager-agentensystem-architektur.md` aus `docs/ist-zustand-agent-system.md` ableiten und klar auf Usecases/Rollen/Gates fokussieren
- 2026-02-12T18:43:39Z — [Auto] Shared Decision Types bereits vorhanden — `packages/shared/src/types/decision.ts` enthält `DecisionStatus`, `DecisionBase`, `DecisionDraft`, `DecisionFinal` mit korrekter Struktur — Types sind funktional korrekt, Sections fehlen als explizite Kommentare
- 2026-02-12T18:43:39Z — [Auto] DecisionFinal.reviewId ist required — Type-Level (`reviewId: string`) und Runtime-Checks in `DecisionsService.finalizeFromDraft()` erzwingen reviewId für Final-Status — Invariante muss erhalten bleiben
- 2026-02-12T18:43:39Z — [Auto] DB-Schema vs. Type-Mapping — DB verwendet snake_case, Types camelCase — Mapping in `DecisionsService.mapRow()` korrekt, dokumentieren
- 2026-02-12T18:43:39Z — [Auto] Barrel-File unvollständig — `packages/shared/src/index.ts` exportiert `decision.ts`, aber nicht `review.ts` — Optional: `review.ts` hinzufügen oder `types/index.ts` erstellen
- 2026-02-12T18:43:39Z — [Auto] Sections nicht explizit in Types strukturiert — `DecisionBase` enthält alle Felder flach, Sections nur in `docs/decisions.md` dokumentiert — Optional: Kommentar-Blöcke in `DecisionBase` hinzufügen
- 2026-02-12T19:27:59Z — [Auto] BLOCK 1 · Schritt 1 abgeschlossen — Section Types eingeführt, DecisionBase als Komposition, GATO Charter dokumentiert — Types sind non-breaking, Typecheck grün, Invarianten erhalten (DecisionFinal.reviewId required)
- 2026-02-12T21:29:01Z — [Auto] BLOCK 1.5 abgeschlossen — Barrel-File vollständig: `review.ts` über `packages/shared/src/index.ts` exportiert — `CommitToken` Type jetzt über Barrel verfügbar, keine Consumer-Änderungen erforderlich, Typecheck grün
- 2026-02-12T21:35:14Z — [Auto] BLOCK 2 abgeschlossen — DTO/Schema Validation implementiert: CreateDecisionDraftDto und FinalizeDecisionDto mit class-validator, ValidationPipe global aktiviert, finalizeFromDraft Endpoint hinzugefügt — Payload-Validierung für createDraft und finalizeFromDraft aktiv, klare Fehlermeldungen (field-basiert), keine Business-Logik geändert, Invarianten erhalten (DecisionFinal.reviewId required)
- 2026-02-12T21:35:14Z — [Auto] Bestehender Build-Fehler — `apps/api/tsconfig.json`: rootDir vs include Konflikt (test/app.e2e-spec.ts nicht unter rootDir), moduleResolution muss NodeNext sein — Nicht mit BLOCK 2 Änderungen verbunden, bestehendes Konfigurationsproblem
- 2026-02-12T23:22:42Z — [Auto] BLOCK 2.1 abgeschlossen — Governance Purity wiederhergestellt: Global ValidationPipe entfernt (nur lokal im Decisions Controller), REST finalize Endpoint entfernt (Bypass-Risiko eliminiert), FinalizeDecisionDto gelöscht (ung genutzt) — Finalisierung bleibt Commit-Run only (tool.decisions.finalizeFromDraft), createDraft validiert weiterhin via DTO, Invarianten erhalten (kein Final ohne review_id)
- 2026-02-12T23:35:15Z — [Auto] BLOCK 3 abgeschlossen — Review Gate Hardening implementiert: finalizeFromDraft prüft decision.status === 'draft' (vor UPDATE), review.projectId match, präzise Fehlermeldungen, Logging Enforcement (vor/nach Finalisierung, Fehler blockieren), Tool Handler übergibt ActionLogger — Governance-Bypass unmöglich: Finalisierung blockiert wenn status != draft, review nicht approved, projectId mismatch, oder Logging fehlschlägt; Orchestrator Guard bereits vorhanden (CommitToken-Validierung)
- 2026-02-13T00:03:39Z — [Auto] BLOCK 4 abgeschlossen — Drift Monitoring implementiert: GET /monitoring/drift Endpoint mit 5 Metriken (reviewRejectionRate, missingLogIncidents, reworkCount, escalationRate=null, decisionCompleteness), read-only Queries auf bestehende Tabellen, Playbook mit Schwellenwerten und Maßnahmen, Anti-Gaming (wöchentliche Stichprobe) — Monitoring ohne Dashboards/Automationen, Escalation-Rate nicht instrumentiert (TODO), alle Metriken auditierbar
- 2026-02-13T00:12:51Z — [Auto] BLOCK 4.1 abgeschlossen — Escalation Instrumentation implementiert: Escalation-Logging Helper erstellt, Trigger Points in Orchestrator (invalid_commit_token, commit_mismatch, payload_tamper) und finalizeFromDraft (invalid_status, review_not_found, review_not_approved, project_mismatch), Monitoring Query aktualisiert (escalationRate als Zahl), Playbook aktualisiert — Escalation-Events werden in action_logs geschrieben (append-only), keine DB-Migration, keine neuen Tabellen, Escalation-Rate vollständig instrumentiert
- 2026-02-13T01:06:24Z — [Auto] BLOCK 5 abgeschlossen — Knowledge Search implementiert: GET /knowledge/search Endpoint (project-scoped, read-only), Queries für decisions/reviews/logs, Audit-Logging (blockiert Search wenn fehlschlägt), tool.knowledge.search Handler aktualisiert — Search funktioniert für decisions/reviews/logs, projectId required, keine Knowledge-Writes, keine DB-Migration, keine neuen Tabellen, Audit-Logging enforced
- 2026-02-13T09:00:28Z — [Auto] BLOCK 6 abgeschlossen — Projektkontext & Phasen-Hinweise implementiert: ProjectPhase Type in shared, ProjectPhaseStore (In-Memory), GET /projects/:projectId/context Endpoint mit Phase-Hints, PUT /projects/:projectId/phase Endpoint (optional, mit Audit-Logging) — Read-only Context-Layer, keine DB-Migration, keine Lifecycle-Änderung, Phase-Hints statisch definiert (focus, reviewChecklist, commonRisks pro Phase)
- 2026-02-13T12:00:00Z — [Auto] BLOCK 7 abgeschlossen — Repo-Integration für Golden Tasks implementiert: docs/golden-tasks/ mit README, TEMPLATE, 8 Tasks (GT-001 bis GT-008), testdata/golden-tasks/ mit index.json + 2 Task fixtures (GT-001, GT-002), manuelle Test-Dokumentation (kein Test-Framework vorhanden) — Golden Tasks als Source-of-Truth für Demo + Tests, keine Live-Fetches, keine Secrets, alle Tasks dokumentiert, Fixtures für 2 Tasks vorhanden
- 2026-02-13T13:00:00Z — [Auto] BLOCK 8 abgeschlossen — Minimal Test Harness implementiert: Jest + Supertest installiert, jest.config.cjs mit Workspace-Package-Mapping, createTestApp Utility für NestJS E2E-Tests, golden-tasks.e2e.spec.ts mit GT-001 und GT-002 automatisierte Tests, Monitoring Smoke Check — Tests laufen gegen echte DB (DATABASE_URL erforderlich), keine Produktcode-Änderungen, Working Directory Handling für Profile-Loader, TypeScript-Warnings ignoriert (diagnostics.ignoreCodes)
- 2026-02-13T14:00:00Z — [Auto] BLOCK 8.1 abgeschlossen — Golden Task Tests stabilisiert: Fixture-Pfad korrigiert (repoRoot statt __dirname), README bereinigt (doppelte Abschnitte entfernt, klare Struktur), DATABASE_URL-Fehlermeldung hinzugefügt (klare Meldung statt generischer DB-Fehler) — Tests professionell, keine "hacky" Artefakte, klare Fehlermeldungen, stabile Pfade
- 2026-02-13T18:00:00Z — [Auto] System-Audit abgeschlossen — Vollständiges Datenfluss-Audit durchgeführt: 5 Workstreams (Entry Points, Agent Data Acquisition, Transformations, Persistence, Governance), 13 API Endpoints kartiert, Datenflüsse end-to-end analysiert, 3 High-Risk-Pfade identifiziert (ProjectPhaseStore nicht persistiert, Reviewer-Auth fehlt, Profile-Path hardcoded), Audit-Report erstellt — AGENT_DATA_FLOW_AUDIT_REPORT.md mit vollständiger Dokumentation, alle Flows nachvollziehbar, Governance-Traceability verifiziert, Empfehlungen priorisiert
- 2026-02-13T19:00:00Z — [Auto] Customer Data Plane: Contracts Spec erstellt — TypeScript Interfaces definiert (CustomerConnector, ConnectorRegistry, CapabilityRegistry), Tool API Shape spezifiziert (operationId + params, NO SQL), ActionLog Schema für customer_data.access definiert, Hard Constraints dokumentiert (maxRows=200 default, allowlisted fields, explicit SQL rejection) — Contracts Spec vollständig, File Layout vorgeschlagen, Implementation Checklist erstellt
- 2026-02-18T16:30:00Z — [GPT-5.2] Timestamp-Inkonsistenz in Dokumentations-Headern identifiziert — `docs/ist-zustand-agent-system.md` hat **Erstellt:** 2026-02-13 und **Aktualisiert:** 2024-01-15 (updatedAt < createdAt) — Systemisch nicht möglich, verletzt Timestamp-Integrität — Timestamp-Integritäts-Utility erstellt (`packages/shared/src/utils/timestamp-integrity.ts`), DocumentHeaderValidator erweitert für Erstellt/Aktualisiert-Validierung, Self-healing implementiert, Tests geschrieben
- 2026-02-19T12:00:00+01:00 — [@implementer_codex] Phase 2 WS1 RBAC implementiert — DB Migration 007_user_roles.sql erstellt (user_roles, user_permissions, role_permissions Tabellen), UserRolesService implementiert (Role-Management, Permission-Resolver, Role-Hierarchie), PolicyEngine erweitert (getRequiredPermissions, PermissionResolver Interface, Least-Privilege Enforcement) — `infrastructure/db/migrations/007_user_roles.sql`, `apps/api/src/modules/users/user-roles.service.ts`, `packages/governance/src/policy/policy-engine.ts`, `apps/api/src/modules/users/users.module.ts` — UserRolesService in PolicyEngine integrieren (DI), dann WS2 (Audit Logging) starten
- 2026-02-19T13:30:00+01:00 — [@implementer_codex] Phase 2 WS2 Audit Logging implementiert — AuditLogMiddleware erstellt (automatisches Logging für POST/PUT/DELETE/PATCH und kritische GET-Endpoints, mandatory enforcement, User-ID/Operation/Timestamp/Result logging), Log-Retention-Config erstellt (7 Jahre audit, 90 Tage app, konfigurierbar via ENV), Middleware in AppModule registriert (global für alle Routes) — `apps/api/src/middleware/audit-log.middleware.ts`, `apps/api/src/config/log-retention.config.ts`, `apps/api/src/app.module.ts` — WS3 starten: Error Sanitization
- 2026-02-19T14:00:00+01:00 — [@implementer_codex] Phase 2 WS3 Error Sanitization implementiert — PolicyErrorFilter production-safe erweitert (Environment-basierte Sanitization: Production = generische Fehlermeldungen, Development = detaillierte Fehler + Stack-Traces), SecurityHeadersMiddleware erstellt (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Content-Security-Policy, X-Powered-By entfernt), Beide Middlewares in AppModule registriert — `apps/api/src/filters/policy-error.filter.ts`, `apps/api/src/middleware/security-headers.middleware.ts`, `apps/api/src/app.module.ts` — WS4 starten: E2E Tests
- 2026-02-19T14:30:00+01:00 — [@implementer_codex] Phase 2 Integration: UserRolesService → PolicyEngine abgeschlossen — createPolicyEngine erweitert (permissionResolver Parameter), AgentsModule aktualisiert (UserRolesService injiziert in PolicyEngine Factory), ReviewsController erweitert (UserRolesService integriert, Rollen werden aus DB aufgelöst wenn nicht im Request), ReviewsModule aktualisiert (UsersModule importiert) — `apps/api/src/modules/agents/customer-data.providers.ts`, `apps/api/src/modules/agents/agents.module.ts`, `apps/api/src/modules/reviews/reviews.controller.ts`, `apps/api/src/modules/reviews/reviews.module.ts` — PolicyEngine nutzt jetzt UserRolesService für Permission-Resolution, Rollen werden automatisch aus DB geholt wenn nicht im PolicyContext
- 2026-02-19T15:00:00+01:00 — [@implementer_codex] Phase 2 WS4 E2E Tests implementiert — RBAC E2E Tests erstellt (5 Tests: Role assignment grants permissions, Role revocation removes permissions, Unauthorized access blocked, Role hierarchy works, Explicit permissions work, Unauthorized review approval blocked), Audit-Logging E2E Tests erstellt (6 Tests: POST/PUT/DELETE requests logged, Critical GET endpoints logged, Required fields in logs, Safe endpoints NOT logged), Test-Script hinzugefügt (test:compliance) — `apps/api/test/compliance/rbac.e2e.spec.ts`, `apps/api/test/compliance/audit-logging.e2e.spec.ts`, `apps/api/package.json` — Tests ausführen: `pnpm -C apps/api test:compliance`
- 2026-02-19T18:00:00+01:00 — [@teamlead_orchestrator] Phase 2 CI Closure: CI-blockierende Probleme behoben — apps/web tsconfig.base.json Pfad-Problem behoben (lokale Kopie + ESLint parserOptions), lint:clock Script verifiziert (existiert in root package.json), secrets-scan Workflow verifiziert (trufflesecurity/trufflehog:3 korrekt), pnpm -r lint grün — Alle CI-blockierenden Fehler behoben, non-blocking Fehler in team_todo_ci_closure.md dokumentiert — `apps/web/tsconfig.base.json`, `apps/web/.eslintrc.json`, `ops/agent-team/team_todo_ci_closure.md` — Phase 2 als "completed" markieren, verbleibende TODOs in separatem Workstream behandeln

---

## Customer Data Plane — Contracts Spec (WS1)

**Owner:** @reviewer_claude  
**Layer:** architecture  
**Date:** 2026-02-13T19:00:00Z

### 1. TypeScript Interfaces

#### CustomerConnector Interface
```typescript
export interface CustomerConnector {
  /**
   * Execute a read-only operation identified by operationId.
   * @param operationId - Must be allowlisted in CapabilityRegistry
   * @param params - Operation-specific parameters (validated against capability schema)
   * @param constraints - Runtime constraints (maxRows, allowedFields)
   * @returns ReadModelResult with data, metadata, and execution metrics
   */
  executeReadModel(
    operationId: string,
    params: Record<string, unknown>,
    constraints: ReadConstraints
  ): Promise<ReadModelResult>;
}

export type ReadConstraints = {
  maxRows: number;           // Default 200, capability can override lower
  allowedFields?: string[];  // If specified, only these fields returned
};

export type ReadModelResult = {
  data: unknown[];           // Array of result rows/objects
  metadata: {
    rowCount: number;        // Actual rows returned
    fieldsReturned: string[]; // Field names in result
    sourceType: string;      // e.g., "postgres", "rest_api", "graphql"
  };
  executionMetrics: {
    latencyMs: number;       // Execution time in milliseconds
  };
};
```

#### ConnectorRegistry Interface
```typescript
export interface ConnectorRegistry {
  /**
   * Get connector for a clientId.
   * @throws Error if clientId not registered
   */
  getConnector(clientId: string): CustomerConnector;
  
  /**
   * Register a connector for a clientId.
   */
  register(clientId: string, connector: CustomerConnector): void;
  
  /**
   * Check if clientId has a registered connector.
   */
  hasConnector(clientId: string): boolean;
}
```

#### CapabilityRegistry Interface
```typescript
export interface CapabilityRegistry {
  /**
   * Get capability map for a clientId.
   * @returns CapabilityMap or undefined if not registered
   */
  getCapabilities(clientId: string): CapabilityMap | undefined;
  
  /**
   * Register capabilities for a clientId.
   */
  register(clientId: string, capabilities: CapabilityMap): void;
  
  /**
   * Check if operationId is allowlisted for clientId.
   */
  isOperationAllowed(clientId: string, operationId: string): boolean;
  
  /**
   * Get operation schema for validation.
   */
  getOperationSchema(clientId: string, operationId: string): OperationSchema | undefined;
}

export type CapabilityMap = {
  operations: Record<string, OperationCapability>;
  defaultMaxRows?: number;  // Override global default (200), can only be lower
};

export type OperationCapability = {
  operationId: string;
  description?: string;
  allowedFields?: string[];  // If specified, only these fields can be requested
  maxRows?: number;          // Override for this operation (can only be lower than default)
  paramsSchema?: {
    type: "object";
    properties: Record<string, { type: string; required?: boolean }>;
  };
};

export type OperationSchema = OperationCapability["paramsSchema"];
```

### 2. Tool API Shape

#### Tool: tool.customer_data.executeReadModel
```typescript
type ExecuteReadModelInput = {
  clientId: string;          // Required
  operationId: string;        // Required, must be allowlisted
  params?: Record<string, unknown>;  // Optional, validated against operation schema
  constraints?: {
    maxRows?: number;         // Optional, clamped to capability max
    fields?: string[];        // Optional, must be subset of allowedFields
  };
};

type ExecuteReadModelOutput = {
  data: unknown[];
  metadata: {
    rowCount: number;
    fieldsReturned: string[];
    sourceType: string;
  };
  executionMetrics: {
    latencyMs: number;
  };
};
```

#### Tool: tool.customer_data.getEntity
```typescript
type GetEntityInput = {
  clientId: string;
  entity: string;             // Entity type (e.g., "customer", "order")
  id: string;                 // Entity ID
  fields?: string[];          // Optional field selection
};

type GetEntityOutput = {
  entity: unknown;            // Single entity object
  metadata: {
    fieldsReturned: string[];
    sourceType: string;
  };
  executionMetrics: {
    latencyMs: number;
  };
};
```

#### Tool: tool.customer_data.search
```typescript
type SearchInput = {
  clientId: string;
  entity: string;             // Entity type to search
  query: Record<string, unknown>;  // Search criteria (no SQL!)
  limit?: number;             // Optional, clamped to maxRows
};

type SearchOutput = {
  results: unknown[];
  metadata: {
    rowCount: number;
    fieldsReturned: string[];
    sourceType: string;
  };
  executionMetrics: {
    latencyMs: number;
  };
};
```

### 3. ActionLog Schema for customer_data.access

```typescript
type CustomerDataAccessLog = {
  action: "customer_data.access";  // Fixed action name
  input: {
    clientId: string;
    operationId?: string;          // For executeReadModel
    entity?: string;                // For getEntity/search
    tool: "tool.customer_data.executeReadModel" | "tool.customer_data.getEntity" | "tool.customer_data.search";
  };
  output: {
    rowCount: number;               // Actual rows returned
    fieldsReturned: string[];       // Field names in result
    latencyMs: number;              // Execution time
    sourceType: string;              // Connector type identifier
    resultHash?: string;            // Optional: SHA256 hash of result (no PII)
  };
  // Standard ActionLogger fields:
  agentId: string;
  userId: string;
  projectId?: string;
  clientId: string;                  // Duplicated for query convenience
  ts: string;                       // ISO timestamp
  blocked: false;                   // Always false for successful access
};
```

### 4. Hard Constraints

#### Constraint 1: maxRows Default
- **Default:** 200 rows
- **Override:** Capability can specify lower (e.g., 50), never higher
- **Enforcement:** Applied in tool handler before calling connector
- **Validation:** If tool call specifies maxRows > capability max, clamp to capability max

#### Constraint 2: Allowlisted Fields
- **Source:** CapabilityRegistry defines `allowedFields` per operation
- **Enforcement:** If `allowedFields` specified, tool call `fields` must be subset
- **Validation:** Tool handler validates before calling connector

#### Constraint 3: NO Raw SQL
- **Rejection:** Explicitly reject payloads containing any of:
  - `sql` (case-insensitive)
  - `query` (case-insensitive, but allow `query` as search parameter name)
  - `statement` (case-insensitive)
  - `raw` (case-insensitive)
- **Validation:** Tool handler checks input object keys and values (recursive)
- **Error:** Return `{ ok: false, error: "Raw SQL not allowed in tool calls" }`

#### Constraint 4: OperationId Allowlisting
- **Source:** CapabilityRegistry defines allowlisted `operationId`s per clientId
- **Enforcement:** Tool handler checks `CapabilityRegistry.isOperationAllowed()` before execution
- **Error:** Return `{ ok: false, error: "Operation not allowed for client" }`

### 5. File Layout

```
packages/customer-data/
├── package.json
├── tsconfig.json
└── src/
    ├── connector.ts              # CustomerConnector interface
    ├── registry.ts                # ConnectorRegistry + CapabilityRegistry implementations
    ├── capability.schema.ts      # CapabilityMap, OperationCapability types + validation
    ├── constraints.ts             # maxRows/fields enforcement, SQL rejection
    └── index.ts                  # Public exports

apps/api/src/modules/agents/
└── agents.runtime.ts              # Add tool.customer_data.* handlers

packages/agent-runtime/src/execution/
└── tool-permissions.ts            # Add customer_data tool → permission mapping

packages/shared/src/types/
└── agent.ts                       # Add ToolRef + Permission types
```

### 6. Permission Mapping

```typescript
// In tool-permissions.ts:
"tool.customer_data.executeReadModel": "customer_data.read",
"tool.customer_data.getEntity": "customer_data.read",
"tool.customer_data.search": "customer_data.read",

// In agent.ts:
export type Permission = 
  | ...existing...
  | "customer_data.read";

export type ToolRef = 
  | ...existing...
  | "tool.customer_data.executeReadModel"
  | "tool.customer_data.getEntity"
  | "tool.customer_data.search";
```

### 7. Implementation Notes

- **ActionLogger Required:** All customer_data tools must receive ActionLogger, block execution if logging fails
- **Error Handling:** Return `{ ok: false, error: string }` for validation failures
- **Async/Await:** All connector calls are async, tool handlers must await
- **Type Safety:** Use TypeScript strict mode, validate runtime inputs
- **Testing:** Unit tests for constraints, integration tests for end-to-end flow

---

## Customer Data Plane — Implementation Checklist (WS2/WS3)

**Owner:** @implementer_codex (WS2), @observability_eval (WS3)  
**Layer:** implementation  
**Date:** 2026-02-13T19:00:00Z

### WS2: Implementation Wiring

- [ ] Create `packages/customer-data/` package
  - [ ] `package.json` with dependencies (no external deps for Step 1)
  - [ ] `tsconfig.json` extending base config
  - [ ] `src/connector.ts` with `CustomerConnector` interface
  - [ ] `src/registry.ts` with `ConnectorRegistry` and `CapabilityRegistry` classes
  - [ ] `src/capability.schema.ts` with types and validation
  - [ ] `src/constraints.ts` with maxRows/fields enforcement and SQL rejection
  - [ ] `src/index.ts` exporting public API
- [ ] Update `apps/api/src/modules/agents/agents.runtime.ts`
  - [ ] Import customer-data registries
  - [ ] Add `tool.customer_data.executeReadModel` handler
  - [ ] Add `tool.customer_data.getEntity` handler
  - [ ] Add `tool.customer_data.search` handler
  - [ ] Ensure ActionLogger passed to all handlers
  - [ ] Implement SQL rejection check (recursive object scan)
  - [ ] Implement maxRows enforcement
  - [ ] Implement allowlisted fields validation
  - [ ] Implement operationId allowlisting check
  - [ ] Log `action="customer_data.access"` with all required metadata
- [ ] Update `packages/agent-runtime/src/execution/tool-permissions.ts`
  - [ ] Add customer_data tool → permission mappings
- [ ] Update `packages/shared/src/types/agent.ts`
  - [ ] Add `"customer_data.read"` to `Permission` type
  - [ ] Add customer_data tools to `ToolRef` type
- [ ] Unit Tests
  - [ ] Test SQL rejection (various payload shapes)
  - [ ] Test maxRows enforcement (default, capability override, tool override)
  - [ ] Test allowlisted fields validation
  - [ ] Test operationId allowlisting
  - [ ] Test ActionLogger blocking on failure

### WS3: QA Tests & Harness

- [ ] Integration Tests
  - [ ] Test `/agents/execute` with `tool.customer_data.executeReadModel` → verify action_logs entry
  - [ ] Test maxRows applied correctly
  - [ ] Test SQL rejection (attempt to pass "sql" field → blocked)
  - [ ] Test operationId allowlisting (unknown operationId → blocked)
  - [ ] Test ActionLogger failure blocks execution
- [ ] Test Instructions
  - [ ] Document how to run tests
  - [ ] Document test data setup (mock connectors)

### WS4: DevOps/Config Guidance

- [ ] Documentation
  - [ ] "How to add a new connector + capability map" guide
  - [ ] Config file format (JSON/YAML example)
  - [ ] Environment variable usage (non-secret for Step 1)
  - [ ] Deployment notes (no DB creds beyond DATABASE_URL)

---

## Customer Data Plane Step 2 — PolicyEngine Spec (WS1)

**Owner:** @reviewer_claude  
**Layer:** architecture  
**Date:** 2026-02-18T12:30:00+01:00

### 1. PolicyEngine Core Interface

```typescript
export class PolicyEngine {
  /**
   * Authorize an operation. Throws PolicyError if unauthorized.
   * @param ctx - Policy context (userId, clientId, projectId, roles)
   * @param operation - Operation identifier (e.g., "customer_data.executeReadModel", "review.approve")
   * @param params - Operation parameters (validated against capability schema)
   * @returns PolicyDecision for logging
   * @throws PolicyError if authorization fails
   */
  authorize(
    ctx: PolicyContext,
    operation: string,
    params: Record<string, unknown>
  ): PolicyDecision;

  /**
   * Sanitize parameters according to capability constraints.
   * Applies: maxRows, allowedFields, denyFields, removes unknown keys.
   * @param params - Raw parameters from tool call
   * @param capability - Capability map for clientId
   * @returns Sanitized parameters safe for execution
   */
  sanitize(
    params: Record<string, unknown>,
    capability: CapabilityMap
  ): SanitizedParams;

  /**
   * Redact result data according to capability constraints.
   * Removes: denyFields, PII fields (if configured), fields not in allowedFields.
   * @param result - Raw result from connector
   * @param capability - Capability map for clientId
   * @returns Redacted result safe for return
   */
  redact(
    result: unknown,
    capability: CapabilityMap
  ): RedactedResult;
}
```

### 2. PolicyContext Type

```typescript
export type PolicyContext = {
  userId: string;              // Required: caller identity
  clientId?: string;            // Required for customer_data operations
  projectId?: string;           // Optional: project scope
  roles?: string[];             // User roles (e.g., ["reviewer", "admin"])
  agentId?: string;             // Agent executing operation
  permissions?: Permission[];   // Agent permissions (from profile)
};
```

### 3. PolicyDecision Type

```typescript
export type PolicyDecision = {
  allowed: boolean;
  operation: string;
  context: PolicyContext;
  constraints: {
    maxRows?: number;
    allowedFields?: string[];
    denyFields?: string[];
  };
  reason?: string;              // If denied, explanation
  timestamp: string;             // ISO timestamp
  decisionHash: string;          // SHA256 hash for audit
};
```

### 4. PolicyError Types

```typescript
export class PolicyError extends Error {
  constructor(
    message: string,
    public readonly code: PolicyErrorCode,
    public readonly context: PolicyContext,
    public readonly operation: string
  ) {
    super(message);
    this.name = "PolicyError";
  }
}

export type PolicyErrorCode =
  | "PERMISSION_DENIED"           // User/agent lacks required permission
  | "ROLE_REQUIRED"                // Required role missing (e.g., reviewer)
  | "CLIENT_ID_MISMATCH"           // ctx.clientId != capability.clientId
  | "OPERATION_NOT_ALLOWED"        // operationId not allowlisted for clientId
  | "CROSS_TENANT_DENIED"          // Attempted cross-client access
  | "SCOPE_VIOLATION"              // projectId/clientId scope violation
  | "CONSTRAINT_VIOLATION"         // maxRows, allowedFields violated
  | "SANITIZATION_FAILED"          // Parameter sanitization failed
  | "REDACTION_FAILED";            // Result redaction failed
```

### 5. Authorization Rules

#### Rule 1: Role-Based Access Control (RBAC)
```typescript
// Review approval requires reviewer role
if (operation === "review.approve" || operation === "review.reject") {
  if (!ctx.roles?.includes("reviewer") && 
      !ctx.roles?.includes("admin") && 
      !ctx.roles?.includes("partner")) {
    throw new PolicyError(
      "Review approval requires reviewer role",
      "ROLE_REQUIRED",
      ctx,
      operation
    );
  }
}
```

#### Rule 2: Permission-Based Access Control
```typescript
// Customer data access requires customer_data.read permission
if (operation.startsWith("customer_data.")) {
  if (!ctx.permissions?.includes("customer_data.read")) {
    throw new PolicyError(
      "Customer data access requires customer_data.read permission",
      "PERMISSION_DENIED",
      ctx,
      operation
    );
  }
}
```

#### Rule 3: ClientId Scoping
```typescript
// ctx.clientId must match capability.clientId
if (operation.startsWith("customer_data.")) {
  const capability = capabilityRegistry.getCapabilities(ctx.clientId);
  if (!capability) {
    throw new PolicyError(
      "No capabilities found for clientId",
      "CLIENT_ID_MISMATCH",
      ctx,
      operation
    );
  }
  // Additional check: operationId must be allowlisted
  if (params.operationId && !capabilityRegistry.isOperationAllowed(ctx.clientId, params.operationId)) {
    throw new PolicyError(
      `Operation ${params.operationId} not allowed for clientId`,
      "OPERATION_NOT_ALLOWED",
      ctx,
      operation
    );
  }
}
```

#### Rule 4: Cross-Tenant Protection
```typescript
// Prevent cross-client access even if params contain valid IDs
if (operation.startsWith("customer_data.")) {
  // If params contain clientId, it must match ctx.clientId
  if (params.clientId && params.clientId !== ctx.clientId) {
    throw new PolicyError(
      "Cross-tenant access denied",
      "CROSS_TENANT_DENIED",
      ctx,
      operation
    );
  }
}
```

### 6. Sanitization Rules

```typescript
export type SanitizedParams = {
  operationId: string;
  params: Record<string, unknown>;
  constraints: {
    maxRows: number;              // Applied from capability or default (200)
    allowedFields?: string[];     // If specified, only these fields
    denyFields?: string[];        // Fields to exclude
  };
};

function sanitize(params: Record<string, unknown>, capability: CapabilityMap): SanitizedParams {
  // 1. Reject raw SQL attempts
  if (containsRawSql(params)) {
    throw new PolicyError("Raw SQL not allowed", "SANITIZATION_FAILED", ctx, operation);
  }
  
  // 2. Apply maxRows constraint
  const maxRows = Math.min(
    params.maxRows ?? capability.defaultMaxRows ?? 200,
    capability.defaultMaxRows ?? 200
  );
  
  // 3. Validate allowedFields
  const allowedFields = capability.operations[params.operationId]?.allowedFields;
  if (allowedFields && params.fields) {
    const invalidFields = params.fields.filter(f => !allowedFields.includes(f));
    if (invalidFields.length > 0) {
      throw new PolicyError(
        `Fields not allowed: ${invalidFields.join(", ")}`,
        "CONSTRAINT_VIOLATION",
        ctx,
        operation
      );
    }
  }
  
  return {
    operationId: params.operationId,
    params: removeUnknownKeys(params, capability.operations[params.operationId]?.paramsSchema),
    constraints: { maxRows, allowedFields, denyFields: [] }
  };
}
```

### 7. Redaction Rules

```typescript
export type RedactedResult = {
  data: unknown[];
  metadata: {
    rowCount: number;
    fieldsReturned: string[];
    redactedFields?: string[];    // Fields removed during redaction
  };
};

function redact(result: unknown, capability: CapabilityMap): RedactedResult {
  const data = Array.isArray(result) ? result : [result];
  const operation = /* extract from context */;
  const opCapability = capability.operations[operation];
  
  // 1. Remove denyFields
  const denyFields = opCapability?.denyFields ?? [];
  const redacted = data.map(row => {
    const obj = typeof row === "object" && row !== null ? row as Record<string, unknown> : {};
    const cleaned = { ...obj };
    denyFields.forEach(field => delete cleaned[field]);
    return cleaned;
  });
  
  // 2. Filter to allowedFields if specified
  const allowedFields = opCapability?.allowedFields;
  if (allowedFields) {
    const filtered = redacted.map(row => {
      const obj = typeof row === "object" && row !== null ? row as Record<string, unknown> : {};
      const filtered = {} as Record<string, unknown>;
      allowedFields.forEach(field => {
        if (field in obj) filtered[field] = obj[field];
      });
      return filtered;
    });
    return {
      data: filtered,
      metadata: {
        rowCount: filtered.length,
        fieldsReturned: allowedFields,
        redactedFields: denyFields
      }
    };
  }
  
  return {
    data: redacted,
    metadata: {
      rowCount: redacted.length,
      fieldsReturned: Object.keys(redacted[0] || {}),
      redactedFields: denyFields
    }
  };
}
```

### 8. Threat Model

#### Threat 1: Privilege Escalation
**Scenario:** User without reviewer role attempts to approve review  
**Mitigation:** PolicyEngine.authorize() checks ctx.roles before review.approve  
**Detection:** PolicyError with code "ROLE_REQUIRED" logged  
**Risk After Step 2:** ✅ Eliminated

#### Threat 2: Tenant Hopping
**Scenario:** User with clientId=A attempts to access data for clientId=B  
**Mitigation:** PolicyEngine.authorize() enforces ctx.clientId == params.clientId, capability.clientId match  
**Detection:** PolicyError with code "CROSS_TENANT_DENIED" logged  
**Risk After Step 2:** ✅ Eliminated

#### Threat 3: Replay Misuse
**Scenario:** Replay old operation with different context  
**Mitigation:** PolicyDecision includes decisionHash (SHA256 of operation + context + timestamp), logged in action_logs  
**Detection:** Audit log analysis can detect replay patterns  
**Risk After Step 2:** ⚠️ Mitigated (full elimination requires replay engine in Step 3)

#### Threat 4: Unauthorized Review Approval
**Scenario:** User without reviewer role calls POST /reviews/:id/approve  
**Mitigation:** ReviewsController calls PolicyEngine.authorize("review.approve", ctx) before processing  
**Detection:** PolicyError logged, operation blocked  
**Risk After Step 2:** ✅ Eliminated

#### Threat 5: Silent Data Access
**Scenario:** Operation succeeds but audit log fails silently  
**Mitigation:** ActionLogger mandatory, operation aborts on logging failure  
**Detection:** Operation fails with "AUDIT_LOG_WRITE_FAILED" error  
**Risk After Step 2:** ✅ Eliminated

### 9. Integration Points

#### Integration 1: ReviewsController
```typescript
@Post(":id/approve")
async approve(@Param("id") id: string, @Body() body: { reviewerUserId: string; comment?: string }) {
  const ctx: PolicyContext = {
    userId: body.reviewerUserId,
    roles: await getUserRoles(body.reviewerUserId),  // NEW: fetch roles
  };
  
  try {
    policyEngine.authorize(ctx, "review.approve", { reviewId: id });
  } catch (error) {
    if (error instanceof PolicyError) {
      await logger.append({
        action: "review.access.denied",
        input: { reviewId: id, userId: body.reviewerUserId },
        output: { reason: error.message, code: error.code },
        blocked: true,
        // ... standard fields
      });
      return { ok: false, error: error.message };
    }
    throw error;
  }
  
  // ... existing approval logic
}
```

#### Integration 2: ProjectsService.updatePhase
```typescript
async updatePhase(
  projectId: string,
  newPhase: ProjectPhase,
  logger: ActionLogger,  // NOW REQUIRED (not optional)
  agentId: string,
  userId: string,
  clientId?: string
): Promise<void> {
  const ctx: PolicyContext = {
    userId,
    clientId,
    projectId,
    agentId,
    permissions: await getAgentPermissions(agentId),  // NEW: fetch permissions
  };
  
  policyEngine.authorize(ctx, "project.phase.update", { projectId, newPhase });
  
  // ... existing update logic (logger already required)
}
```

#### Integration 3: DecisionsService.finalizeFromDraft
```typescript
async finalizeFromDraft(
  draftId: string,
  reviewId: string,
  options: {  // NOW REQUIRED (not optional)
    logger: ActionLogger;  // NOW REQUIRED (not optional)
    agentId: string;
    userId: string;
    projectId?: string;
    clientId?: string;
  }
): Promise<DecisionFinal> {
  // logger is now required, fail fast if missing
  if (!options.logger) {
    throw new Error("ActionLogger required for finalizeFromDraft");
  }
  
  // ... existing finalization logic
}
```

#### Integration 4: Tool.customer_data.*
```typescript
"tool.customer_data.executeReadModel": {
  async call(ctx: ToolContext, input: unknown) {
    const data = isRecord(input) ? input : {};
    const clientId = asString(data.clientId) ?? ctx.clientId;
    
    if (!clientId) {
      return { ok: false, error: "clientId is required" };
    }
    
    // NEW: PolicyEngine authorization
    const policyCtx: PolicyContext = {
      userId: ctx.userId,
      clientId,
      projectId: ctx.projectId,
      agentId: /* from context */,
      permissions: /* from agent profile */,
    };
    
    try {
      const decision = policyEngine.authorize(
        policyCtx,
        "customer_data.executeReadModel",
        data
      );
      
      // NEW: Sanitize parameters
      const capability = capabilityRegistry.getCapabilities(clientId);
      if (!capability) {
        return { ok: false, error: "No capabilities found for clientId" };
      }
      const sanitized = policyEngine.sanitize(data, capability);
      
      // Execute connector
      const result = await connector.executeReadModel(
        sanitized.operationId,
        sanitized.params,
        sanitized.constraints
      );
      
      // NEW: Redact result
      const redacted = policyEngine.redact(result.data, capability);
      
      // Log with PolicyDecision
      await logger.append({
        action: "customer_data.access",
        input: { clientId, operationId: sanitized.operationId, ...data },
        output: {
          rowCount: redacted.metadata.rowCount,
          fieldsReturned: redacted.metadata.fieldsReturned,
          latencyMs: result.executionMetrics.latencyMs,
          sourceType: result.metadata.sourceType,
          policyDecision: decision,  // NEW: include policy decision
        },
        // ... standard fields
      });
      
      return { ok: true, output: redacted };
    } catch (error) {
      if (error instanceof PolicyError) {
        // Log policy violation
        await logger.append({
          action: "policy.violation",
          input: { clientId, operation: "customer_data.executeReadModel", ...data },
          output: { reason: error.message, code: error.code },
          blocked: true,
          // ... standard fields
        });
        return { ok: false, error: error.message };
      }
      throw error;
    }
  },
}
```

### 10. File Layout Decision

**Decision Required:** PolicyEngine location

**Option A:** New package `packages/policy/`
- Pros: Clear separation, independent versioning
- Cons: Additional package, potential duplication with governance

**Option B:** Extend `packages/governance/`
- Pros: Reuses existing governance infrastructure, single package
- Cons: Governance package becomes larger

**Recommendation:** Option B (extend `packages/governance/`)  
**Rationale:** PolicyEngine is core governance functionality, reuses existing types, avoids duplication

**Proposed Structure:**
```
packages/governance/
├── src/
│   ├── policy/
│   │   ├── policy-engine.ts
│   │   ├── errors.ts
│   │   └── types.ts
│   ├── policies/
│   │   └── ... (existing)
│   └── ... (existing)
```

### 11. Hard Constraints (Non-Negotiable)

- ✅ No raw SQL in tool calls (rejected in sanitize)
- ✅ No silent fallback on policy failure (throw PolicyError)
- ✅ No optional audit path (ActionLogger required everywhere)
- ✅ No cross-tenant data access (enforced in authorize)
- ✅ No reviewer action without role check (enforced in authorize)
- ✅ All policy violations logged (action="policy.violation")

---

## Customer Data Plane Step 2 — Implementation Checklist (WS2/WS3/WS4)

**Owner:** @implementer_codex (WS2/WS3), @observability_eval (WS4)  
**Layer:** implementation  
**Date:** 2026-02-18T12:30:00+01:00

### WS2: AuthN/AuthZ Hardening

- [ ] Create PolicyEngine class in `packages/governance/src/policy/policy-engine.ts`
  - [ ] Implement `authorize()` method
  - [ ] Implement `sanitize()` method
  - [ ] Implement `redact()` method
  - [ ] Add PolicyError types
  - [ ] Add PolicyDecision type
- [ ] Update ReviewsController
  - [ ] Add getUserRoles() helper (or inject role service)
  - [ ] Call PolicyEngine.authorize() before approve/reject
  - [ ] Log "review.access.denied" if blocked
- [ ] Update ProjectsService.updatePhase
  - [ ] Add getAgentPermissions() helper
  - [ ] Call PolicyEngine.authorize() before update
  - [ ] Make logger parameter required (remove optional)
- [ ] Update DecisionsService.finalizeFromDraft
  - [ ] Make options parameter required (not optional)
  - [ ] Make logger required (not optional)
  - [ ] Fail fast if logger missing
- [ ] Update Tool.customer_data.* handlers
  - [ ] Call PolicyEngine.authorize() before connector execution
  - [ ] Call PolicyEngine.sanitize() on input params
  - [ ] Call PolicyEngine.redact() on result
  - [ ] Include PolicyDecision in audit log
- [ ] Unit Tests
  - [ ] Test authorize() denies missing permission
  - [ ] Test authorize() denies wrong clientId
  - [ ] Test authorize() denies missing role
  - [ ] Test sanitize() enforces maxRows
  - [ ] Test sanitize() rejects raw SQL
  - [ ] Test redact() removes denyFields
  - [ ] Test redact() filters to allowedFields

### WS3: Scope Enforcement & Tenant Safety

- [ ] Add clientId validation in customer_data tools
  - [ ] Verify ctx.clientId matches capability.clientId
  - [ ] Verify operationId is allowlisted for clientId
  - [ ] Reject if params.clientId != ctx.clientId
- [ ] Add cross-tenant protection tests
  - [ ] Test: attempt cross-client call → must fail
  - [ ] Test: attempt operationId not allowlisted → must fail
- [ ] Integration Tests
  - [ ] Test /agents/execute with unauthorized operation → 403
  - [ ] Test cross-client attempt → blocked

### WS4: Mandatory Audit Logging

- [ ] Enforce ActionLogger required in all sensitive operations
  - [ ] customer_data.access
  - [ ] review approval
  - [ ] project phase updates
  - [ ] decision finalization
- [ ] Add tests: simulate logger failure → operation must abort
- [ ] Ensure logs include:
  - [ ] userId
  - [ ] clientId
  - [ ] operation
  - [ ] policyDecision summary
- [ ] Integration Tests
  - [ ] Test logger failure blocks operation
  - [ ] Test all required fields in audit log

---

## Customer Data Plane Step 3 — Onboarding Framework Spec (WS1)

**Owner:** @reviewer_claude  
**Layer:** architecture  
**Date:** 2026-02-18T13:00:00+01:00

### 1. Onboarding Contract

#### Required Fields

```typescript
export type OnboardingContract = {
  clientId: string;                    // Unique client identifier
  connectorType: ConnectorType;        // "postgres" | "rest_api" | "graphql" | "custom"
  readOnlyCredentialStrategy: CredentialStrategy;  // How credentials are provided
  capabilityMap: CapabilityMap;         // Operation allowlist + constraints
  rbacMapping: RBACMapping;             // Role → permission mapping
};

export type ConnectorType = 
  | "postgres"
  | "rest_api"
  | "graphql"
  | "custom";

export type CredentialStrategy = 
  | "env_var"           // Credentials via environment variables
  | "config_file"       // Credentials in config file (encrypted)
  | "vault"             // Credentials from secret vault
  | "oauth2";           // OAuth2 flow

export type RBACMapping = {
  roles: Record<string, Permission[]>;  // role → permissions
  defaultRole?: string;                 // Default role for users
};
```

#### Optional Fields

```typescript
export type OnboardingContractOptional = {
  fieldRedactionPolicy?: {
    denyFields: string[];               // Fields to always exclude
    piiFields?: string[];               // PII fields (special handling)
  };
  dataClassificationLevel?: 
    | "public"
    | "internal"
    | "confidential"
    | "restricted";
  customConnectorConfig?: Record<string, unknown>;  // Connector-specific config
};
```

### 2. Capability Map Schema (Extended for Multi-Source)

```yaml
# capability-map.example.yaml
clientId: "acme-corp"
defaultMaxRows: 200

operations:
  getOrders:
    operationId: "getOrders"
    description: "Retrieve customer orders"
    source: "postgres"              # NEW: Multi-source routing
    allowedFields:
      - "orderId"
      - "customerId"
      - "total"
      - "status"
      - "createdAt"
    denyFields:
      - "paymentToken"
      - "internalNotes"
    maxRows: 100
    paramsSchema:
      type: "object"
      properties:
        customerId:
          type: "string"
          required: true
        status:
          type: "string"
          enum: ["pending", "completed", "cancelled"]
        dateFrom:
          type: "string"
          format: "date"
  
  getCRMContacts:
    operationId: "getCRMContacts"
    description: "Retrieve CRM contacts"
    source: "rest_crm"               # NEW: Different source
    allowedFields:
      - "contactId"
      - "name"
      - "email"
      - "company"
    maxRows: 50
    paramsSchema:
      type: "object"
      properties:
        company:
          type: "string"
          required: false
        search:
          type: "string"
          minLength: 2
```

### 3. Connector Config Format

```json
// connector-config.example.json
{
  "clientId": "acme-corp",
  "connectorType": "postgres",
  "credentialStrategy": "env_var",
  "config": {
    "connectionStringEnv": "ACME_DATABASE_URL",
    "poolSize": 10,
    "timeoutMs": 5000,
    "healthCheckIntervalMs": 30000
  },
  "sources": {
    "postgres": {
      "type": "postgres",
      "connectionStringEnv": "ACME_DATABASE_URL",
      "schema": "public"
    },
    "rest_crm": {
      "type": "rest_api",
      "baseUrl": "https://crm.acme.com/api",
      "authType": "bearer",
      "tokenEnv": "ACME_CRM_TOKEN",
      "timeoutMs": 3000
    }
  }
}
```

### 4. Multi-Source Router Design

```typescript
export interface MultiSourceConnectorRegistry {
  /**
   * Get connector for clientId and source.
   * @throws Error if clientId or source not registered
   */
  getConnector(clientId: string, source: string): CustomerConnector;
  
  /**
   * Register connector for clientId and source.
   */
  register(clientId: string, source: string, connector: CustomerConnector): void;
  
  /**
   * Get all sources for a clientId.
   */
  getSources(clientId: string): string[];
  
  /**
   * Check if source exists for clientId.
   */
  hasSource(clientId: string, source: string): boolean;
}

// Enhanced CapabilityMap with source mapping
export type CapabilityMap = {
  operations: Record<string, OperationCapability>;
  defaultMaxRows?: number;
  sources?: Record<string, SourceConfig>;  // NEW: Source configurations
};

export type OperationCapability = {
  operationId: string;
  description?: string;
  source: string;                  // NEW: Required source identifier
  allowedFields?: string[];
  denyFields?: string[];
  maxRows?: number;
  paramsSchema?: OperationSchema;
};

export type SourceConfig = {
  type: ConnectorType;
  config: Record<string, unknown>;
  healthCheck?: {
    endpoint?: string;
    intervalMs?: number;
  };
};
```

### 5. ProjectPhaseStore Persistence Strategy

#### Option A: Add `phase` Column to `projects` Table

**Migration:**
```sql
-- 004_project_phases.sql
BEGIN;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'discovery'
    CHECK (phase IN ('discovery', 'design', 'delivery', 'review'));

CREATE INDEX IF NOT EXISTS idx_projects_phase
  ON projects (phase);

COMMIT;
```

**Refactored Store:**
```typescript
@Injectable()
export class ProjectPhaseStore {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}
  
  async get(projectId: string): Promise<ProjectPhase> {
    const { rows } = await this.pool.query<{ phase: ProjectPhase }>(
      `SELECT phase FROM projects WHERE id = $1 LIMIT 1`,
      [projectId]
    );
    return rows[0]?.phase ?? "discovery";
  }
  
  async set(projectId: string, phase: ProjectPhase): Promise<void> {
    await this.pool.query(
      `UPDATE projects SET phase = $1 WHERE id = $2`,
      [phase, projectId]
    );
  }
  
  async has(projectId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM projects WHERE id = $1`,
      [projectId]
    );
    return parseInt(rows[0]?.count ?? "0", 10) > 0;
  }
}
```

**Decision:** Option A (add column to projects)  
**Rationale:** Simpler, no join required, phase is 1:1 with project

### 6. Observability Metadata Schema

```typescript
export type EnrichedActionLog = {
  // Standard fields
  agentId: string;
  userId: string;
  projectId?: string;
  clientId?: string;
  action: string;
  input: unknown;
  output: unknown;
  ts: string;
  blocked?: boolean;
  reason?: string;
  
  // NEW: Replay-ready metadata
  metadata: {
    requestId: string;              // Unique request identifier
    policyDecisionHash?: string;     // SHA256 of PolicyDecision
    connectorSource?: string;       // Source identifier (postgres, rest_crm, etc.)
    latencyMs: number;               // Execution time
    resultHash?: string;             // SHA256 of result (deterministic, no PII)
  };
};

// Result hash generation (deterministic)
export function generateResultHash(
  data: unknown,
  excludeFields?: string[]
): string {
  const cleaned = excludePII(data, excludeFields);
  const normalized = JSON.stringify(cleaned, Object.keys(cleaned).sort());
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
```

### 7. Production Readiness Requirements

#### Health Check Interface

```typescript
export interface CustomerConnector {
  // Existing methods...
  
  /**
   * Health check for connector.
   * @returns Health status
   */
  health(): Promise<HealthStatus>;
}

export type HealthStatus = {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
  lastChecked?: string;
};
```

#### Timeout Configuration

```typescript
export type ConnectorConfig = {
  timeoutMs: number;                // Default: 5000
  healthCheckIntervalMs: number;    // Default: 30000
  retryCount: number;                // Default: 0 (no retry)
  circuitBreaker?: {
    failureThreshold: number;        // Default: 5
    resetTimeoutMs: number;         // Default: 60000
  };
};
```

#### Circuit Breaker Pattern (Minimal)

```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  
  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeoutMs: number = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error("Circuit breaker is OPEN");
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private isOpen(): boolean {
    if (this.failures < this.threshold) return false;
    if (!this.lastFailureTime) return false;
    
    const elapsed = Date.now() - this.lastFailureTime.getTime();
    if (elapsed > this.resetTimeoutMs) {
      this.failures = 0;
      this.lastFailureTime = undefined;
      return false;
    }
    
    return true;
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.lastFailureTime = undefined;
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
  }
}
```

### 8. Onboarding Checklist

#### Pre-Onboarding

- [ ] Client identified and clientId assigned
- [ ] Data classification level determined
- [ ] Read-only credentials strategy selected
- [ ] RBAC roles defined

#### Connector Setup

- [ ] Connector type selected (postgres, rest_api, graphql, custom)
- [ ] Connector config created (connector-config.example.json)
- [ ] Credentials configured (env vars, config file, vault)
- [ ] Health check endpoint configured (if applicable)
- [ ] Timeout values configured

#### Capability Map

- [ ] Top 10 operations identified
- [ ] Capability map created (capability-map.example.yaml)
- [ ] Operation schemas defined (paramsSchema)
- [ ] Field allowlists defined (allowedFields)
- [ ] Field denylists defined (denyFields, if needed)
- [ ] MaxRows constraints set per operation
- [ ] Source mappings defined (for multi-source)

#### Multi-Source Setup (if applicable)

- [ ] All sources identified
- [ ] Source configs created
- [ ] Operation → source mappings defined
- [ ] Health checks configured per source

#### Testing

- [ ] Connector health check passes
- [ ] Test operation executes successfully
- [ ] PolicyEngine authorization works
- [ ] Audit logging works
- [ ] Cross-tenant protection verified
- [ ] Result redaction verified

#### Production Deployment

- [ ] Config files deployed (encrypted if needed)
- [ ] Environment variables set
- [ ] Connector registered in ConnectorRegistry
- [ ] Capability map registered in CapabilityRegistry
- [ ] RBAC mapping configured
- [ ] Monitoring alerts configured

### 9. Customer Integration Guide Structure

**Location:** `docs/customer-integration-guide.md`

**Sections:**
1. Overview
2. Prerequisites
3. Onboarding Process
4. Connector Configuration
5. Capability Map Definition
6. Multi-Source Setup
7. RBAC Configuration
8. Testing Checklist
9. Production Deployment
10. Troubleshooting

### 10. Hard Constraints (Non-Negotiable)

- ✅ No cross-client routing (enforced in MultiSourceConnectorRegistry)
- ✅ No bypassing PolicyEngine (runs before routing)
- ✅ No silent connector failure (health checks required)
- ✅ No implicit default connector (explicit source mapping required)
- ✅ All connectors must declare health() method
- ✅ All phase updates must be logged (block on failure)
- ✅ ResultHash must be deterministic (same input → same hash)

---

## Customer Data Plane Step 3 — Implementation Checklist (WS2/WS3/WS4/WS5)

**Owner:** @implementer_codex (WS2/WS3), @observability_eval (WS4/WS5)  
**Layer:** implementation  
**Date:** 2026-02-18T13:00:00+01:00

### WS2: Multi-Source Data Router

- [ ] Enhance ConnectorRegistry to MultiSourceConnectorRegistry
  - [ ] Add source parameter to getConnector()
  - [ ] Add register() with source parameter
  - [ ] Add getSources() method
  - [ ] Add hasSource() method
- [ ] Extend CapabilityMap
  - [ ] Add source field to OperationCapability
  - [ ] Add sources field to CapabilityMap
  - [ ] Update validation to require source
- [ ] Update tool handlers
  - [ ] Extract source from capability map
  - [ ] Route to correct connector based on source
  - [ ] Log sourceType in audit log
- [ ] Tests
  - [ ] Test operation routes to correct backend
  - [ ] Test wrong source mapping → blocked
  - [ ] Test logging includes sourceType

### WS3: ProjectPhaseStore Persistence Fix

- [ ] Create migration `004_project_phases.sql`
  - [ ] Add phase column to projects table
  - [ ] Add CHECK constraint
  - [ ] Add index
- [ ] Refactor ProjectPhaseStore
  - [ ] Replace Map with DB queries
  - [ ] Make methods async
  - [ ] Update ProjectsService to await store methods
- [ ] Update ProjectsModule
  - [ ] Ensure ProjectPhaseStore uses DB
- [ ] Tests
  - [ ] Test restart server → phase still present
  - [ ] Test concurrent phase updates
  - [ ] Test phase update logging (block on failure)

### WS4: Observability & Replay Preparation

- [ ] Add metadata to ActionLogger interface
  - [ ] requestId
  - [ ] policyDecisionHash
  - [ ] connectorSource
  - [ ] resultHash
- [ ] Implement resultHash generation
  - [ ] Deterministic hash function
  - [ ] Exclude PII fields
  - [ ] Stable for same input
- [ ] Update customer_data tool handlers
  - [ ] Generate requestId
  - [ ] Include policyDecisionHash
  - [ ] Include connectorSource
  - [ ] Generate resultHash
- [ ] Document replay strategy
  - [ ] How action_logs reconstruct state
  - [ ] resultHash usage for verification
- [ ] Tests
  - [ ] Test action_logs contain deterministic identifiers
  - [ ] Test resultHash stable for same input

### WS5: Production Readiness Hardening

- [ ] Add health() method to CustomerConnector interface
- [ ] Implement health checks for connectors
  - [ ] Postgres: connection test
  - [ ] REST API: endpoint ping
  - [ ] GraphQL: schema introspection
- [ ] Add timeout configuration
  - [ ] Default timeout (5000ms)
  - [ ] Per-connector timeout
  - [ ] Configurable via config
- [ ] Implement circuit breaker (minimal)
  - [ ] Failure threshold (5)
  - [ ] Reset timeout (60000ms)
  - [ ] Fail-safe mode
- [ ] Tests
  - [ ] Test health check works
  - [ ] Test timeout enforcement
  - [ ] Test circuit breaker opens/closes
  - [ ] Test safe failure modes
