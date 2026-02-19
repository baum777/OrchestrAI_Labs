# CI Closure — TODO List (Non-Blocking Errors)

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** implementation  
**Last Updated:** 2026-02-19T18:00:00+01:00  
**Definition of Done:**
- [ ] Alle CI-blockierenden Fehler behoben
- [ ] Alle non-blocking Fehler dokumentiert mit Pfaden, Fehlermeldungen, Hypothesen, Commands
- [ ] Composer-ready Format für alle TODOs

---

## Blocking vs Non-Blocking

### ✅ CI-Blocker (BEHOBEN)
- ✅ **apps/web tsconfig.base.json path issue** — Behoben durch lokale Kopie + ESLint parserOptions
- ✅ **lint:clock script** — Existiert in root package.json
- ✅ **secrets-scan trufflehog image** — Verwendet `trufflesecurity/trufflehog:3` (korrekt)

### ⚠️ Non-Blocking (TODO für Composer)

---

## Composer Run Queue

| # | Category | Paths | Goal | Validation | Priority | Risk |
|---|----------|-------|------|-------------|----------|------|
| 1 | [TS] | `packages/agent-runtime/src/orchestrator/orchestrator.ts`, `packages/governance-v2/package.json` | Verify all governance-v2 imports resolve correctly. | `pnpm -C packages/agent-runtime typecheck` | P1 | Med |
| 2 | [TS] | `packages/agent-runtime/src/orchestrator/orchestrator.ts` | ✅ RESOLVED — SkillManifest/SkillPlan unified; explicit imports from @agent-system/skills. | `pnpm -C packages/agent-runtime typecheck` | P1 | Med |
| 3 | [Tests] | `apps/api/package.json`, `apps/api/test/compliance/*.e2e.spec.ts` | Fix Jest glob pattern so test:compliance runs correctly. | `pnpm -C apps/api test:compliance` | P1 | Low |
| 4 | [Config] | `apps/web/tsconfig.json`, `apps/web/.eslintrc.json` | ✅ RESOLVED — Skip. | — | — | — |
| 5 | [TS] | `packages/agent-runtime/src/orchestrator/orchestrator.ts` | Add optional chaining or nullish coalescing for reviewPolicy.reviewerRoles. | `pnpm -C packages/agent-runtime typecheck` | P2 | Low |
| 6 | [TS] | `packages/agent-runtime/src/orchestrator/orchestrator.ts` | Add type guard for result.output spread (unknown → object check). | `pnpm -C packages/agent-runtime typecheck` | P2 | Low |
| 7 | [Clock] | `packages/agent-runtime/src/orchestrator/orchestrator.ts`, `packages/governance/src/policy/policy-engine.ts`, `apps/api/src/modules/agents/agents.runtime.ts`, `apps/api/src/modules/decisions/decisions.service.ts`, `apps/api/src/modules/projects/projects.service.ts` | Replace all direct Date() usage with Clock interface; inject Clock via DI where needed. **Non CI-blocking, but governance-critical.** | `pnpm lint:clock` | **P0** | **High** |
| 8 | [Integration] | `apps/api/test/` (create `integration/` dir) | Create integration tests: orchestrator-skill-execution, customer-data-policy, policy-engine, time-gap-detection. | `pnpm -C apps/api test` | P2 | Med |
| 9 | [Lint] | `packages/skills/**`, `packages/shared/**`, `packages/governance-v2/**`, `ops/agent-team/report-generator.ts` | Fix unused vars (prefix with `_` or remove) and no-explicit-any. | `pnpm -r lint` | P2 | Low |

### Clock Policy Migration (TODO-007) — Governance-Critical

- **Priority:** P0  
- **Risk:** High  
- **Note:** Non CI-blocking, but governance-critical. Do NOT weaken Clock policy; migrate all direct `Date` usage to Clock interface.

---

## Summary

### CI Status
- ✅ **Lint:** Green (`pnpm -r lint` passes)
- ✅ **Secrets Scan:** Configured correctly (trufflehog:3)
- ✅ **Timestamp Integrity:** Workflow exists
- ⚠️ **Tests:** Compliance test pattern issue (non-blocking)

### Remaining Work
1. **TypeScript Type Alignment** (TODO-001, TODO-002, TODO-005, TODO-006)
2. **Test Configuration** (TODO-003)
3. **Clock Policy Migration** (TODO-007) — High Priority, aber nicht CI-blockierend
4. **Integration Tests** (TODO-008)
5. **Lint Cleanup** (TODO-009)

### Next Steps
1. Run Composer für TypeScript-Fixes (TODO-001, TODO-002, TODO-005, TODO-006)
2. Fix Jest test pattern (TODO-003)
3. Plan Clock Migration Workstream (TODO-007)
4. Add Integration Tests (TODO-008)

---

## Follow-up TODOs (Discovered During Queue Execution)

| ID | Category | Paths | Goal | Validation | Priority | Risk |
|----|----------|-------|------|-------------|----------|------|
| F-1 | [TS] | `apps/api/src/modules/users/user-roles.service.ts` | Fix invalid import: `@agent-system/governance/policy/policy-engine` — module not found. Use correct governance package path. | `pnpm -C apps/api test:compliance` | P1 | Low |
| F-2 | [TS] | `packages/agent-runtime/**`, `packages/skills/**` | Fix agent-runtime standalone typecheck: path resolution (@shared, @governance), .js extensions, missing modules. Blocks full validation of Queue #1/#2. | `pnpm -C packages/agent-runtime typecheck` | P1 | Med |

---

**Last Updated:** 2026-02-19T19:00:00+01:00

