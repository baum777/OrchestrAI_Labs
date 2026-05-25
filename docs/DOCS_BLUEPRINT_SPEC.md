# DOCS BLUEPRINT SPEC

**Purpose:** Verbindliche Struktur und Regeln fuer Dokumentation, Agent-Handling und Change-Evidence im Repo.  
**Scope:** Root-Dokumente, `docs/**`, `ops/agent-team/**`, PR-Ausgabeformat.  
**Owner:** @teamlead_orchestrator  
**Last Updated:** 2026-05-24T22:30:00Z  
**Layer:** strategy

---

## 1) Normative Sprache

- **MUSS** = verpflichtend.
- **DARF NICHT** = verboten.
- **SOLL** = starke Empfehlung, Abweichung muss begruendet sein.
- **KANN** = optional.

---

## 2) Canonical Source Hierarchie (bei Konflikten)

1. `AGENTS.md` und `ops/agent-team/policy_approval_rules.yaml` (Guardrails + Approval Gates)
2. `ops/agent-team/autonomy_policy.md` (Autonomy Ladder)
3. `docs/repo-specific-canonical-sources.md` (repo-lokale SoT-Liste + Konfliktregel)
4. `docs/DOCS_BLUEPRINT_SPEC.md` (dieses Dokument; Doku-Topologie + Process-Logik)
5. `README.md` (Repo-Architektur und Terminologie: Apps/Packages/Infrastructure/Ops)
6. Domain-Dokumente in `docs/**` (z. B. Governance, Decisions, Drift, Provider Resilience, Golden Tasks)

Wenn zwei Dokumente derselben Ebene widersprechen, MUSS ein Decision Record in
`ops/agent-team/team_decisions.md` angelegt werden.

---

## 3) Doku-Layer und Topologie

Alle Doku-Dateien MUESSEN einem Layer zugeordnet sein:

- **strategy**: Zielbild, Scope, Leitlinien, Produktlogik.
- **architecture**: Systemstruktur, Komponenten, Integrationsgrenzen.
- **implementation**: konkrete Schnittstellen, Flows, technische Vertrage.
- **operations**: Runbooks, Policies, Reviews, CI/Gates.
- **evidence**: Inventare, Audits, Test-/Nachweisartefakte.

Terminologie MUSS repo-konform sein:
- **Apps** = `apps/*` (UI/API-Oberflaechen, keine Kern-Businesslogik)
- **Packages** = `packages/*` (Businesslogik und Runtime)
- **Infrastructure** = `infrastructure/*`
- **Ops** = `ops/*`

---

## 4) Canonical Dokumentklassen

### 4.0 Canonical Layer Map (enforced)

| Layer | Canonical File |
|---|---|
| strategy | `docs/produktlogik-spezifikation.md` |
| architecture | `docs/ist-zustand-agent-system.md` |
| implementation | `docs/decisions.md` |
| operations | `docs/governance.md` |
| evidence | `docs/golden-tasks/GOLDEN_TASK_REGISTRY.md` |

Der Layer Map MUSS eindeutig sein (genau eine Canonical-Datei pro Layer).

### 4.1 Root
- `README.md` (canonical: Architektur-/Modul-Ueberblick)
- `AGENTS.md` (canonical: Agent Guardrails)
- `PR_DESCRIPTION.md` (canonical: PR-Body-Template)

### 4.2 Docs
- `docs/repo-specific-canonical-sources.md` (canonical SoT inventory and conflict rule)
- `docs/ist-zustand-agent-system.md` (canonical architecture baseline)
- `docs/produktlogik-spezifikation.md` (canonical strategy/logic summary)
- `docs/governance.md` (canonical governance overview)
- `docs/decisions.md` (canonical decision lifecycle contract)
- `docs/drift_playbook.md` (canonical monitoring operations)
- `docs/provider-resilience.md` (canonical provider routing and model-agnostic runtime contract)
- `docs/golden-tasks/README.md` + `docs/golden-tasks/tasks/*.md` (canonical scenario specs)

Alle anderen Dokus SOLLEN als **derived** oder **evidence** gekennzeichnet werden.

---

## 5) Model-Agnostic First Rule

Runtime- und Agent-Docs MUESSEN Rollen, Provider und Routing primaer ueber Faehigkeiten/Profile beschreiben, nicht ueber konkrete Vendor-/Modellnamen.

