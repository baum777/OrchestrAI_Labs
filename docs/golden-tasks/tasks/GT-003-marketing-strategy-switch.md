# GT-003: Marketing Strategy Switch

## Meta

- **ID**: GT-003
- **Title**: Marketing Strategy Switch: From Outbound to Inbound
- **Phase**: `discovery`
- **Audience**: Client, Marketing Director, Sales Team
- **Tags**: `strategy`, `discovery`, `pivot`

## Kontext

### Branche
- B2B Consulting Firm

### Stakeholder
- Client: Marketing Director
- Sales Team: Sales Manager + 5 Sales Reps
- Agency: Marketing Agency (extern)

### Budget
- Budget: €150.000 (Jahres-Marketing-Budget)
- Umverteilung: €100k von Outbound zu Inbound

### Constraints
- Sales-Team ist auf Outbound-Tools trainiert
- Inbound-Infrastruktur (Website, Content) fehlt noch
- Q2 Launch geplant

## Decision Input

### Problem
- Outbound-Marketing (Cold Calls, Email) liefert nicht mehr genug Leads
- Inbound-Marketing (Content, SEO) wird als Alternative evaluiert
- Strategie-Wechsel erfordert große Umstellung

### Alternativen
- Option 1: Vollständig zu Inbound wechseln (€100k Umverteilung)
- Option 2: Hybrid-Ansatz (€50k Inbound, €50k Outbound)
- Option 3: Outbound optimieren (keine Umverteilung)

### Annahmen
- Inbound-Marketing liefert langfristig mehr qualifizierte Leads
- Sales-Team kann auf Inbound-Leads umgestellt werden
- Content-Infrastruktur kann bis Q2 aufgebaut werden

### Risiken
- Sales-Team-Resistance (wenn Outbound reduziert wird)
- Content-Infrastruktur nicht rechtzeitig fertig
- Lead-Qualität könnte sinken (während Transition)

### Success Criteria
- Inbound-Infrastruktur bis Q2 live
- Lead-Volume mindestens gleich (vs. Outbound)
- Sales-Team erfolgreich umgestellt

### Next Steps
- Content-Strategie entwickeln
- Inbound-Infrastruktur planen
- Sales-Team-Training starten

## Governance/Stress

### Review Pflicht
- **Ja**: Strategie-Wechsel > €50k erfordert Review
- **Reviewer**: Marketing Director + Sales Manager

### Erwartete Escalations
- Wenn Finalisierung ohne Review versucht wird → Escalation erwartet
- Wenn Budget-Umverteilung nicht dokumentiert wird → Escalation erwartet

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
- Typische Discovery-Phase-Entscheidung: Strategie-Wechsel
- Hohe Unsicherheit: Inbound-Marketing ist neu für das Team
- Governance-Stress: Budget-Umverteilung erfordert Review

### Besonderheiten
- Testet Discovery-Phase (frühe strategische Entscheidung)
- Testt Budget-Umverteilung (nicht nur Erhöhung)

