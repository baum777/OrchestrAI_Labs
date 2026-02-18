# Agent-System Plattform

Eine **Agent-first-Architektur** zur Unterstützung von Projektarbeit und Entscheidungsfindung. Das System fungiert als **unterstützender Mitarbeiter** und **Prozess-Optimierungs-Layer**, der strukturierte Entscheidungsfindung, Governance, Knowledge-Management und Monitoring bereitstellt.

## 🎯 Kern-Funktionalität

- **Strukturierte Entscheidungsfindung**: Draft → Review → Commit → Final Lifecycle mit Governance-Gates
- **Knowledge-Management**: Projekt-scoped Search über Decisions, Reviews und Action-Logs
- **Projektphasen-Management**: Phase-Hints, Review-Checklists und Common Risks pro Phase
- **Monitoring & Drift-Erkennung**: 5 Metriken (Rejection Rate, Missing Logs, Rework, Escalation, Completeness)
- **Governance & Compliance**: Policy-basierte Gates, Review-Gates, Action-Logging, Escalation-Handling
- **Governance-V2 & Determinismus**: Replay-fähige Audit-Logs mit deterministischen Hashes, Clock-Abstraktion für Testbarkeit
- **Premium-Module**: KI-Extension-Module für spezialisierte Use Cases (z.B. Generalist Marketer)

## 📁 Repo-Struktur

```
agent-system/
├── apps/                    # Oberflächen (keine Business-Logik)
│   ├── api/                 # NestJS-Orchestrator (vollständig implementiert)
│   └── web/                 # Next.js Dashboard (implementiert)
├── packages/                # Business-Logik (Agent-first)
│   ├── agent-runtime/       # Orchestrator, Agents, Execution
│   ├── governance/          # V1: Policy-Engine, Review-Engine
│   ├── governance-v2/       # V2: Self-validating Meta-Layer
│   ├── customer-data/       # Customer Data Plane
│   ├── knowledge/           # Knowledge-API, Embeddings
│   ├── workflow/            # Phase-Management, Escalation
│   ├── shared/              # Typen, DTOs, Errors
│   └── premium/             # Premium-Module
│       └── marketer/        # Generalist Marketer
├── infrastructure/          # DB, Storage, Vector
│   ├── db/                 # PostgreSQL-Schema, Migrationen
│   ├── vector/             # pgvector-Support
│   └── storage/            # Datei-Storage-Konnektoren
├── docs/                   # Dokumentation
├── ops/                    # Agent-Team Governance
│   ├── agent-team/         # Team-Plan, Findings, Progress
│   └── test-reports/       # Stress-Tests, Validierung
└── scripts/                # Test-Scripts, Utilities
```

## 📁 Struktur-Highlights

### Apps (Oberflächen)

**`apps/web`** (Next.js App Router):
- **Status**: Implementiert mit Dashboard-Seiten
- **Seiten**:
  - **Audit Ledger**: Audit-Log-Übersicht mit "Verify Integrity" Feature
  - **Approval Inbox**: Review-Queue, Approval-Flow
  - **Fleet Monitor**: Agent-Status-Übersicht
  - **Governance Matrix**: Governance-Übersicht
- **Komponenten**:
  - **Layout**: MainLayout, Sidebar
  - **Governance**: AdvisorCard (PolicyViolationAdvice)
  - **API-Client**: PolicyError-Handling, fetchApi-Wrapper

**`apps/api`** (NestJS-Orchestrator):
- **Status**: Vollständig implementiert
- **Module**:
  - **Agents**: Agent-Execution, Tool-Routing, Escalation-Logging, Customer-Data-Integration
  - **Decisions**: Draft-Erstellung, Finalisierung (nur via Tool), DTO-Validation
  - **Knowledge**: Projekt-scoped Search (Decisions, Reviews, Logs)
  - **Monitoring**: Drift-Metriken (5 Metriken) mit Playbook
  - **Projects**: Projektkontext, Phase-Management, Phase-Hints
  - **Reviews**: Review-Queue, Approval-Flow, Commit-Token-Generierung
  - **Logs**: Action-Log-Zugriff (PostgreSQL-basiert)
- **Runtime**:
  - **PostgreSQL-Integration**: ActionLogger, ReviewQueue, ReviewStore
  - **Filters**: PolicyError-Filter für strukturierte Error-Responses

### Packages (Business-Logik)

**Core Runtime:**
- `packages/agent-runtime`: Agenten-Definitionen, Orchestrator, Execution-Layer
  - **Orchestrator**: Agent-Run-Orchestrierung, Permission-Enforcement, Review-Gate-Validierung
  - **Agents**: 5 Agent-Typen (Knowledge, Project, Documentation, Junior, Governance)
  - **Execution**: Tool-Router, Tool-Permissions, Tool-Context
  - **Profiles**: Agent-Profile-Definitionen (JSON-basiert)

**Governance & Policy:**
- `packages/governance`: Policy-Enforcement, Review-Engine, Action-Logging (V1)
  - **Policy Engine**: Authorization, Sanitization, Redaction
  - **Review Engine**: Review-Queue, Approval-Flow
  - **License Manager**: Premium-Feature Access Control
