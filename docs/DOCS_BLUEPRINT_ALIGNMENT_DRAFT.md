# DOCS BLUEPRINT ALIGNMENT DRAFT

**Zweck:** Reproduzierbare Bestandsaufnahme, Konfliktanalyse und minimaler Fix-Plan fuer Blueprint-Alignment.  
**Scope:** `docs/**` plus Root-Dokumente `README.md`, `AGENTS.md`, `PR_DESCRIPTION.md`.  
**Owner:** @teamlead_orchestrator  
**Last Updated:** 2026-02-21T08:51:07Z  
**Layer:** evidence

---

## 1) Inventory (Snapshot)

| path | layer | purpose | canonical? | duplicates-with | action (keep/merge/deprecate/propose-move) | risk |
|---|---|---|---|---|---|---|
| README.md | strategy | Repo-Architektur und Modulueberblick | yes | docs/ist-zustand-agent-system.md, docs/onepager-agentensystem-architektur.md | keep | low |
| AGENTS.md | operations | Guardrails, Rollen, Pflichtartefakte | yes | ops/agent-team/README.md, docs/governance.md | keep | low |
| PR_DESCRIPTION.md | operations | PR-Body-Template | yes | n/a | merge | medium (war zustandsspezifisch statt template) |
| docs/DOCS_BLUEPRINT_SPEC.md | strategy | Verbindliche Doku-Topologie und Trigger-Mapping | yes | n/a | keep | low |
| docs/DOCS_BLUEPRINT_ALIGNMENT_DRAFT.md | evidence | Inventory + Konflikte + Fix-Plan | no | n/a | keep | low |
| docs/ist-zustand-agent-system.md | architecture | Detailzustand Architektur/Module/Flows | yes | README.md, docs/onepager-agentensystem-architektur.md, docs/partner/REPO-ANALYSE-ZUSAMMENFASSUNG.md | keep | medium (Driftgefahr) |
| docs/ist-zustand-architecture-audit.md | evidence | Audit-Snapshot mit Befunden | no | docs/ist-zustand-agent-system.md, docs/skill-architecture-blueprint.md | keep | medium (zeitgebunden) |
| docs/produktlogik-spezifikation.md | strategy | Kompakter Produktlogik-Vertrag | yes | docs/marketing/onepager-agentensystem-pitch.md, docs/partner/WHITEPAPER.md | keep | low |
| docs/governance.md | operations | Governance-Ueberblick | yes | AGENTS.md, docs/governance-clock-hardening.md, docs/partner/WHITEPAPER.md | keep | medium |
| docs/governance-clock-hardening.md | operations | Clock/CI-Hardening-Richtlinie | no (domain-specific) | docs/governance.md, docs/ist-zustand-architecture-audit.md | merge | medium |
| docs/decisions.md | implementation | Decision Lifecycle und API/Tool-Vertrag | yes | docs/produktlogik-spezifikation.md, docs/partner/WHITEPAPER.md | keep | low |
| docs/drift_playbook.md | operations | Drift-Metriken + Massnahmen | yes | docs/ist-zustand-agent-system.md | keep | medium (Beispieldaten koennen altern) |
| docs/project-phases.md | implementation | Kurzueberblick Projektphasen | no | packages/workflow/src/definitions/*.yaml, docs/ist-zustand-agent-system.md | deprecate | medium (Terminologie-Mismatch) |
| docs/agent-types.md | implementation | Kurzliste Agententypen | no | docs/ist-zustand-agent-system.md, README.md | deprecate | low |
| docs/onepager-agentensystem-architektur.md | architecture | Stakeholder-Onepager Architektur | no (derived) | docs/ist-zustand-agent-system.md | keep | low |
| docs/skill-architecture-blueprint.md | architecture | Skill-Subsystem-Blueprint | yes (subdomain) | docs/skill-architecture-summary.md, docs/ist-zustand-architecture-audit.md | keep | medium |
| docs/skill-architecture-summary.md | evidence | Zusammenfassung Skill-Blueprint | no | docs/skill-architecture-blueprint.md | deprecate | low |
| docs/marketing/geschaeftspartner-onboarding-konzept.md | strategy | Business-Partner-Konzeptpapier | yes (partner-business) | docs/partner/WHITEPAPER.md, docs/partner/ONBOARDING-PITCH.md | keep | medium |
| docs/marketing/onepager-agentensystem-pitch.md | strategy | Pitch-Onepager | no (derived) | docs/produktlogik-spezifikation.md, docs/partner/ONBOARDING-PITCH.md | keep | low |
| docs/marketing/onboarding-pitch-sales-partner.md | strategy | Sales-spezifischer Onboarding-Pitch | no (derived) | docs/marketing/onepager-agentensystem-pitch.md, docs/partner/ONBOARDING-PITCH.md | propose-move | low |
| docs/partner/README.md | strategy | Einstieg fuer Partner-Dokupaket | no (derived index) | docs/marketing/* | propose-move | low |
| docs/partner/REPO-ANALYSE-ZUSAMMENFASSUNG.md | evidence | interne Partner-Zusammenfassung | no | docs/ist-zustand-agent-system.md, README.md | deprecate | medium |
| docs/partner/ARCHITEKTUR-EINFACH-ERKLAERT.md | strategy | vereinfachte Architektur-Erklaerung | no | docs/onepager-agentensystem-architektur.md | deprecate | low |
| docs/partner/ONBOARDING-PITCH.md | strategy | Partner-Onboarding Kurzpitch | no | docs/marketing/onepager-agentensystem-pitch.md | deprecate | low |
| docs/partner/WHITEPAPER.md | strategy | umfangreiche Partnerdarstellung | no | docs/produktlogik-spezifikation.md, docs/governance.md, docs/ist-zustand-agent-system.md | deprecate | medium |
| docs/golden-tasks/README.md | evidence | Golden-Task Regeln + Struktur | yes | ops/agent-team/golden_tasks.yaml | keep | medium (Task-Count Drift) |
| docs/golden-tasks/TEMPLATE.md | evidence | Vorlage fuer neue Golden Tasks | yes | n/a | keep | low |
| docs/golden-tasks/tasks/GT-001-website-relaunch.md | evidence | Szenario-Spezifikation GT-001 | yes | testdata/golden-tasks/GT-001/* | keep | low |
| docs/golden-tasks/tasks/GT-002-crm-selection.md | evidence | Szenario-Spezifikation GT-002 | yes | testdata/golden-tasks/GT-002/* | keep | low |
| docs/golden-tasks/tasks/GT-003-marketing-strategy-switch.md | evidence | Szenario-Spezifikation GT-003 | yes | testdata/golden-tasks/index.json (fehlender Fixture-Eintrag) | keep | medium |
| docs/golden-tasks/tasks/GT-004-gdpr-tracking-risk.md | evidence | Szenario-Spezifikation GT-004 | yes | testdata/golden-tasks/index.json (fehlender Fixture-Eintrag) | keep | medium |
| docs/golden-tasks/tasks/GT-005-scope-creep-dev.md | evidence | Szenario-Spezifikation GT-005 | yes | testdata/golden-tasks/index.json (fehlender Fixture-Eintrag) | keep | medium |
| docs/golden-tasks/tasks/GT-006-tool-stack-standardization.md | evidence | Szenario-Spezifikation GT-006 | yes | testdata/golden-tasks/index.json (fehlender Fixture-Eintrag) | keep | medium |
| docs/golden-tasks/tasks/GT-007-campaign-fail-budget-loss.md | evidence | Szenario-Spezifikation GT-007 | yes | testdata/golden-tasks/index.json (fehlender Fixture-Eintrag) | keep | medium |
| docs/golden-tasks/tasks/GT-008-commit-without-review.md | evidence | Szenario-Spezifikation GT-008 | yes | testdata/golden-tasks/index.json (fehlender Fixture-Eintrag) | keep | medium |

---

## 2) Konkrete Konflikte und Gaps

1. **Blueprint-SoT fehlte**
   - `docs/DOCS_BLUEPRINT_SPEC.md` war nicht vorhanden.
   - Folge: Kein zentraler, normativer Maßstab fuer Doku-Layer + Trigger-Mapping.

2. **PR-Template war inhaltlich statt strukturell**
   - `PR_DESCRIPTION.md` enthielt einen konkreten Change-Report statt wiederverwendbarer Vorlage.

3. **Regelduplikation ohne Canonical-Markierung**
   - Lifecycle/Governance-Regeln sind ueber Root, Docs, Partner- und Marketing-Dokus verteilt.
   - Ohne klare Canonical-Markierung entsteht Drift-Risiko.

4. **Uneinheitliche Header/Metadaten**
   - Viele Docs haben keine einheitlichen Felder (Zweck/Scope/Owner/Last Updated/Layer).

5. **Golden-Task Inkonsistenz**
   - `docs/golden-tasks/tasks/` enthaelt GT-001 bis GT-008,
   - `testdata/golden-tasks/index.json` nur GT-001/GT-002.
   - `ops/agent-team/golden_tasks.yaml` setzt `minimum_required: 25`.

6. **Kurzdocs mit inhaltlicher Drift**
   - `docs/project-phases.md` enthaelt `Consulting` als Phase, waehrend Kernkontext primär Discovery/Design/Delivery/Review nutzt.

---

## 3) Minimaler Fix-Plan (Tier-2 Draft)

### Bereits im Draft umgesetzt
- Canonical Spec geschaffen: `docs/DOCS_BLUEPRINT_SPEC.md`
- Inventory + Konfliktreport dokumentiert: `docs/DOCS_BLUEPRINT_ALIGNMENT_DRAFT.md`
- PR-Template wird auf Blueprint-Ausgabe standardisiert (`PR_DESCRIPTION.md`)
- Pflichtartefakte in `ops/agent-team/*` werden aktualisiert

### Bewusst **nicht** still ausgefuehrt (nur Proposed Plan)
- Keine stillen Moves/Renames in `docs/partner/*` oder `docs/marketing/*`
- Keine Loeschungen
- Keine semantische Umdeutung ohne Decision Record

---

## 4) Proposed Move/Deprecation Plan (nicht ausgefuehrt)

| current path | proposed path | type | rationale |
|---|---|---|---|
| docs/partner/** | docs/external/partner/** | propose-move | Trennt externe Stakeholder-Dokus von canonical Systemdoku |
| docs/marketing/onboarding-pitch-sales-partner.md | docs/external/marketing/onboarding-pitch-sales-partner.md | propose-move | Verkaufs-/Enablement-Doku als derived Material kapseln |
| docs/skill-architecture-summary.md | docs/evidence/skill-architecture-summary.md | propose-move | Summary als Evidence, nicht als zweite Spezifikation |
| docs/agent-types.md | in-place deprecate mit Verweis auf `docs/ist-zustand-agent-system.md` | deprecate | Doppelung vermeiden |
| docs/project-phases.md | in-place deprecate mit Verweis auf Workflow-Definitionen + IST-Doc | deprecate | Terminologie- und Phasen-Drift entschärfen |

---

## 5) Verification Plan (Draft)

- Strukturcheck:
  - Canonical-Doku vorhanden: `docs/DOCS_BLUEPRINT_SPEC.md`
  - Inventory-Tabelle vorhanden: `docs/DOCS_BLUEPRINT_ALIGNMENT_DRAFT.md`
  - PR-Template mit Standard-Sections vorhanden: `PR_DESCRIPTION.md`
- Ops-Evidence:
  - `team_plan.md`, `team_findings.md`, `team_progress.md`, `team_decisions.md` aktualisiert
- Golden-Task-Relevanz:
  - Fuer diesen Change: docs/process-only, daher Ausfuehrung optional im Tier-2-Modus
  - Referenzierte Baselines: `ops/agent-team/golden_tasks.yaml`, `docs/golden-tasks/**`, `testdata/golden-tasks/**`
