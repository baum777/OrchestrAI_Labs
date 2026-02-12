# Architekturübersicht

- **apps/**: Oberflächen und API-Grenzen. Keine Business-Logik.
- **packages/agent-runtime**: Agenten-Definitionen, Orchestrator, Execution-Layer.
- **packages/workflow**, **knowledge**, **governance**: Datengetriebene Services als reine Verträge.
- **packages/shared**: Typen, DTOs, Constants ohne Verhalten.
- **infrastructure/**: DB-, Vektor- und Speicherkonfigurationen.