- `packages/governance-v2`: **Self-validating Meta-Layer**
  - **Clock-Abstraktion**: `FakeClock`/`SystemClock` für Determinismus
  - **Bridge-Pattern**: `V1PolicyEngineAdapter` für V1→V2 Migration
  - **Validators**: Workstream-Validator, Document-Header-Validator
  - **Compiler**: Decision-Compiler mit Policy-Integration
  - **Clarification**: Ambiguity-Detector, Conflict-Detector
  - **Scorecard**: Governance-Scorecard-Engine
  - **Audit**: Audit-Runner für CI-Integration

**Data & Integration:**
- `packages/customer-data`: **Customer Data Plane**
  - **Connector Registry**: Single- und Multi-Source-Routing
  - **Capability Registry**: Operation-Allowlisting, Schema-Validation
  - **Constraints**: Field-Filtering, MaxRows, DenyFields
  - **Result Hash**: Deterministische Hash-Generierung (PII-exklusiv)

**Knowledge & Workflow:**
- `packages/knowledge`: Knowledge-API, Embeddings, Retrieval
  - **Ingestion**: Chunker, Parser, Upload
  - **Retrieval**: Search, Embeddings
  - **Models**: Knowledge-Item-Types
- `packages/workflow`: Datengetriebene Projektlogik, Phasen-Management
  - **Phase-Runner**: Phase-Execution, Escalation
  - **Validator**: Workflow-Validation
  - **Definitions**: YAML-basierte Phase-Definitionen

**Shared & Premium:**
- `packages/shared`: Typen, DTOs, Errors (keine Logik)
  - **Types**: Decision, Review, Agent, Project-Phase, Governance
  - **DTOs**: Validation-Schemas
  - **Errors**: PolicyError, Custom-Error-Types
- `packages/premium/marketer`: **Premium-Modul - Generalist Marketer**
  - **MarketerAgent**: Data-Driven Storytelling, Framework-Support (PAS, AIDA)
  - **KPIParser**: Semantische Trend-Analyse, Problem-Translation
  - **Marketing-Tool**: Policy-Integration, PII-Redaction

### Infrastructure
- `infrastructure/db`: PostgreSQL-Schema mit Migrationen
  - **Schema**: `schema.sql` (Basis-Schema)
  - **Migrationen**: 
    - `001_init.sql`: Basis-Schema (decisions, review_requests, review_actions, action_logs, projects)
    - `002_review_commit_token.sql`: Commit-Token-Support
    - `003_decisions_domain.sql`: Erweiterte Decision-Felder
    - `004_project_phases.sql`: Project-Phase-Support
  - **pgvector**: Vektor-Support für Embeddings (`vector/pgvector.sql`)
- `infrastructure/storage`: Datei-Storage-Konnektoren (Grundgerüst vorhanden)
- `infrastructure/docker-compose.yml`: Lokale Entwicklungsumgebung

## ✅ Implementierungs-Status

**Abgeschlossen (BLOCK 1-6)**:
- ✅ Shared Decision Types mit Section-Struktur (META, INTERNAL, CLIENT, OUTCOME, GOVERNANCE)
- ✅ DTO/Schema Validation (CreateDecisionDraftDto)
- ✅ Review Gate Hardening + Logging Enforcement
- ✅ Drift Monitoring (5 Metriken) + Escalation Instrumentation
- ✅ Knowledge Search (Decisions, Reviews, Logs)
- ✅ Projektkontext & Phasen-Hinweise

**Neu (Governance-V2 & Premium)**:
- ✅ **Governance-V2 Framework**: Clock-Abstraktion (`FakeClock`/`SystemClock`) für deterministische, replay-fähige Tests
- ✅ **V1PolicyEngineAdapter**: Bridge-Pattern für nahtlose V1→V2 Migration
- ✅ **Hash-Integrität**: 100%ige Validierung von Policy-Decisions via deterministische Hashes (Level 3 Stress-Test bestanden)
- ✅ **Premium-Modul "Generalist Marketer"**: KI-Extension mit KPI-Parsing, semantischer Trend-Analyse, Policy-Integration
- ✅ **Live-Verify UI**: Audit-Ledger mit "Verify Integrity" Feature für Hash-Validierung im Dashboard

**In Entwicklung / Erweiterungen**:
- ⚠️ Knowledge-Embeddings: Vektor-Search (Grundgerüst vorhanden, pgvector-Support vorhanden)
- ⚠️ Workflow-Engine: Erweiterte Phase-Runner-Logik (Grundgerüst vorhanden)
- ⚠️ Golden Tasks: E2E-Tests (Definiert in `docs/golden-tasks/`, teilweise implementiert)
- ⚠️ CI-Integration: Governance-Audit-Runner für kontinuierliche Validierung

## 📚 Dokumentation

