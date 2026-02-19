# SECTION A — Repository-Analyse: Interne Zusammenfassung

**Erstellt:** 2026-02-18  
**Zweck:** Interne Zusammenfassung für Partner-Onboarding, Produkt- und Pitch-Erstellung

---

## 1. Was ist das System?

**Kurz:** Eine **Agent-first-Plattform** für strukturierte Entscheidungsfindung und Prozessoptimierung in Projekten. Das System funktioniert als **unterstützender Mitarbeiter** und **Prozess-Optimierungs-Layer** – keine reinen Chatbots, sondern ein orchestriertes Team von KI-Agenten mit klaren Regeln, Prüfpunkten und nachvollziehbarer Dokumentation.

**Technisch:** Monorepo mit NestJS-API, Next.js-Dashboard, mehreren Packages (Agent-Runtime, Governance, Customer Data, Knowledge, Premium-Module). Agenten führen strukturierte Aktionen aus (z.B. Decisions erstellen, Reviews anfordern, Wissen suchen) – immer durch Governance-Gates kontrolliert.

---

## 2. Welches Problem löst es?

| Problem | Lösung durch das System |
|--------|-------------------------|
| **Entscheidungen sind implizit und nicht reviewt** | Strukturierter Lifecycle: Draft → Review → Commit → Final – technisch erzwungen |
| **Lessons Learned verschwinden** | Projekt-scharfe Suche über Decisions, Reviews, Action-Logs |
| **Governance kommt zu spät** | Policy-basierte Gates, Review-Pflicht, Commit-Token – keine Abkürzungen möglich |
| **Fehlende Transparenz** | Append-only Audit-Logs, Drift-Monitoring, messbare Qualitätskennzahlen |
| **Wissen bei Fluktuation verloren** | Memory-on-Disk: Repo-Artefakte + strukturierte Decisions als Single Source of Truth |

**Kern-Narrativ:** Viele Projekte scheitern nicht an fehlenden Ideen, sondern an unklaren Entscheidungen, Wiederholungsfehlern und fehlender Nachvollziehbarkeit.

---

## 3. Für wen ist es gedacht?

- **Ideal Customer Profile (ICP):** Organisationen mit mehreren parallelen Projekten, hoher Stakeholder-Komplexität, regulatorischem/Audit-Druck oder hohem Wissensverlust (Fluktuation, Outsourcing).
- **Buyer Personas:** Geschäftsführung/Bereichsleitung (Transparenz, Risiko-Reduktion), PMO/Programmleitung (Standardisierung, Durchsatz), Compliance/Risk/QA (Nachweis, Gate-Klarheit), Product/Engineering Leads (weniger Rework, bessere Priorisierung).

---

## 4. Was unterscheidet es von anderen Lösungen?

| Differenzierung | Erklärung |
|-----------------|-----------|
| **Governance-by-Design** | Kritische Schritte (z.B. Finalisierung) sind technisch erzwungen – kein „Goodwill“, sondern Gates. |
| **Repo-Artefakte > Chat-Kontext** | Entscheidungen, Findings, Progress leben in versionierten Repo-Artefakten – nicht im flüchtigen Chat. |
| **Agent-first statt UI-first** | Apps sind Oberflächen; die Logik liegt in Packages/Runtime – skalierbar, erweiterbar. |
| **Auditierbar statt nur „smart“** | Append-only Logs, deterministische Hashes, Replay-fähige Audit-Trails. |
| **Memory-on-Disk** | Wissen wird persistiert und ist wiederauffindbar – keine Abhängigkeit von Einzelpersonen. |

---

## 5. Projektstruktur (High-Level)

