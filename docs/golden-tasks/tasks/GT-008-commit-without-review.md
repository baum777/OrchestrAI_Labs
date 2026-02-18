# GT-008: Commit Without Review

## Meta

- **ID**: GT-008
- **Title**: Attempted Commit Without Review: Governance Violation
- **Phase**: `delivery`
- **Audience**: Client, Project Manager, Development Team
- **Tags**: `governance-violation`, `delivery`, `escalation`

## Kontext

### Branche
- Software Development Agency

### Stakeholder
- Client: Product Owner
- Project Manager: Junior PM (neu im Team)
- Development Team: 3 Engineers

### Budget
- Budget: €60.000 (Development-Budget)
- Aktueller Stand: €55.000 (92% verbraucht)
- Rest-Budget: €5.000

### Constraints
- Launch-Datum ist fest (Client-Deadline)
- Keine Budget-Erhöhung möglich
- Review-Prozess ist neu für Junior PM

## Decision Input

### Problem
- Junior PM versucht Decision zu finalisieren ohne Review
- Decision betrifft Scope-Änderung > €10k (Review-Pflicht)
- Governance-Verletzung wird erwartet

### Alternativen
- Option 1: Review durchführen (korrekt, aber Zeitverlust)
- Option 2: Finalisierung ohne Review (Governance-Verletzung, Escalation)
- Option 3: Decision zurückziehen (keine Finalisierung)

### Annahmen
- Junior PM kennt Review-Pflicht nicht
- Finalisierung ohne Review wird blockiert
- Escalation wird geloggt

### Risiken
- Governance-Verletzung (wenn Finalisierung ohne Review)
- Launch-Delay (wenn Review durchgeführt wird)
- Client-Frustration (wenn Decision zurückgezogen wird)

### Success Criteria
- Governance-Verletzung verhindert
- Review durchgeführt
- Launch-Datum eingehalten

### Next Steps
- Review-Prozess erklären
- Review durchführen
- Decision finalisieren (nach Review)

## Governance/Stress

### Review Pflicht
- **Ja**: Scope-Änderungen > €10k erfordern Review
- **Reviewer**: Senior PM + Product Owner

### Erwartete Escalations
- **Erwartet**: Finalisierung ohne Review → Escalation geloggt
- **Erwartet**: Governance-Verletzung → Escalation geloggt

## Expected Outcomes

### Draft ok
- Draft wird erfolgreich erstellt
- Status: `draft`
- Alle Pflichtfelder vorhanden

### Finalize blocked/allowed
- **Blocked**: Ohne Review + Commit-Token (erwartet)
- **Allowed**: Nach Review + Commit-Token

### Logs
- `createDraft` intent geloggt
- `finalizeFromDraft` intent geloggt (wenn finalisiert)
- **Escalation geloggt** (wenn Finalisierung ohne Review versucht wird)

### Monitoring
- **Escalation-Rate steigt** (wenn Finalisierung ohne Review versucht wird)
- Decision Completeness sollte hoch sein (wenn korrekt finalisiert)

## Notes

### Was ist "realistisch" daran?
- Typische Governance-Verletzung: Junior PM übersieht Review-Pflicht
- System sollte Finalisierung blockieren und Escalation loggen
- Testet Escalation-Logging und Governance-Enforcement

### Besonderheiten
- **Testet Governance-Verletzung**: Finalisierung ohne Review sollte blockiert werden
- **Testet Escalation-Logging**: Escalation sollte geloggt werden
- **Testet Monitoring**: Escalation-Rate sollte steigen

