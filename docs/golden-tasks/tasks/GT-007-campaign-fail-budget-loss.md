# GT-007: Campaign Fail Budget Loss

## Meta

- **ID**: GT-007
- **Title**: Marketing Campaign Fail: Budget Loss Analysis
- **Phase**: `review`
- **Audience**: Client, Marketing Director, Finance Team
- **Tags**: `campaign`, `budget-loss`, `review`

## Kontext

### Branche
- E-Commerce Retailer

### Stakeholder
- Client: Marketing Director
- Finance Team: CFO + Finance Manager
- Agency: Marketing Agency (extern)

### Budget
- Budget: €250.000 (Q1 Marketing-Campaign)
- Verlust: €80.000 (32% Budget-Verlust)
- Rest-Budget: €170.000

### Constraints
- Q2 Campaign muss geplant werden
- Budget-Verlust muss analysiert werden
- Keine weiteren Budget-Verluste akzeptabel

## Decision Input

### Problem
- Q1 Marketing-Campaign hat nicht die erwarteten Ergebnisse geliefert
- €80k Budget-Verlust durch ineffektive Kanäle
- Q2 Campaign muss angepasst werden

### Alternativen
- Option 1: Kanäle wechseln (von Paid Social zu SEO/Content)
- Option 2: Budget reduzieren (von €250k auf €150k)
- Option 3: Agency wechseln (neue Agency, gleiches Budget)

### Annahmen
- Paid Social war ineffektiv (niedrige ROI)
- SEO/Content ist langfristig besser, aber langsam
- Agency-Wechsel ist riskant (neue Learning-Curve)

### Risiken
- Weiterer Budget-Verlust (wenn Kanäle nicht gewechselt werden)
- Langsamere Lead-Generierung (wenn zu SEO gewechselt wird)
- Agency-Learning-Curve (wenn Agency gewechselt wird)

### Success Criteria
- Q2 Campaign ROI > 2.0
- Budget-Verlust < 10%
- Lead-Volume mindestens gleich

### Next Steps
- Campaign-Analyse durchführen
- Q2 Campaign-Plan erstellen
- Agency-Performance reviewen

## Governance/Stress

### Review Pflicht
- **Ja**: Budget-Verlust > 20% erfordert Review
- **Reviewer**: Marketing Director + CFO

### Erwartete Escalations
- Wenn Finalisierung ohne Review versucht wird → Escalation erwartet
- Wenn Budget-Verlust nicht dokumentiert wird → Escalation erwartet

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
- Typische Review-Phase-Entscheidung: Campaign-Performance analysieren
- Hohe Governance-Anforderungen: Budget-Verlust erfordert Review
- Zeitdruck: Q2 Campaign muss geplant werden

### Besonderheiten
- Testet Review-Phase (Post-Mortem-Entscheidungen)
- Testet Budget-Verlust-Governance (Review-Pflicht bei > 20%)

