# Analytics v1 — Output Report

**Date:** 2026-02-19T20:00:00Z (Updated: 2026-02-19T22:30:00Z security hardening)  
**Owner:** @implementer_codex  
**Status:** COMPLETE (Hardening + Enterprise Security Compliance applied)

---

## Change Summary

- **Analytics Module** (read-only KPIs) implementiert unter `apps/api/src/modules/analytics/`
- **5 GET-Endpoints:** `/analytics/overview`, `/analytics/skills`, `/analytics/reviews`, `/analytics/governance`, `/analytics/time`
- **Logging Integrity Audit** durchgeführt, dokumentiert in `team_findings.md`
- **Performance-Indizes** für action_logs ergänzt (Migration 008)
- **Tests:** Service-Unit, Controller-Smoke, Logging-Integrität

### Enterprise Security Hardening (2026-02-19T22:30:00Z)

- **AuthN:** All /analytics/* require X-User-Id (401 if missing)
- **AuthZ:** analytics.read permission via PolicyEngine; 403 if missing
- **Tenant Binding:** X-Client-Id required (fail closed); query params may only narrow, never expand
- **ISO-UTC Timestamps:** lastSeenAt, lastTimeGapAt serialized via toISOString()
- **Input Validation:** ValidationPipe + DateRangeValidator (from < to, max 90d)
- **Migration 008 Check:** onModuleInit warns if indexes missing (non-fatal)

### Follow-up Hardening (2026-02-19T21:00:00Z)

- **Table usage corrected:** Analytics uses **action_logs** and **review_requests** only. NOT review_actions, NOT decisions.
- **Logging gap fixed:** review.access.denied now includes project_id, client_id (best-effort from review_requests) — analytics filters no longer miscount denied events.
- **Migration 008:** README.md updated with run instruction; no automated migration runner in repo — manual psql execution required.
- **Monorepo tests:** Analytics tests run via `pnpm -C apps/api test`. `pnpm -r test` has pre-existing failures in governance-v2 package (out of scope).

---

## Table Usage (Confirmed)

| Table          | Used by Analytics | Endpoints / Queries                                                                 |
|----------------|-------------------|--------------------------------------------------------------------------------------|
| action_logs    | ✅ Yes            | overview, skills, governance, time — all KPI aggregations                            |
| review_requests| ✅ Yes            | reviews — status counts, commit_token_used, commitConversion                         |
| review_actions | ❌ No             | Not queried by AnalyticsService                                                      |
| decisions      | ❌ No             | Not queried by AnalyticsService                                                      |

---

## Files Added

| Path | Description |
|------|--------------|
| `apps/api/src/modules/analytics/analytics.module.ts` | NestJS-Modul |
| `apps/api/src/modules/analytics/analytics.controller.ts` | REST-Controller |
| `apps/api/src/modules/analytics/analytics.service.ts` | KPI-Aggregation über action_logs, review_requests |
| `apps/api/src/modules/analytics/dto/analytics-query.dto.ts` | Query-DTO (from, to, projectId, clientId, agentId) |
| `apps/api/src/modules/analytics/analytics.service.spec.ts` | Service-Unit-Tests |
| `apps/api/src/modules/analytics/analytics.controller.spec.ts` | Controller-Smoke-Tests |
| `apps/api/test/analytics/logging-integrity.spec.ts` | Logging-Integritäts-Test |
| `infrastructure/db/migrations/008_analytics_indexes.sql` | Indizes für action, created_at, client_id |
| `ops/agent-team/ANALYTICS_V1_OUTPUT_REPORT.md` | Dieser Report |

---

## Files Modified (Hardening)

| Path | Change |
|------|--------|
| `apps/api/src/modules/reviews/reviews.controller.ts` | review.access.denied INSERT now includes project_id, client_id from review_requests |
| `ops/agent-team/team_plan.md` | Hardening workstream, corrected scope (action_logs + review_requests) |
| `ops/agent-team/team_progress.md` | Hardening entry |
| `ops/agent-team/team_findings.md` | Gap 1 fixed, Logging Readiness 9/10 |
| `README.md` | Migration 008 run instruction |
| `apps/api/test/analytics/logging-integrity.spec.ts` | Test for project_id/client_id columns; ModuleRef removed |

---

## Logging Readiness Score: 9/10

- **Present:** action, ts, projectId, clientId, agentId, reason, skillId/skillVersion/… (optional), decisionHash (enriched)
- **Fixed:** review.access.denied now populates project_id, client_id from review_requests (best-effort)
- **Conclusion:** Logging ausreichend für Analytics v1

---

## Deployment Requirements

**Migration 008** (Analytics Indexes) — **no automated migration runner** in this repo.

Apply manually before deploying Analytics v1:

```bash
psql -d your_database -f infrastructure/db/migrations/008_analytics_indexes.sql
```

README.md lists this in the migration section. Add to your deploy pipeline if you use one.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| DB-Performance bei >1M Zeilen | Indizes auf action, created_at, client_id (008) |
| Ungültige Date-Range | Validierung: max 90d, from &lt; to |
| PII-Leak | Keine raw payload_json, nur aggregierte Zahlen |
| review.access.denied filter miscount | FIXED — project_id/client_id now populated |
| Missing migration 008 | Documented; manual application required |

---

## Rollback Plan

1. `AnalyticsModule` aus `AppModule` entfernen
2. Migration 008 optional rückgängig (DROP INDEX IF EXISTS)
3. Revert ReviewsController changes if needed (review.access.denied would lose project_id/client_id again)

---

## Test Evidence

### Canonical Commands

```bash
# Analytics + logging-integrity tests
pnpm -C apps/api test -- src/modules/analytics test/analytics

# Full api tests (includes analytics)
pnpm -C apps/api test

# Lint
pnpm -C apps/api lint

# Monorepo (note: governance-v2 has pre-existing test failures)
pnpm -r lint   # Run from root
pnpm -r test   # Fails on governance-v2; use pnpm -C apps/api test for api
```

### Results

- `pnpm -C apps/api test -- src/modules/analytics test/analytics` — 16 tests passed
- `pnpm -C apps/api lint` — 0 errors

---

## Endpoint-Spec (Quick Reference)

| Endpoint | Returns |
|----------|---------|
| GET /analytics/overview | totalEvents, totalRuns, skillExecuted, skillBlocked, reviewRequired, timeGapDetected, policyViolations, skillSuccessRate, reviewRate, timeGapRate |
| GET /analytics/skills | Per skillId: executed, blocked, blockReasons (top 3), avgDurationMs, lastSeenAt |
| GET /analytics/reviews | totalReviews, approved, rejected, pending, commitTokenUsed, commitConversion |
| GET /analytics/governance | blockedByAction, topBlockReasons, policyViolations, decisionFinalizedCount |
| GET /analytics/time | timeGapDetected, lastTimeGapAt, dailyTrend |

**Query params:** from, to (UTC ISO, default 7d, max 90d), projectId?, clientId?, agentId?

**Required headers:** X-User-Id (AuthN), X-Client-Id (tenant binding). X-Project-Id optional.

---

## Security Hardening Summary (Enterprise Compliance)

| Control | Implementation |
|---------|----------------|
| AuthN | AnalyticsAuthGuard; X-User-Id required; 401 if missing |
| AuthZ | PolicyEngine.authorize("analytics.read"); 403 if missing permission |
| Tenant Binding | X-Client-Id required; query clientId/projectId must match or be omitted; fail closed |
| ISO-UTC | lastSeenAt, lastTimeGapAt via Date.toISOString() |
| Validation | ValidationPipe + DateRangeValidator (from < to, max 90d); 400 on invalid |
| Migration 008 | onModuleInit checks indexes; WARN if missing (no crash) |

**Permission:** analytics.read — granted to admin, reviewer via migration 009.

## Release Notes

- **Analytics v1** is production-ready for read-only KPI dashboards.
- **Migration 008** must be applied manually before use (no migration runner).
- **Migration 009** adds analytics.read to admin/reviewer roles.
- **review.access.denied** events now include project_id and client_id when available for correct analytics filtering.
