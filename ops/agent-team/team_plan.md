# Governance v2 Implementation Plan

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** strategy  
**Last Updated:** 2026-02-13  
**Definition of Done:**
- [ ] Alle Workstreams haben Owner, Scope, Autonomy Tier, Layer, Structural Model, Risks, DoD
- [ ] Milestones sind definiert und trackbar
- [ ] Approval Gates sind dokumentiert
- [ ] Keine Layer-Vermischung (nur strategy)

---

## Workstreams

| Workstream | Owner | Status | Scope (paths) | Autonomy Tier | Next Action | Blockers |
|---|---|---|---|---|---|---|
| PHASE 1 — Deterministic Structure Hardening | @implementer_codex | in_progress | `ops/agent-team/**` | 3 | Migration aller Artefakte | - |
| PHASE 2 — Validation Engine | @implementer_codex | todo | `packages/governance-v2/**` | 3 | Workstream Validator implementieren | Reviewer Approval |
| PHASE 3 — Clarification Layer | @implementer_codex | todo | `packages/governance-v2/clarification/**` | 3 | Ambiguity Detection implementieren | - |
| PHASE 4 — CI Integration + Continuous Audit | @observability_eval | todo | `.github/workflows/**`, `packages/governance-v2/audit/**` | 2 | Governance Linter erstellen | - |

---

## PHASE 1 — Deterministic Structure Hardening

**Owner:** @implementer_codex  
**Autonomy Tier:** 3  
**Layer:** implementation  
**Status:** in_progress

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
- Alle Artefakte enthalten Version, Owner, Last Updated, DoD, Layer
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

## Milestones

- [ ] M1: PHASE 1 abgeschlossen (Deterministic Structure Hardening)
- [ ] M2: PHASE 2 abgeschlossen (Validation Engine)
- [ ] M3: PHASE 3 abgeschlossen (Clarification Layer)
- [ ] M4: PHASE 4 abgeschlossen (CI Integration + Continuous Audit)

---

## Approval Gates Needed

- [ ] PHASE 2: Reviewer Approval (@reviewer_claude) erforderlich

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
