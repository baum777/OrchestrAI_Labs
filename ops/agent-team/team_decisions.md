# Team Decisions

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** strategy  
**Last Updated:** 2026-02-21T20:35:42Z  
**Definition of Done:**
- [ ] Jede Decision hat: date, decision, rationale, alternatives, implications, owner, layer
- [ ] Layer-Tag pro Decision vorhanden
- [ ] Format ist konsistent
- [ ] Keine Layer-Vermischung (Decisions können verschiedene Layers haben)

---

## Format
- date: YYYY-MM-DD
  decision: <Decision Text>
  rationale: <Warum wurde diese Entscheidung getroffen>
  alternatives: [<Alternative 1>, <Alternative 2>, ...]
  implications: <Was ändert sich durch diese Entscheidung>
  owner: @role_id
  layer: strategy | architecture | implementation | governance

---

## Decisions

- date: 2026-02-21
  decision: Phase-1 Governance Dashboard bleibt warn-only und liest den Status read-only aus dem CI Artifact `governance-status` via GitHub Actions API (inkl. minimaler ZIP-Extraction + 60s In-Memory-Cache)
  rationale: Schnell mergebar, geringes Risiko (keine neue Infra, keine Strict Toggles), UI kann live auf CI-Evidence zeigen; bei fehlendem Artifact muss die UI safe degradieren (kein Crash)
  alternatives:
    - Zusätzliche Dependencies für ZIP-Parsing (verworfen, um `package.json`/Lockfile-Änderungen zu vermeiden)
    - Strict/Fail-Closed UI (verworfen, da Phase-1 explizit warn-only)
    - Komplexe Visuals/Charts/PDF (verworfen, out-of-scope für Minimal)
  implications:
    - Neue Web-Route `/governance` mit KPIs + Tabs/Tabellen; API `/api/governance/status` liefert minimalen Contract inkl. Error-Fallbacks
    - Artifact muss in CI tatsächlich hochgeladen werden, sonst zeigt UI korrekt "No artifact available yet"
  owner: @implementer_codex
  layer: implementation

- date: 2026-02-21
  decision: Blueprint wird als technisch erzwungene Governance-Layer eingefuehrt (3-Layer Enforcement: Blueprint, Golden Tasks, PR Schema)
  rationale: Reine Richtlinien erzeugen Drift und sind in CI nicht belastbar pruefbar. Technische Validatoren mit warn-only Rollout reduzieren Risiko ohne destruktive Migration.
  alternatives:
    - Nur manuelle Review-Disziplin (verworfen, da nicht skalierbar)
    - Sofort strict/fail-on-error in CI (verworfen, da zu hohes Umstellungsrisiko)
  implications:
    - Neue Skripte `scripts/validate-blueprint.ts`, `scripts/validate-golden-tasks.ts`, `scripts/validate-pr-template.ts`
    - CI-Schritte laufen in Phase 1 warn-only; Phase 2 per Toggle strict
    - Canonical Registry `docs/golden-tasks/GOLDEN_TASK_REGISTRY.md` ist SoT fuer GT-IDs
  owner: @teamlead_orchestrator
  layer: governance

- date: 2026-02-21
  decision: `docs/DOCS_BLUEPRINT_SPEC.md` als zentrale Canonical-Spezifikation fuer Doku-Topologie, Trigger-Mapping und PR-Output verpflichtend fuehren
  rationale: Die geforderte Blueprint-SoT fehlte, waehrend Regeln auf mehrere Dateien verteilt waren. Eine normative Canonical-Quelle reduziert Interpretationsspielraum und macht Review/Testbarkeit moeglich.
  alternatives:
    - Weiterarbeit nur mit verstreuten Regeln in `README.md`/`ops/agent-team/*`/`docs/*` (verworfen, da drift-anfaellig)
    - Nur Inventory-Dokument ohne normative Spezifikation (verworfen, da keine verbindliche Prioritaet/Normsprache)
  implications:
    - Neue Canonical-Datei `docs/DOCS_BLUEPRINT_SPEC.md`
    - Trigger -> Pflicht-Doku/Evidence Mapping ist explizit dokumentiert
    - PR-Struktur wird ueber `PR_DESCRIPTION.md` standardisiert
  owner: @teamlead_orchestrator
  layer: strategy

- date: 2026-02-21
  decision: Partner-/Marketing-Dokumente als derived Material behandeln; Moves/Renames nur als Proposed Plan dokumentieren
  rationale: Es existieren inhaltliche Ueberlappungen zu canonical Systemdokus. Sofortige strukturelle Verschiebungen wuerden Scope vergroessern und koennten unbeabsichtigte Referenzbrueche verursachen.
  alternatives:
    - Sofortige Umbenennung/Verschiebung mehrerer Verzeichnisse (verworfen, da nicht minimal-invasiv im Tier-2-Draft)
    - Keine Trennung in canonical vs derived (verworfen, da SoT-Unklarheit bestehen bleibt)
  implications:
    - `docs/DOCS_BLUEPRINT_ALIGNMENT_DRAFT.md` dokumentiert deprecate/propose-move Plan
    - Keine destruktiven oder stillen Renames in diesem Schritt
    - Folgeworkstream fuer kontrollierte Migration erforderlich
  owner: @teamlead_orchestrator
  layer: strategy