```
agent-system/
├── apps/                    # Oberflächen
│   ├── api/                 # NestJS-Orchestrator (vollständig)
│   └── web/                 # Next.js Dashboard
├── packages/                # Business-Logik
│   ├── agent-runtime/       # Orchestrator, Agents, Execution
│   ├── governance/          # Policy-Engine, Review-Engine
│   ├── governance-v2/       # Self-validating Meta-Layer
│   ├── customer-data/       # Customer Data Plane
│   ├── knowledge/           # Knowledge-API
│   ├── workflow/            # Phasen-Management
│   ├── shared/              # Typen, DTOs
│   └── premium/marketer/    # Generalist Marketer
├── infrastructure/          # DB, Storage, Vector
├── docs/                    # Dokumentation
└── ops/agent-team/          # Agent-Team Governance
```

---

## 6. Technologiestack

- **Backend:** NestJS (TypeScript), PostgreSQL (+ pgvector für Embeddings)
- **Frontend:** Next.js 14+, React 18+, Tailwind CSS
- **Governance:** Clock-Abstraktion für Determinismus, PolicyEngine, V1→V2 Bridge
- **Package Manager:** pnpm (Monorepo)

---

## 7. Entwicklungsstatus (Ist-Zustand)

**Abgeschlossen:**
- ✅ Decision Lifecycle (Draft → Review → Commit → Final) mit Governance-Gates
- ✅ Knowledge Search (Decisions, Reviews, Logs)
- ✅ Drift Monitoring (5 Metriken)
- ✅ Governance-V2 (Clock, Bridge, Hash-Integrität)
- ✅ Customer Data Plane (Connector-Registry, PolicyEngine)
- ✅ Premium-Modul „Generalist Marketer“ (KPI-Parsing, Storytelling)
- ✅ Dashboard (Audit Ledger, Approval Inbox, Fleet Monitor, Governance Matrix)

**In Entwicklung:**
- ⚠️ Knowledge-Embeddings (Vektor-Search)
- ⚠️ Workflow-Engine (erweiterte Phase-Runner)
- ⚠️ Golden Tasks E2E-Tests
- ⚠️ CI-Integration (Governance-Audit)

---

## 8. Use Cases (aus der Praxis)

1. **Projekt-Entscheidung festzurren:** Agent erstellt Draft, holt Review ein, finalisiert nur nach Approval (Audit-Trail inklusive).
2. **„Was haben wir letztes Mal gemacht?“:** Suche nach ähnlichen Entscheidungen/Begründungen im gleichen Projektkontext.
3. **Governance ohne Overhead:** System blockiert riskante Abkürzungen (z.B. Finalisierung ohne Review) automatisch.
4. **Qualitätsdrift erkennen:** Anstieg von Rejections/Escalations → klare Gegenmaßnahmen aus dem Playbook.
5. **Marketing-Daten nutzen:** Generalist Marketer übersetzt KPI-Trends in Narratives (PAS, AIDA) mit PII-Redaction.

---

## 9. Architekturentscheidungen (relevant für Partner)

| Entscheidung | Rationale |
|--------------|-----------|
| Finalisierung nur via Tool (kein REST) | Governance-Bypass vermeiden |
| PolicyEngine in packages/governance | Single Source of Truth für Policies |
| ProjectPhase in projects-Tabelle | Einfacher, 1:1 mit Projekt |
| Customer Data Plane read-only (Step 1) | Sicherheit vor Skalierung |

---

## 10. Vision / Roadmap

- **Kurz:** Governance-V2 vollständig integriert, Customer Data Plane Step 2–3, Replay-Engine vorbereitet.
- **Mittel:** Workflow-Engine, Vektor-Search, weitere Premium-Module (branchenspezifisch).
- **Lang:** Self-Regulating Agent-OS – kein Workstream ohne Validierung, keine Annahmen ohne Clarification, Governance-Score deterministisch messbar.

---

## 11. Rollenmodell (Agent-Team)

- **Team Lead / Orchestrator:** plant, delegiert, erzwingt Regeln
- **Implementer:** setzt Änderungen um
- **Reviewer:** prüft, stoppt Risiken
- **QA/E2E:** verifiziert via Golden Tasks

---

*Diese Zusammenfassung dient als Basis für Whitepaper, Architektur-Erklärung und Onboarding-Pitch.*
