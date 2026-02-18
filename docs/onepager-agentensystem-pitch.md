# Onepager (Pitch): Agentensystem als unterstützender Mitarbeiter & Prozess-Optimierungs-Layer

**Kurzfassung:** Eine **Agent-first-Plattform**, die Projektarbeit beschleunigt und Entscheidungen belastbar macht – durch **strukturierte Entscheidungsworkflows**, **Governance-by-Design**, **Knowledge Retrieval** und **messbare Qualitätskontrolle**.

## Problem
- Entscheidungen in Projekten sind oft **implizit**, **nicht reviewt**, **schwer nachvollziehbar** und werden bei Teamwechseln **neu erfunden**.
- Governance/Compliance wird häufig als **nachgelagerter Prozess** gelebt (zu spät, zu teuer).
- Kontext (frühere Entscheidungen, Reviews, Incidents) ist da, aber **nicht auffindbar** oder nicht projekt-scharf.

## Lösung (Was das System liefert)
- **Decision Lifecycle als Standardprozess**: Draft → Review → Commit → Final
- **Gates statt Goodwill**: Kritische Schritte sind technisch erzwungen (Review-Approval, Commit-Token, Status-/Projekt-Match, Logging-Enforcement)
- **Wissen direkt nutzbar**: projekt-scharfe Suche über Decisions, Reviews und Action-Logs
- **Drift sichtbar machen**: Monitoring-Metriken + Playbook (Qualität ist messbar und steuerbar)

## Kern-Usecases (aus der Praxis)
- **Projekt-Entscheidung festzurren**: Agent erstellt Draft, holt Review ein, finalisiert nur nach Approval (Audit-Trail inklusive).
- **„Was haben wir letztes Mal gemacht?“**: Suche nach ähnlichen Entscheidungen/Begründungen/Tradeoffs im gleichen Projektkontext.
- **Governance ohne Overhead**: System blockiert riskante Abkürzungen (z. B. Finalisierung ohne Review) automatisch.
- **Qualitätsdrift erkennen**: Anstieg von Rejections/Missing Logs/Escalations → klare Gegenmaßnahmen aus dem Playbook.

## Rollenmodell (Menschen + Agenten)
### Default Team-Rollen (Operating Model)
- **Team Lead / Orchestrator (GPT-5.2 Thinking)**: delegiert, orchestriert Runs, erzwingt Regeln
- **Implementer (Codex)**: setzt Änderungen um
- **Reviewer (Claude, review-only)**: prüft, bewertet, stoppt Risiken
- **QA/E2E (Playwright + Golden Tasks)**: verifiziert via Golden Tasks/Smoke Tests

### Agent-Typen (im Runtime-Layer)
- **Governance-Agent**: Policy/Approval Gates, Escalations
- **Knowledge-Agent**: Suche/Retrieval (projekt-scharf)
- **Project-Agent**: Kontext/Phase-Hints, Checklists, Risiken
- **Documentation-Agent**: Dokumente/Artefakte, Memory-on-Disk
- **Junior-Agent**: Zuarbeit/Entwürfe unter klaren Grenzen

## Warum jetzt / Differenzierung
- **Repo-Artefakte sind die Wahrheit**: Entscheidungen, Findings, Progress und Decisions sind versioniert („Memory-on-Disk“).
- **Auditierbar statt nur „smart“**: Append-only Logs + enforced Reviews/Commits.
- **Agent-first statt UI-first**: Apps sind Oberfläche; Logik/Policies liegen in Packages/Runtime.

## Erfolgskennzahlen (Beispiele)
- Sinkende **Review-Rejection-Rate** bei gleichbleibender Strenge
- Weniger **Missing-Log-Incidents**
- Reduzierter **Rework** (Wiederverwendung von Entscheidungen)
- Kontrollierte **Escalation-Rate** (früh sichtbar, früh beheben)

## Referenzen im Repo
- **IST-Zustand (Detail)**: `docs/ist-zustand-agent-system.md`
- **Operating Model**: `ops/agent-team/README.md` und `ops/agent-team/*`

