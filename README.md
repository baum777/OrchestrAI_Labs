# Agent-System Plattform

Dieses Repository definiert eine Agent-first-Architektur mit klarer Trennung zwischen
Laufzeit, Workflow, Knowledge und Governance. Die Apps in `apps/` dienen
nur als Oberfläche (Next.js UI, NestJS API), während die `packages/` das eigentliche
Produkt enthalten.

## Struktur-Highlights

- `apps/web`: Next.js App Router für Nutzer- und Admin-Oberfläche ohne Business-Logik.
- `apps/api`: NestJS-Orchestrator als Systemgrenze. Agenten-Logik bleibt außerhalb.
- `packages/agent-runtime`: Agenten-Definitionen, Orchestrator und Execution-Layer.
- `packages/workflow`, `packages/knowledge`, `packages/governance`: Datengetriebene Projektlogik, Knowledge-API und Richtlinien.
- `packages/shared`: Nur DTOs/Typen/Errors – keine Logik.
- `infrastructure/`: DB-Schema, pgvector, Storage-Konnektoren sowie Docker-Setup.

## Nächste Schritte

1. Agentenprofile in `packages/agent-runtime` definieren.
2. Workflow-Definitionen als YAML-Assets strukturieren.
3. Knowledge-, Governance- und Runtime-Komponenten über `pnpm` verbinden.