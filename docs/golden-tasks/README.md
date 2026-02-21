# Golden Tasks

**Purpose:** Regeln und Betriebsrahmen fuer Golden Task Definitionen im Repo.  
**Scope:** `docs/golden-tasks/**`, `testdata/golden-tasks/**`, `ops/agent-team/golden_tasks.yaml`.  
**Owner:** @teamlead_orchestrator  
**Layer:** evidence  
**Last Updated:** 2026-02-21T10:09:38Z

Golden Tasks sind **stabile, reproduzierbare Test-Szenarien** für das Agent-System. Sie dienen als:
- **Demo-Szenarien**: Realistische Entscheidungssituationen für Präsentationen
- **E2E-Tests**: Baseline für Regression-Tests und Qualitätssicherung
- **Source of Truth**: Dokumentierte Erwartungen für System-Verhalten

## Canonical Registry

- **Canonical SoT:** `docs/golden-tasks/GOLDEN_TASK_REGISTRY.md`
- Registry muss synchron sein mit:
  - `testdata/golden-tasks/**`
  - `ops/agent-team/golden_tasks.yaml`

## Regeln

### Stabile IDs
- Jede Task hat eine stabile ID: `GT-001`, `GT-002`, etc.
- IDs ändern sich nicht (auch bei Refactoring nicht)
- Neue Tasks erhalten die nächste freie Nummer

### Keine PII/Secrets
- Keine echten Namen, E-Mail-Adressen oder persönlichen Daten
- Keine API-Keys, Passwörter oder Credentials
- Keine internen Firmen-Daten

### Keine Live-Fetches
- Alle Tests sind **offline** und unabhängig von externen Services
- Keine HTTP-Requests zu externen APIs
- Keine Datenbank-Abhängigkeiten außer lokaler Test-DB

### Docs ≠ Fixtures
- **Docs** (`docs/golden-tasks/tasks/`) sind **human-readable** Markdown-Dateien
- **Fixtures** (`testdata/golden-tasks/`) sind **machine-readable** JSON-Dateien
- Beide müssen konsistent sein, aber getrennt gepflegt werden

## Struktur

```
docs/golden-tasks/
├── README.md (dieses Dokument)
├── TEMPLATE.md (Blueprint für neue Tasks)
└── tasks/
    ├── GT-001-website-relaunch.md
    ├── GT-002-crm-selection.md
    └── ...

testdata/golden-tasks/
├── index.json (Task-Registry)
└── GT-001/
    ├── input.createDraft.json
    └── expected.assertions.json
```

## Neue Task hinzufügen

1. Kopiere `TEMPLATE.md` nach `tasks/GT-XXX-task-name.md`
2. Fülle alle Sections aus (Meta, Kontext, Decision Input, Governance/Stress, Expected Outcomes, Notes)
3. Erstelle Fixture-Verzeichnis: `testdata/golden-tasks/GT-XXX/`
4. Erstelle `input.createDraft.json` (muss DTO-Validation bestehen)
5. Erstelle `expected.assertions.json` (minimale Assertions, keine harten IDs)
6. Füge Task zu `testdata/golden-tasks/index.json` hinzu

## Geprüfte Endpoints/Flows

### Primär
- **POST `/projects/:projectId/decisions/draft`**: Draft-Erstellung
  - Prüft: HTTP 201/200, `status === "draft"`, Arrays non-empty

### Optional (Smoke-Tests)
- **GET `/monitoring/drift`**: Drift-Metriken
  - Prüft: Response hat `metrics` Keys (keine harten Werte)
- **GET `/knowledge/search?projectId=...&q=...`**: Knowledge-Search
  - Prüft: Response hat `results` Array (optional)

## Minimal-Run Anleitung

### Mit Test-Framework (falls vorhanden)

```bash
cd apps/api
pnpm test:golden-tasks
```

### Manuell (curl)

Siehe `apps/api/test/golden-tasks/README.md` für manuelle Test-Schritte.

## Versionierung

- Golden Tasks sind **append-only**: Alte Tasks werden nicht geändert
- Neue Tasks werden hinzugefügt, bestehende bleiben stabil
- Änderungen an bestehenden Tasks müssen in Git auditierbar sein

