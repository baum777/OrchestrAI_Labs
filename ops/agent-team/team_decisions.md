# Team Decisions

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** strategy  
**Last Updated:** 2026-02-18T13:00:00+01:00  
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