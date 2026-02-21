# Produktlogik - Kurzbeschreibung und Spezifikation

## 1. Kurzbeschreibung
Das Produkt ist ein agentenbasiertes Entscheidungs- und Governance-System fuer Projektarbeit.  
Ziel ist, Entscheidungen schneller, nachvollziehbar und revisionssicher zu machen - mit einem festen Ablauf statt ad-hoc Einzelentscheidungen.

Kernnutzen:
- Einheitlicher Decision-Lifecycle: Draft -> Review -> Commit -> Final
- Governance-by-Design: kritische Schritte werden technisch erzwungen
- Wiederverwendbares Wissen: Suche ueber Decisions, Reviews und Action-Logs
- Messbare Qualitaet: Drift-Metriken und Audit-Trail

## 2. Scope der Produktlogik
Im Scope:
- Orchestrierung von Entscheidungsablaeufen
- Policy- und Permission-Enforcement
- Projekt- und Mandanten-Scope (projectId/clientId)
- Logging, Escalation und Monitoring

Nicht im Scope:
- UI-Details
- Freitext-Prozesse ohne Governance-Gates
- Schreibzugriffe ausserhalb der freigegebenen Tool-Pfade

## 3. Eingaben und Ausgaben (fachlicher Vertrag)
### Eingaben
- User-Intent (z. B. "Decision erstellen", "Wissen suchen", "Phase aendern")
- Kontext: userId, agentId, projectId, clientId
- Tool-Input gemaess erlaubtem Schema

### Ausgaben
- Fachliches Ergebnis (Decision Draft, Suchtreffer, Status-Update, Blockierung)
- Strukturierter Audit-Log-Eintrag (action, input, output, ts, blocked/reason)
- Bei Verstoessen: deterministische Fehlermeldung und Escalation-Log

## 4. Ablauf der Produktlogik
1. Request annehmen und Kontext normalisieren  
2. Permission und Policy pruefen (fail-closed)  
3. Passenden Pfad waehlen:
   - Read-only Pfad (Knowledge/Monitoring/Analytics)
   - Decision-Pfad (Draft/Review/Finalize)
   - Projektkontext-Pfad (Phase/Context)
4. Fachlogik ausfuehren (Tool/Service)  
5. Ergebnis + Metadaten loggen (append-only)  
6. Antwort zurueckgeben

## 5. Harte Invarianten (MUSS)
- Kein Finalize ohne Review-Approval und gueltigen Commit-Token
- Kein Cross-Project/Cross-Tenant Zugriff
- Kein Erfolg ohne Audit-Logging (Logging-Fehler blockieren kritische Operationen)
- Kein Policy-Bypass (alle sensiblen Aktionen laufen durch PolicyEngine)
- Keine Raw-SQL Tool-Payloads im Customer-Data-Pfad

## 6. Qualitaetskriterien
- Nachvollziehbarkeit: jede kritische Aktion ist im Action-Log rekonstruierbar
- Determinismus: gleiche Regeln fuehren zu reproduzierbaren Entscheidungen
- Sicherheit: unautorisierte oder inkonsistente Anfragen werden geblockt
- Betriebsqualitaet: Drift-Metriken zeigen Rejection, Rework, Escalation, Completeness

## 7. Referenzdokumente
- `docs/ist-zustand-agent-system.md` (Detailzustand)
- `docs/onepager-agentensystem-architektur.md` (Architekturueberblick)
- `docs/governance.md` (Governance-Prinzipien)
- `ops/agent-team/*` (Plan, Findings, Progress, Decisions)
