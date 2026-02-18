# GT-001: Website Relaunch Budget Overrun

## Meta

- **ID**: GT-001
- **Title**: Website Relaunch: Budget Overrun
- **Phase**: `delivery`
- **Audience**: Client, Project Manager, Development Team
- **Tags**: `budget`, `scope-creep`, `delivery`

## Kontext

### Branche
- Mid-size Manufacturing Company

### Stakeholder
- Client: Marketing Director
- Project Manager: Senior PM
- Development Team: Frontend + Backend Engineers

### Budget
- Ursprüngliches Budget: €80.000
- Aktueller Stand: €95.000 (+18.75%)
- Rest-Budget: €5.000

### Constraints
- Launch-Datum ist fest (Marketing-Kampagne bereits gebucht)
- Keine Budget-Erhöhung möglich ohne Board-Approval
- Scope-Reduktion muss transparent kommuniziert werden

## Decision Input

### Problem
- Aktueller Scope kann nicht innerhalb des Budgets geliefert werden
- 3 Features müssen reduziert oder gestrichen werden
- Client erwartet volle Feature-Liste

### Alternativen
- Option 1: Scope reduzieren (3 Features streichen)
- Option 2: Budget erhöhen (Board-Approval erforderlich, 2-3 Wochen)
- Option 3: Timeline verlängern (Launch verschieben, Marketing-Kampagne anpassen)

### Annahmen
- Current scope cannot be delivered within budget
- Client will nicht auf Launch-Datum verzichten
- Board-Approval für Budget-Erhöhung ist unsicher

### Risiken
- Client dissatisfaction (wenn Features gestrichen werden)
- Quality degradation (wenn unter Zeitdruck entwickelt wird)
- Deadline slippage (wenn Timeline verlängert wird)

### Success Criteria
- Stakeholders aligned on scope/budget
- Budget variance < 5%
- Launch-Datum eingehalten

### Next Steps
- Prepare revised scope proposal
- Schedule stakeholder review
- Document scope changes in decision log

## Governance/Stress

### Review Pflicht
- **Ja**: Budget-Änderungen > 10% erfordern Review
- **Reviewer**: Senior PM + Client

### Erwartete Escalations
- Wenn Finalisierung ohne Review versucht wird → Escalation erwartet
- Wenn Scope-Creep ohne Dokumentation → Escalation erwartet

## Expected Outcomes

### Draft ok
- Draft wird erfolgreich erstellt
- Status: `draft`
- Alle Pflichtfelder vorhanden (assumptions, alternatives, risks, successCriteria, nextSteps)

### Finalize blocked/allowed
- **Blocked**: Ohne Review + Commit-Token
- **Allowed**: Nach Review + Commit-Token

### Logs
- `createDraft` intent geloggt
- `finalizeFromDraft` intent geloggt (wenn finalisiert)
- Escalation geloggt (wenn Governance-Verletzung)

### Monitoring
- Escalation-Rate könnte steigen (wenn Review fehlt)
- Decision Completeness sollte hoch sein (wenn korrekt finalisiert)

## Notes

### Was ist "realistisch" daran?
- Typische Situation in Delivery-Phase: Budget-Overrun durch Scope-Creep
- Stakeholder-Konflikt: Client will Features, Budget ist begrenzt
- Governance-Stress: Review-Pflicht wird oft übersprungen

### Besonderheiten
- Testet Budget-Governance (Review-Pflicht bei Budget-Änderungen)
- Testet Escalation-Logging (wenn Finalisierung ohne Review)

