# GT-006: Tool Stack Standardization

## Meta

- **ID**: GT-006
- **Title**: Tool Stack Standardization: Consolidate Development Tools
- **Phase**: `design`
- **Audience**: Client, CTO, Development Team
- **Tags**: `tooling`, `design`, `standardization`

## Kontext

### Branche
- Software Development Agency

### Stakeholder
- Client: CTO
- Development Team: 10 Engineers (verschiedene Teams)
- Vendor: 3 Tool-Anbieter im Vergleich

### Budget
- Budget: €50.000 (Tool-Lizenzen + Migration)
- Keine Budget-Erhöhung möglich

### Constraints
- Migration muss innerhalb von 3 Monaten abgeschlossen sein
- Bestehende Workflows müssen unterstützt werden
- Keine Downtime während Migration

## Decision Input

### Problem
- Development-Teams nutzen verschiedene Tool-Stacks (3 verschiedene IDEs, 2 verschiedene CI/CD-Tools)
- Standardisierung erforderlich für Effizienz und Wartbarkeit
- Entscheidung muss schnell getroffen werden (Q2 Start geplant)

### Alternativen
- Option 1: Tool-Stack A (€40k, 2 Monate Migration, gute Integration)
- Option 2: Tool-Stack B (€50k, 3 Monate Migration, perfekte Features)
- Option 3: Tool-Stack C (€30k, 4 Monate Migration, limitierte Features)

### Annahmen
- Tool-Stack B ist Feature-perfekt, aber teuer und Migration ist knapp
- Tool-Stack A ist ausgewogen, aber Integration könnte problematisch sein
- Tool-Stack C ist günstig, aber Migration dauert zu lange

### Risiken
- Migration-Delay (wenn Tool-Stack C gewählt wird)
- Feature-Gaps (wenn Tool-Stack A gewählt wird)
- Budget-Overrun (wenn Tool-Stack B gewählt wird)

### Success Criteria
- Tool-Stack standardisiert bis Q2-Ende
- Migration erfolgreich (alle Teams migriert)
- Budget eingehalten

### Next Steps
- Tool-Vergleich finalisieren
- Migration-Plan erstellen
- Team-Training starten

## Governance/Stress

### Review Pflicht
- **Ja**: Tool-Selection > €40k erfordert Review
- **Reviewer**: CTO + Senior Engineers

### Erwartete Escalations
- Wenn Finalisierung ohne Review versucht wird → Escalation erwartet
- Wenn Budget-Überschreitung nicht dokumentiert wird → Escalation erwartet

## Expected Outcomes

### Draft ok
- Draft wird erfolgreich erstellt
- Status: `draft`
- Alle Pflichtfelder vorhanden

### Finalize blocked/allowed
- **Blocked**: Ohne Review + Commit-Token
- **Allowed**: Nach Review + Commit-Token

### Logs
- `createDraft` intent geloggt
- `finalizeFromDraft` intent geloggt (wenn finalisiert)

### Monitoring
- Decision Completeness sollte hoch sein
- Escalation-Rate sollte niedrig sein

## Notes

### Was ist "realistisch" daran?
- Typische Design-Phase-Entscheidung: Tool-Standardisierung
- Hohe Unsicherheit: Migration-Risiken sind schwer abzuschätzen
- Governance-Stress: Budget-Schwelle erfordert Review

### Besonderheiten
- Testet Design-Phase (frühe Tool-Entscheidung)
- Testt Standardisierung (nicht nur Vendor-Selection)

