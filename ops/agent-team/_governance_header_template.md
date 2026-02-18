# Governance Header Template

**Source of Truth für Governance-Artefakte**

---

## Standard Template

```markdown
# <Document Title>

**Version:** X.Y.Z  
**Owner:** @role_id  
**Layer:** strategy | architecture | implementation | governance  
**Last Updated:** YYYY-MM-DD  
**Definition of Done:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] ...

---

[Document Content]
```

---

## Erklärung der Felder

- **Version:** Semantische Versionierung (X.Y.Z)
- **Owner:** Role ID (z.B. `@teamlead_orchestrator`, `@implementer_codex`)
- **Layer:** Eines von: `strategy`, `architecture`, `implementation`, `governance`
- **Last Updated:** ISO-Datum (YYYY-MM-DD)
- **Definition of Done:** Konkrete, prüfbare Kriterien

---

## Layer-Zuordnung

- **strategy:** Planung, Workstreams, Entscheidungen auf Strategie-Ebene
- **architecture:** System-Design, Komponenten-Architektur, Schnittstellen
- **implementation:** Code-Änderungen, Implementierungs-Details, Execution Logs
- **governance:** Policies, Regeln, Compliance, Autonomy

---

## Beispiel

```markdown
# Team Plan

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** strategy  
**Last Updated:** 2026-02-13  
**Definition of Done:**
- [ ] Alle Workstreams haben Owner, Scope, Autonomy Tier
- [ ] Milestones sind definiert
- [ ] Approval Gates sind dokumentiert

---

[Content]
```

