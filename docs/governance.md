# Governance & Policy-Enforcement

**Aktualisiert:** 2026-02-18

## Übersicht

Das Agent-System verwendet ein mehrschichtiges Governance-System mit Policy-Enforcement, Review-Gates und deterministischer Audit-Validierung.

## Governance-Architektur

### Governance V1 (`packages/governance`)

**Policy Engine:**
- **Authorization**: Zugriffskontrolle basierend auf Rollen, Permissions und Client-Scope
- **Sanitization**: Parameter-Validierung, SQL-Injection-Schutz, Constraint-Enforcement
- **Redaction**: PII-Entfernung, Field-Filtering, DenyFields-Support
- **License Manager**: Premium-Feature Access Control

**Review Engine:**
- Review-Queue (PostgreSQL-basiert)
- Approval-Flow mit Commit-Token-Generierung
- Reviewer-Rollen (partner, senior, admin)

**Action Logging:**
- Append-only Audit-Trail (PostgreSQL)
- Context-Tracking (userId, projectId, clientId, agentId)
- Escalation-Events für Governance-Verletzungen

### Governance V2 (`packages/governance-v2`)

**Self-validating Meta-Layer:**
- **Clock-Abstraktion**: `FakeClock` für Tests, `SystemClock` für Produktion
- **Determinismus**: Replay-fähige Hashes (explizit ohne Timestamp)
- **Bridge-Pattern**: `V1PolicyEngineAdapter` für nahtlose Migration
- **Validators**: Workstream-Validator, Document-Header-Validator
- **Compiler**: Decision-Compiler mit Policy-Integration
- **Clarification**: Ambiguity-Detector, Conflict-Detector
- **Scorecard**: Governance-Scorecard-Engine
- **Audit**: Audit-Runner für CI-Integration

## Policy-Enforcement

### Grundprinzipien

1. **Agents dürfen erst outputten, wenn eine Policy den Schritt freigibt**
   - PolicyEngine.authorize() prüft vor jeder Operation
   - PolicyError wird bei Verstößen geworfen
   - AdvisorCard zeigt menschliche Erklärungen

2. **Richtlinien leben in `packages/governance` und `packages/governance-v2`**
   - V1: Policy-Engine mit Authorization, Sanitization, Redaction
   - V2: Self-validating Meta-Layer mit Clock-Abstraktion

3. **Logs und Entscheidungen werden zentral gespeichert**
   - PostgreSQL-basierte Action-Logs (append-only)
   - Decisions mit Review-History
   - Deterministische Hashes für Audit-Validierung

## Review-Gates

### Decision Lifecycle

- **Draft**: Erstellung ohne Review
- **Review**: Review-Request mit Approval-Flow
- **Commit**: Commit-Token nach Approval
- **Final**: Finalisierung nur via Tool mit Commit-Token

### Hardening

- Status-Check: Nur Draft → Final
- Review-Approval-Check: Review muss approved sein
- Project-Match-Check: Review und Decision müssen zum selben Projekt gehören
- Logging-Enforcement: Fehlendes Audit-Logging blockiert Finalisierung

## Customer Data Plane

### Connector Registry

- Single- und Multi-Source-Routing
- Client-Scoped Connectors
- Health-Checks

### Capability Registry

- Operation-Allowlisting
- Schema-Validation
- Field-Constraints (allowedFields, denyFields)

### Constraints

- MaxRows-Limits
- Field-Filtering
- PII-Redaction

## Hash-Integrität

**100%ige Validierung:**
- Jeder Policy-Decision wird ein deterministischer Hash zugeordnet
- Hash-Basis: `{ operation, context: { userId, clientId, projectId } }` (ohne Timestamp)
- Replay-fähig: Gleiche Inputs → identische Hashes
- Live-Verify UI im Dashboard für Hash-Validierung

**Referenz:** Siehe [Marketer Stress Test Report](../ops/test-reports/MARKETER_STRESS_TEST_RESULT.md) für vollständige Validierung.

## Timestamp-Integrität

**Deterministische Timestamp-Policy:**
- **Regel:** `updatedAt >= createdAt` (immer)
- **Self-healing:** Bei Inkonsistenz wird `updatedAt` automatisch auf `createdAt` gesetzt
- **Validierung:** DocumentHeaderValidator prüft Erstellt/Aktualisiert-Felder in Dokumentations-Headern
- **Utility:** `packages/shared/src/utils/timestamp-integrity.ts` für zentrale Timestamp-Logik

**Implementierung:**
- `validateTimestampIntegrity()`: Validiert Timestamp-Paare
- `enforceTimestampIntegrity()`: Korrigiert Inkonsistenzen automatisch
- `generateCreationTimestamps()`: Generiert konsistente Timestamps für neue Dokumente
- `generateUpdateTimestamps()`: Generiert Update-Timestamps unter Erhaltung von `createdAt`

**Script:** `scripts/validate-timestamp-integrity.ts` für Batch-Validierung aller Markdown-Dateien

## Premium-Features

### License Manager

- Tier-basierte Zugriffskontrolle (free, standard, premium)
- Feature-Allowlisting
- Premium-Module (z.B. Generalist Marketer)

### Policy-Integration

- Premium-Features erfordern entsprechende License
- PolicyError mit AdvisorCard bei fehlender Berechtigung

## Weitere Informationen

- **IST-Zustand**: [ist-zustand-agent-system.md](ist-zustand-agent-system.md)
- **Decisions**: [decisions.md](decisions.md)
- **Drift Playbook**: [drift_playbook.md](drift_playbook.md)
- **Agent-Team Governance**: [../ops/agent-team/README.md](../ops/agent-team/README.md)
