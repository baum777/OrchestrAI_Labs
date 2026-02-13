# Agent-System Plattform

Eine **Agent-first-Architektur** zur Unterstützung von Projektarbeit und Entscheidungsfindung. Das System fungiert als **unterstützender Mitarbeiter** und **Prozess-Optimierungs-Layer**, der strukturierte Entscheidungsfindung, Governance, Knowledge-Management und Monitoring bereitstellt.

## 🎯 Kern-Funktionalität

- **Strukturierte Entscheidungsfindung**: Draft → Review → Commit → Final Lifecycle mit Governance-Gates
- **Knowledge-Management**: Projekt-scoped Search über Decisions, Reviews und Action-Logs
- **Projektphasen-Management**: Phase-Hints, Review-Checklists und Common Risks pro Phase
- **Monitoring & Drift-Erkennung**: 5 Metriken (Rejection Rate, Missing Logs, Rework, Escalation, Completeness)
- **Governance & Compliance**: Policy-basierte Gates, Review-Gates, Action-Logging, Escalation-Handling

## 📁 Struktur-Highlights

### Apps (Oberflächen)
- `apps/web`: Next.js App Router für Nutzer- und Admin-Oberfläche (Grundgerüst vorhanden)
- `apps/api`: NestJS-Orchestrator als Systemgrenze mit vollständig implementierten Modulen:
  - **Agents**: Agent-Execution, Tool-Routing, Escalation-Logging
  - **Decisions**: Draft-Erstellung, Finalisierung (nur via Tool), DTO-Validation
  - **Knowledge**: Projekt-scoped Search (Decisions, Reviews, Logs)
  - **Monitoring**: Drift-Metriken mit Playbook
  - **Projects**: Projektkontext, Phase-Management, Phase-Hints
  - **Reviews**: Review-Queue, Approval-Flow, Commit-Token-Generierung
  - **Logs**: Action-Log-Zugriff

### Packages (Business-Logik)
- `packages/agent-runtime`: Agenten-Definitionen, Orchestrator, Execution-Layer
- `packages/governance`: Policy-Enforcement, Review-Engine, Action-Logging
- `packages/knowledge`: Knowledge-API, Embeddings, Retrieval (Grundgerüst vorhanden)
- `packages/workflow`: Datengetriebene Projektlogik, Phasen-Management (Grundgerüst vorhanden)
- `packages/shared`: Typen, DTOs, Errors (keine Logik)

### Infrastructure
- `infrastructure/db`: PostgreSQL-Schema mit Migrationen, pgvector-Support
- `infrastructure/storage`: Datei-Storage-Konnektoren (Grundgerüst vorhanden)

## ✅ Implementierungs-Status

**Abgeschlossen (BLOCK 1-6)**:
- ✅ Shared Decision Types mit Section-Struktur (META, INTERNAL, CLIENT, OUTCOME, GOVERNANCE)
- ✅ DTO/Schema Validation (CreateDecisionDraftDto)
- ✅ Review Gate Hardening + Logging Enforcement
- ✅ Drift Monitoring (5 Metriken) + Escalation Instrumentation
- ✅ Knowledge Search (Decisions, Reviews, Logs)
- ✅ Projektkontext & Phasen-Hinweise

**Offen / TODO**:
- ⚠️ Workflow-Engine: Phase-Runner, Escalation-Logik (Grundgerüst vorhanden)
- ⚠️ Knowledge-Embeddings: Vektor-Search (Grundgerüst vorhanden)
- ⚠️ UI (apps/web): Nutzer-Oberfläche (Grundgerüst vorhanden)
- ⚠️ Golden Tasks: E2E-Tests (Definiert, aber nicht implementiert)

## 📚 Dokumentation

- **[IST-Zustand](docs/ist-zustand-agent-system.md)**: Vollständige Dokumentation des aktuellen Systemzustands
- **[Architektur](docs/architecture.md)**: Architekturübersicht
- **[Decisions](docs/decisions.md)**: Decision Lifecycle und API-Dokumentation
- **[Governance](docs/governance.md)**: Governance-Prinzipien
- **[Drift Playbook](docs/drift_playbook.md)**: Monitoring-Metriken und Maßnahmen

## 🤖 Agent-Team Operating Model

Dieses Repository verwendet ein strukturiertes Multi-Agent-Governance-System in `ops/agent-team/`.

### Kern-Prinzipien

- **Repo-Artefakte > Chat-Kontext**: Single Source of Truth
- **Memory-on-Disk**: Alle Entscheidungen und Findings werden in Markdown-Dateien persistiert
- **Autonomy Ladder**: Gestufte Autonomie-Ebenen mit Approval Gates
- **Golden Tasks**: Baseline Tasks für Qualitätssicherung
- **Scorecard**: Scoring Rubric + Gates

### Default Roles

- **Team Lead / Orchestrator**: GPT-5.2 Thinking (delegate-first)
- **Implementer**: Codex
- **Reviewer**: Claude (Review-only)
- **QA/E2E**: Playwright + Golden Tasks

### Workflow (Cursor)

1. Lese `ops/agent-team/README.md` + `team_plan.md`
2. Implementiere nur bounded tasks aus `team_plan.md`
3. Logge Findings + Progress sofort
4. Führe Golden Tasks für relevante Änderungen aus
5. Request Review + Scorecard Gate wenn erforderlich

### Mandatory Repo Artifacts

- `ops/agent-team/team_plan.md`: Workstreams, Owners, Status, Blockers
- `ops/agent-team/team_findings.md`: Discoveries, Root Causes, Gotchas
- `ops/agent-team/team_progress.md`: Timestamped Execution Log
- `ops/agent-team/team_decisions.md`: Decision Records

## 🚀 Quick Start

### Voraussetzungen

- Node.js >=20
- pnpm 9.8.0
- PostgreSQL (mit pgvector)

### Installation

```bash
pnpm install
```

### Entwicklung

```bash
# API starten
pnpm dev:api

# Web starten
pnpm dev:web
```

### Datenbank-Setup

```bash
# Migrationen ausführen
psql -d your_database -f infrastructure/db/migrations/001_init.sql
psql -d your_database -f infrastructure/db/migrations/002_review_commit_token.sql
psql -d your_database -f infrastructure/db/migrations/003_decisions_domain.sql
```

## 📖 Weitere Informationen

- **[AGENTS.md](AGENTS.md)**: Repo Agent Guidelines
- **[ops/agent-team/README.md](ops/agent-team/README.md)**: Agent-Team Playbook
- **[docs/](docs/)**: Vollständige Dokumentation