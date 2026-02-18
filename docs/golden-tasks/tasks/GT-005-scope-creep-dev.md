# GT-005: Scope Creep Development

## Meta

- **ID**: GT-005
- **Title**: Scope Creep: Development Team Requests Additional Features
- **Phase**: `delivery`
- **Audience**: Client, Project Manager, Development Team
- **Tags**: `scope-creep`, `delivery`, `governance`

## Kontext

### Branche
- FinTech Startup

### Stakeholder
- Client: Product Owner
- Project Manager: Senior PM
- Development Team: 5 Engineers

### Budget
- Budget: €200.000 (Development-Budget)
- Aktueller Stand: €180.000 (90% verbraucht)
- Rest-Budget: €20.000

### Constraints
- Launch-Datum ist fest (Regulatory-Deadline)
- Keine Budget-Erhöhung möglich
- Scope-Änderungen müssen dokumentiert werden

## Decision Input

### Problem
- Development-Team möchte 3 zusätzliche Features implementieren
- Features sind "nice-to-have", nicht kritisch für Launch
- Budget ist fast aufgebraucht, keine Zeit für Review

### Alternativen
- Option 1: Features ablehnen (Budget einhalten, aber Team-Frustration)
- Option 2: Features in Phase 2 verschieben (nach Launch)
- Option 3: Features implementieren (Budget-Overrun, aber Team-Motivation)

### Annahmen
- Features sind technisch machbar
- Budget-Overrun ist möglich, aber nicht ideal
- Team-Motivation ist wichtig für Launch

### Risiken
- Budget-Overrun (wenn Features implementiert werden)
- Team-Frustration (wenn Features abgelehnt werden)
- Launch-Delay (wenn Features in Phase 1 bleiben)

### Success Criteria
- Launch-Datum eingehalten
- Budget < 5% Overrun
- Team-Motivation erhalten

### Next Steps
- Feature-Priorisierung durchführen
- Budget-Status kommunizieren
- Phase-2-Plan erstellen

## Governance/Stress

### Review Pflicht
- **Ja**: Scope-Änderungen > €10k erfordern Review
- **Reviewer**: Product Owner + Senior PM

### Erwartete Escalations
- Wenn Finalisierung ohne Review versucht wird → Escalation erwartet
- Wenn Scope-Creep nicht dokumentiert wird → Escalation erwartet

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
- Escalation geloggt (wenn Governance-Verletzung)

### Monitoring
- Escalation-Rate könnte steigen (wenn Review fehlt)
- Decision Completeness sollte hoch sein

## Notes

### Was ist "realistisch" daran?
- Typische Delivery-Phase-Situation: Scope-Creep durch Team-Requests
- Governance-Stress: Review-Pflicht wird oft übersprungen
- Team-Motivation vs. Budget-Kontrolle

### Besonderheiten
- Testet Scope-Creep-Governance (Review-Pflicht bei > €10k)
- Testet Escalation-Logging (wenn Finalisierung ohne Review)

