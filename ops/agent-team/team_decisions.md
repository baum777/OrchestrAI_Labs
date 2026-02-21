# Team Decisions

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** strategy  
**Last Updated:** 2026-02-21T08:02:06Z  
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