- **MUSS:** Capability-/Profile-Begriffe verwenden, z. B. `reasoning.lead`, `implementation.code`, `review.validation`, `qa.e2e`, `generalist.tool_capable`.
- **DARF:** konkrete Modell-/Vendor-Namen als Beispiel, Adapter-Metadaten oder historisches Evidence-Detail nennen.
- **DARF NICHT:** konkrete Modell-/Vendor-Namen als alleinige Source of Truth fuer Routing, Role Assignment oder Governance Gates verwenden.
- **MUSS:** `docs/provider-resilience.md` aktualisieren, wenn Provider-Routing, Model-Profile oder Runtime-Provider-Policies geaendert werden.
- **SOLL:** `docs/repo-specific-canonical-sources.md` aktualisieren, wenn sich SoT-Hierarchie oder Konfliktregeln aendern.

---

## 6) Trigger -> Pflicht-Doku/Evidence Mapping

| Trigger | MUSS | SOLL | DARF NICHT | KANN |
|---|---|---|---|---|
| Code-Aenderung (Produktivcode) | `team_progress.md` Eintrag | `team_findings.md` bei technischen Learnings | Aenderung ohne Evidence-Log | betroffene Domain-Doku ergaenzen |
| Policy-/Regel-Aenderung | `team_progress.md` + `team_decisions.md` | `team_findings.md` mit Risikoeinschaetzung | Regelsemantik ohne Decision Record aendern | `docs/governance.md` updaten |
| Architektur-/Schnittstellenaenderung | Canonical Architektur-Doku aktualisieren (`docs/ist-zustand-agent-system.md` oder Domain-canonical) | Mapping in `team_findings.md` dokumentieren | Mehrere neue SoT-Dateien fuer dieselbe Aussage erzeugen | Architekturdiagramm als Appendix |
| Provider-/Model-Routing-Aenderung | `docs/provider-resilience.md` + `team_progress.md` | `docs/repo-specific-canonical-sources.md` pruefen | Vendor-/Modellname als alleinige Routing-Policy setzen | Adapter-Metadaten als Appendix dokumentieren |
| CI/Governance Gate Aenderung | `team_progress.md` + `team_findings.md` + Approval Trigger pruefen | `docs/governance.md` referenzieren | Merge-Empfehlung ohne notwendige Approvals | Evidence in separatem Ops-Report |
| Doku-Refactor ohne Code | `team_progress.md` | `team_findings.md` (Konflikte/Gaps) | stille Moves/Renames | deprecate-notice mit Canonical-Verweis |
| Golden-Task-relevante Aenderung | Verifikationsteil MUSS relevante Golden Tasks nennen | Ausfuehrung je Autonomy Tier planen | Golden-Task-Relevanz weglassen | Task-Ausfuehrung + Evidence anhangen |

Zusatzregel:
- Wenn `docs/DOCS_BLUEPRINT_SPEC.md` geaendert wird, MUSS die PR-Beschreibung den Abschnitt
  **Golden Task Impact** enthalten.

---

## 7) Einheitliche PR-Ausgabe (verpflichtend)

Jede PR-Beschreibung MUSS diese Sections enthalten:

1. **Change Summary**
2. **Risk Assessment** (Low/Medium/High + Begruendung)
3. **Rollback Strategy** (konkrete Dateien/Commits)
4. **Verification** (Checks + Golden Tasks)
5. **Files Touched**
6. **Open Questions / Escalations** (falls Approval/Scope betroffen)

---

## 8) Regeln fuer Konsolidierung ohne Scope-Creep

- Neue SoT-Duplikate DARF es NICHT geben.
- Semantische Umdeutung DARF NICHT ohne Decision Record passieren.
- Moves/Renames DUERFEN nur als **Proposed Plan** dokumentiert werden.
- Nicht-canonical Dateien SOLLEN auf canonical Quellen verweisen.
- Destruktive Aktionen (Delete/Reset/Rebase/Force Push) DARF es NICHT ohne explizite Freigabe geben.

---

## 9) Definition of Done fuer Doku-Changes

Ein Doku-Change ist nur fertig, wenn:

- Pflicht-Artefakte aktuell sind:
  - `ops/agent-team/team_plan.md`
  - `ops/agent-team/team_findings.md`
  - `ops/agent-team/team_progress.md`
  - `ops/agent-team/team_decisions.md`
- Canonical Quelle klar benannt ist.
- Verification-Plan mit Golden-Task-Relevanz vorhanden ist.
- PR-Ausgabeformat aus Abschnitt 7 vollstaendig befuellt werden kann.