- date: 2026-02-21
  decision: Produktlogik als kurzes, eigenstaendiges Spezifikationsdokument unter `docs/produktlogik-spezifikation.md` fuehren
  rationale: Die Produktlogik war ueber mehrere Artefakte verteilt (Pitch, Architektur, IST-Zustand), aber ohne kompakten Fachvertrag. Ein dediziertes Kurzformat reduziert Interpretationsspielraum.
  alternatives:
    - Produktlogik nur in `README.md` ergaenzen (verworfen, da zu unstrukturiert fuer Spezifikationszwecke)
    - Produktlogik als Abschnitt in `docs/ist-zustand-agent-system.md` pflegen (verworfen, da Detaildokument statt Kurzreferenz)
  implications:
    - Neues Dokument `docs/produktlogik-spezifikation.md` als kompakte Referenz
    - `README.md` erhaelt expliziten Link auf die Produktlogik-Spezifikation
    - Team-Artefakte (`team_plan`, `team_findings`, `team_progress`) verweisen auf diesen Docs-only Workstream
  owner: @implementer_codex
  layer: strategy

- date: 2026-02-14
  decision: Geschäftspartner-Onboarding als Business-Dokument in `docs/` pflegen
  rationale: `docs/` ist im Repo die zentrale Dokumentationsablage; es existiert noch keine Partner-/Vertriebsunterlage, daher neues, eigenständiges Onboarding-Paper ohne Tech-Stack
  alternatives:
    - Ablage unter `ops/` (verworfen, da `ops/` agent-/prozessbezogen ist)
    - Ablage im Root `README.md` (verworfen, da zu lang und zielgruppenspezifisch)
  implications:
    - Neues Dokument `docs/geschaeftspartner-onboarding-konzept.md`
    - Inhalt fokussiert auf Businessmodell, Produktnutzen und Verkaufskonzept (keine Implementierungsdetails)
  owner: GPT-5.2 (Cloud Agent)

- date: 2026-02-14
  decision: Pitch- und Architektur-Onepager als eigenständige Docs in `docs/` anlegen
  rationale: Onepager sind konsumierbare Einstiegsartefakte (für Stakeholder/Onboarding) und sollen die Detail-Doku nicht duplizieren, sondern kondensieren und verlinken
  alternatives:
    - In `README.md` integrieren (verworfen, da Root-README bereits kompakt ist und sonst überfrachtet)
    - Als Anhang in `docs/ist-zustand-agent-system.md` (verworfen, da Onepager bewusst separat „printbar"/teilbar sein sollen)
  implications:
    - Neue Dateien `docs/onepager-agentensystem-pitch.md` und `docs/onepager-agentensystem-architektur.md`
    - Beide verlinken auf `docs/ist-zustand-agent-system.md` als Single Source of Truth für Details
  owner: GPT-5.2 (Cloud Agent)

- date: 2026-02-18
  decision: Timestamp-Integritäts-Policy implementiert: updatedAt >= createdAt (immer)
  rationale: Dokumentations-Header zeigten Inkonsistenz (updatedAt < createdAt), was systemisch nicht möglich sein darf. Deterministische Clock-Logik mit Self-healing verhindert zukünftige Inkonsistenzen.
  alternatives:
    - Nur Validierung ohne Self-healing (verworfen, da inkonsistente States persistieren würden)
    - Manuelle Korrektur ohne Automatisierung (verworfen, da fehleranfällig)
  implications:
    - Timestamp-Integritäts-Utility in `packages/shared/src/utils/timestamp-integrity.ts`
    - DocumentHeaderValidator erweitert für Erstellt/Aktualisiert-Validierung
    - Self-healing: updatedAt wird automatisch auf createdAt gesetzt bei Inkonsistenz
    - Unit Tests für alle Szenarien
    - Dokumentations-Header korrigiert (ist-zustand-agent-system.md, governance.md)
  owner: @teamlead_orchestrator
  layer: governance

- date: 2026-02-18
  decision: PolicyEngine wird in packages/governance/ integriert (nicht als separates packages/policy/)
  rationale: PolicyEngine ist Kern-Governance-Funktionalität, nutzt bestehende Governance-Infrastruktur, vermeidet Duplikation, single package für Governance-Konzepte
  alternatives: [Neues packages/policy/ Package, Separate packages/governance-policy/ Package]
  implications: packages/governance/ wird erweitert um src/policy/ Unterverzeichnis, PolicyEngine nutzt bestehende Governance-Types, keine zusätzliche Package-Dependency
  owner: @teamlead_orchestrator
  layer: architecture

- date: 2026-02-18
  decision: ProjectPhaseStore Persistence: phase column wird zu projects Tabelle hinzugefügt (nicht separate project_phases Tabelle)
  rationale: Einfacher (kein JOIN erforderlich), phase ist 1:1 mit project, bestehende projects Tabelle erweitern ist konsistenter, weniger Migration-Komplexität
  alternatives: [Separate project_phases Tabelle, projects.metadata JSONB Feld]
  implications: Migration 004_project_phases.sql fügt phase Spalte hinzu, ProjectPhaseStore wird DB-backed (async), bestehende API bleibt kompatibel, Phase-State ist restart-safe
  owner: @teamlead_orchestrator
  layer: architecture
