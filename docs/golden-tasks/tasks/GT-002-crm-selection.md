# GT-002: CRM Selection

## Meta

- **ID**: GT-002
- **Title**: CRM Selection for Sales Team
- **Phase**: `design`
- **Audience**: Client, Sales Director, IT Team
- **Tags**: `vendor-selection`, `design`, `integration`

## Kontext

### Branche
- B2B SaaS Company

### Stakeholder
- Client: Sales Director
- IT Team: CTO + Integration Engineer
- Vendor: 3 CRM-Anbieter im Vergleich

### Budget
- Budget: €120.000 (Jahreslizenz + Integration)
- Keine Budget-Erhöhung möglich

### Constraints
- Integration muss innerhalb von 6 Wochen abgeschlossen sein
- Bestehende Sales-Prozesse müssen unterstützt werden
- GDPR-Compliance erforderlich

## Decision Input

### Problem
- Sales-Team benötigt neues CRM-System
- 3 Optionen stehen zur Auswahl, keine ist perfekt
- Entscheidung muss schnell getroffen werden (Q1 Launch geplant)

### Alternativen
- Option 1: Vendor A (€100k, 4 Wochen Integration, gute API)
- Option 2: Vendor B (€120k, 6 Wochen Integration, perfekte Features)
- Option 3: Vendor C (€80k, 8 Wochen Integration, limitierte API)

### Annahmen
- Vendor B ist Feature-perfekt, aber teuer und Integration ist knapp
- Vendor A ist ausgewogen, aber API-Limits könnten problematisch sein
- Vendor C ist günstig, aber Integration dauert zu lange

### Risiken
- Integration-Delay (wenn Vendor C gewählt wird)
- Feature-Gaps (wenn Vendor A gewählt wird)
- Budget-Overrun (wenn Vendor B gewählt wird)

### Success Criteria
- CRM live bis Q1-Ende
- Integration erfolgreich (alle Sales-Prozesse unterstützt)
- Budget eingehalten

### Next Steps
- Vendor-Vergleich finalisieren
- Integration-Plan erstellen
- Contract-Negotiation starten

## Governance/Stress

### Review Pflicht
- **Ja**: Vendor-Selection > €100k erfordert Review
- **Reviewer**: CTO + Sales Director

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
- Escalation-Rate sollte niedrig sein (wenn korrekt finalisiert)

## Notes

### Was ist "realistisch" daran?
- Typische Vendor-Selection-Situation: Mehrere Optionen, Trade-offs
- Zeitdruck: Q1 Launch erfordert schnelle Entscheidung
- Governance-Stress: Budget-Schwelle erfordert Review

### Besonderheiten
- Testet Vendor-Selection-Governance (Review-Pflicht bei > €100k)
- Testet Design-Phase (frühe Entscheidung, große Auswirkungen)