- **[IST-Zustand](docs/ist-zustand-agent-system.md)**: Vollständige Dokumentation des aktuellen Systemzustands (inkl. Architektur)
- **[Onepager Architektur](docs/onepager-agentensystem-architektur.md)**: Kompakter Architekturüberblick
- **[Decisions](docs/decisions.md)**: Decision Lifecycle und API-Dokumentation
- **[Governance](docs/governance.md)**: Governance-Prinzipien und Policy-Enforcement
- **[Drift Playbook](docs/drift_playbook.md)**: Monitoring-Metriken und Maßnahmen
- **[Agent-Typen](docs/agent-types.md)**: Übersicht der Agent-Typen
- **[Projektphasen](docs/project-phases.md)**: Projektphasen-Management
- **[Marketer Stress Test](ops/test-reports/MARKETER_STRESS_TEST_RESULT.md)**: End-to-End Validierung des Premium-Moduls mit Governance-V2 Integration

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

## 🏗️ Architektur-Highlights

### Governance-V2 & Determinismus

Das System verwendet eine **V2-First Architektur** mit deterministischer Clock-Abstraktion:

- **Clock-Abstraktion**: `FakeClock` für Tests, `SystemClock` für Produktion
- **Replay-Fähigkeit**: Identische Inputs generieren identische Hashes (deterministisch)
- **Bridge-Pattern**: `V1PolicyEngineAdapter` ermöglicht nahtlose Migration von V1 zu V2
- **Hash-Integrität**: Policy-Decisions werden via SHA-256 Hashes validiert (100%ige Integrität im Stress-Test)

**Technische Details:**
- Hash-Basis: `{ operation, context: { userId, clientId, projectId } }` (explizit ohne Timestamp)
- Replay-fähig: Gleiche Inputs → identische Hashes
- Testbar: `FakeClock` ermöglicht deterministische Tests

### Premium-Module

**Generalist Marketer** (erstes KI-Extension-Modul):

- **Data-Driven Storytelling**: Übersetzt KPI-Trends in Marketing-Narrative
- **KPI-Parsing**: Semantische Trend-Analyse (CPC, Conversion-Rate, etc.)
- **Framework-Support**: PAS (Problem-Agitation-Solution) und AIDA
- **Policy-Integration**: Vollständige Governance-V2 Integration mit PII-Redaction
- **Premium-Licensing**: Feature-Access über LicenseManager

**Validierung:**
- ✅ Level 1: KPI-Parsing → MarketerAgent Kommunikation
- ✅ Level 2: PII-Redaction (Compliance)
- ✅ Level 3: Hash-Integrität (Determinismus)
- ✅ Level 4: Policy-Stop mit AdvisorCard-Support

### Audit-Sicherheit

**100%ige Hash-Integrität** im System:

- Jeder Policy-Decision wird ein deterministischer Hash zugeordnet
- Hash-Validierung im Dashboard via "Verify Integrity" Button
- Replay-fähige Audit-Logs für Compliance und Forensik
- Live-Verify UI zeigt Hash-Match Status mit Shield-Icon

**Referenz:** Siehe [Marketer Stress Test Report](ops/test-reports/MARKETER_STRESS_TEST_RESULT.md) für vollständige Validierung.

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
# PostgreSQL mit pgvector starten (via Docker)
docker-compose -f infrastructure/docker-compose.yml up -d

# Migrationen ausführen
psql -d your_database -f infrastructure/db/migrations/001_init.sql
psql -d your_database -f infrastructure/db/migrations/002_review_commit_token.sql
psql -d your_database -f infrastructure/db/migrations/003_decisions_domain.sql
psql -d your_database -f infrastructure/db/migrations/004_project_phases.sql

# pgvector Extension aktivieren
psql -d your_database -f infrastructure/vector/pgvector.sql
```

## 🛠️ Tech-Stack

### Frontend
- **Next.js 14+** (App Router)
- **React 18+** (Server Components, Client Components)
- **Tailwind CSS** (Utility-first Styling)
- **TypeScript** (Type Safety)

### Backend
- **NestJS** (Modular Architecture)
- **PostgreSQL** (mit pgvector für Embeddings)
- **TypeScript** (End-to-End Type Safety)

### Governance & Policy
- **Governance-V2**: Clock-Abstraktion, Bridge-Pattern, Determinismus
- **PolicyEngine**: V1 (Legacy) + V2 (Bridge-Adapter)
- **LicenseManager**: Premium-Feature Access Control

### Testing & Quality
- **tsx**: TypeScript Execution
- **FakeClock**: Deterministische Tests
- **Stress-Tests**: End-to-End Validierung (siehe `ops/test-reports/`)

## 📖 Weitere Informationen

- **[AGENTS.md](AGENTS.md)**: Repo Agent Guidelines
- **[ops/agent-team/README.md](ops/agent-team/README.md)**: Agent-Team Playbook
- **[docs/](docs/)**: Vollständige Dokumentation
- **[ops/test-reports/MARKETER_STRESS_TEST_RESULT.md](ops/test-reports/MARKETER_STRESS_TEST_RESULT.md)**: Security Audit & Stress-Test Validierung