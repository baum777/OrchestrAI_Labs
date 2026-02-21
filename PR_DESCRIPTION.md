# PR DESCRIPTION TEMPLATE

**Purpose:** Standardisierte, blueprint-konforme PR-Beschreibung fuer dieses Repo.  
**Scope:** Alle Aenderungen in Code, Doku, Ops und Governance-Artefakten.  
**Owner:** @teamlead_orchestrator  
**Last Updated:** 2026-02-21T10:09:38Z  
**Layer:** operations

---

## Change Summary

- [x] `/governance` Dashboard (Phase-1 **warn-only**) implementiert: Header (Branch/Refresh/Badge), 4 KPI Cards, Tabs (Blueprint/Golden Tasks/PRs/Audit) mit Only-Issues Filter + Drawer
- [x] `/api/governance/status` Route Handler implementiert: letzter erfolgreicher Workflow-Run + Artifact `governance-status` → `governance-status.json` (ZIP-Extraction), 60s Cache, UI-safe Error-Fallbacks
- [x] Minimal PR-Enrichment: nur open PRs (base=branch) + Body-Parsing für Pflichtsektionen → non-compliance count
- [x] Web-Build stabilisiert (ohne neue Infra): Route-Dedupe via `/legacy/*`, ESM/CJS Config-Fixes, Import-Auflösung, TS-Resolution angepasst

**Betroffene Pfade (Auszug):**
- `apps/web/src/app/(dashboard)/governance/**`
- `apps/web/src/app/api/governance/status/route.ts`
- `apps/web/src/lib/github/governanceArtifact.ts`
- `apps/web/src/components/layout/Sidebar.tsx`

## Risk Assessment

**Risk Level:** Medium

- [x] Hauptrisiko: GitHub API/Artifact nicht verfügbar (Token fehlt, Workflow/Artifact fehlt) → UI könnte sonst crashen
  - Mitigation: API liefert immer gültigen Response (overall=WARN, leere Checks, `error`), UI zeigt "No artifact available yet" + Audit-Links
- [x] Risiko: ZIP/JSON Parsing edge-cases → könnte Fehler verursachen
  - Mitigation: Minimaler ZIP-Reader nur für benötigten File-Path; parsing errors werden abgefangen und als WARN zurückgegeben
- [x] Risiko: Änderungen an Web-Build/Config könnten andere Seiten beeinflussen
  - Mitigation: Änderungen sind lokal auf `apps/web` begrenzt; `pnpm -C apps/web lint` + `pnpm -C apps/web build` grün

## Rollback Strategy

- [x] Revert Commits auf Branch `cursor/governance-statusanzeige-9126`:
  - `feat(web): add governance dashboard backed by CI artifact`
  - `fix(web): ...` (Import/Build/Config Fixes)
  - `chore(web): move duplicate routes under /legacy`
- [x] Unverändert bei Rollback: keine DB/Infra/Migrationen, keine API-contract-breaking Änderungen außerhalb `apps/web`
- [x] Datenfolgen: keine (read-only GitHub API + UI)

## Verification Plan

### Checks
- [x] `pnpm -C apps/web lint` — pass
- [x] `pnpm -C apps/web build` — pass

## Golden Task Impact
- [x] Ich habe den Golden-Task-Impact bewertet (**ci-contract**: neues CI-Artifact wird konsumiert; keine Registry/Fixtures geändert)
- [x] Relevante Golden Tasks/Registry wurden nicht geändert (UI/CI-Read-only)
- [x] Keine Blueprint-SoT-Änderung in dieser PR

## Verification (Golden Tasks)
- [x] Relevante Golden Tasks: none (keine Golden-Task-Implementierung/Fixtures geändert)
- [x] Nicht ausgeführt: UI/Artifact-Read-only Änderung; Evidence über Web Build/Lint
- [x] Evidence: Build-Logs (`pnpm -C apps/web build`)

## Files Touched

- [x] Vollständige Pfadliste (Git)
  - `apps/web/src/app/(dashboard)/governance/page.tsx`
  - `apps/web/src/app/(dashboard)/governance/_components/GovernanceKpis.tsx`
  - `apps/web/src/app/(dashboard)/governance/_components/GovernanceTable.tsx`
  - `apps/web/src/app/api/governance/status/route.ts`
  - `apps/web/src/lib/github/governanceArtifact.ts`
  - `apps/web/src/components/layout/Sidebar.tsx`
  - `apps/web/src/app/layout.tsx`
  - `apps/web/postcss.config.cjs`
  - `apps/web/tailwind.config.cjs`
  - `apps/web/tsconfig.base.json`
  - `apps/web/src/app/(dashboard)/audit/page.tsx`
  - `apps/web/src/app/(marketing)/page.tsx`
  - `apps/web/src/app/legacy/**` (moved duplicates under `/legacy`)
  - `apps/web/src/components/marketing/*`
  - `packages/shared/src/utils/timestamp-integrity.ts`
  - `packages/shared/src/utils/timestamp-monitoring.ts`
  - `ops/agent-team/team_plan.md`
  - `ops/agent-team/team_findings.md`
  - `ops/agent-team/team_progress.md`
  - `ops/agent-team/team_decisions.md`

## Approval Gates (policy_approval_rules.yaml)

- [x] Trigger geprüft: `large_change` (möglicherweise, aufgrund LOC)
- [x] Trigger geprüft: `destructive_ops` (nein; keine Deletes/Force Push/Rebase)
- [x] Trigger geprüft: `ci_or_build` (nein; keine `package.json`/`pnpm-lock.yaml`/Workflows geändert)
- [x] Trigger geprüft: `prompt_or_agent_core` (**ja**; `ops/agent-team/**` + `PR_DESCRIPTION.md`)
- [x] Trigger geprüft: `prod_config` (nein)
- [x] Erforderliche Approvals: 1× `reviewer_claude` (wegen `prompt_or_agent_core`)

## Open Questions / Escalations

- [x] Offene Punkte: CI-Workflow lädt aktuell kein `governance-status` Artifact hoch → UI zeigt dann korrekt "No artifact available yet"
- [x] Eskalation: none (Phase-1 warn-only, read-only)

## Ops Evidence Updated

- [x] `ops/agent-team/team_plan.md` aktualisiert
- [x] `ops/agent-team/team_findings.md` aktualisiert
- [x] `ops/agent-team/team_progress.md` aktualisiert
- [x] `ops/agent-team/team_decisions.md` aktualisiert
