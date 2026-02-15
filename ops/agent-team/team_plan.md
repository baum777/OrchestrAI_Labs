# Team Plan

## Workstreams
| Workstream | Owner | Status | Scope (paths) | Autonomy Tier | Next Action | Blockers |
|---|---|---|---|---|---|---|
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
- [ ] (auto-filled when approval rules trigger)

## Notes
- Default lead: GPT-5.2 Thinking

