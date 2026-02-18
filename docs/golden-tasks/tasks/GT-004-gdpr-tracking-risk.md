# GT-004: GDPR Tracking Risk

## Meta

- **ID**: GT-004
- **Title**: GDPR Compliance: Tracking Risk Assessment
- **Phase**: `review`
- **Audience**: Client, Legal Team, Development Team
- **Tags**: `compliance`, `gdpr`, `risk`

## Kontext

### Branche
- E-Commerce Platform

### Stakeholder
- Client: Legal Counsel
- Development Team: Backend + Frontend Engineers
- DPO: Data Protection Officer (extern)

### Budget
- Budget: €30.000 (Compliance-Audit + Fixes)
- Keine Budget-Erhöhung möglich

### Constraints
- GDPR-Audit muss bis Ende des Quartals abgeschlossen sein
- Bestehende Tracking-Implementierung muss geprüft werden
- Keine User-Daten dürfen verloren gehen

## Decision Input

### Problem
- Externe GDPR-Audit hat Tracking-Risiken identifiziert
- 3 kritische Bereiche müssen adressiert werden
- Compliance-Verletzung könnte zu Bußgeldern führen

### Alternativen
- Option 1: Tracking komplett entfernen (GDPR-safe, aber Analytics-Verlust)
- Option 2: Tracking mit Consent-Management (GDPR-compliant, Analytics erhalten)
- Option 3: Tracking auf EU-Server migrieren (GDPR-compliant, aber teuer)

### Annahmen
- Consent-Management ist technisch machbar
- EU-Server-Migration ist zu teuer für Budget
- Analytics-Verlust ist akzeptabel wenn Compliance sichergestellt ist

### Risiken
- Compliance-Verletzung (wenn Tracking nicht angepasst wird)
- Analytics-Verlust (wenn Tracking entfernt wird)
- Budget-Overrun (wenn EU-Server-Migration gewählt wird)

### Success Criteria
- GDPR-Compliance sichergestellt
- Tracking-Risiken eliminiert
- Budget eingehalten

### Next Steps
- Consent-Management implementieren
- Tracking-Audit durchführen
- DPO-Review einholen

## Governance/Stress

### Review Pflicht
- **Ja**: Compliance-Entscheidungen erfordern Review
- **Reviewer**: Legal Counsel + DPO

### Erwartete Escalations
- Wenn Finalisierung ohne Review versucht wird → Escalation erwartet
- Wenn Compliance-Risiken nicht dokumentiert werden → Escalation erwartet

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
- Escalation-Rate sollte niedrig sein (wenn korrekt finalisiert)
- Decision Completeness sollte hoch sein

## Notes

### Was ist "realistisch" daran?
- Typische Review-Phase-Entscheidung: Compliance-Risiken adressieren
- Hohe Governance-Anforderungen: Legal + DPO müssen reviewen
- Zeitdruck: Quartalsende-Deadline

### Besonderheiten
- Testet Review-Phase (Compliance-Entscheidungen)
- Testet Governance-Stress (mehrere Reviewer erforderlich)

