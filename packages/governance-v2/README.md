# Governance v2

**Version:** 0.1.0  
**Status:** Implementation Ready

## Übersicht

Governance v2 erweitert das bestehende Agent-System um eine **selbstvalidierende Meta-Ebene**. Das System validiert Workstreams und Decisions automatisch, erkennt Mehrdeutigkeiten und Konflikte, und berechnet kontinuierlich Governance-Scores.

## Architektur

```
packages/governance-v2/
├── validator/          # Workstream Validierung
├── compiler/          # Decision Pipeline
├── clarification/     # Ambiguity & Conflict Detection
├── policy/            # Policy Engine & Autonomy Guard
├── scorecard/         # Governance Scorecard Engine
├── audit/             # CI Integration & Continuous Audit
└── types/             # Core Type Definitions
```

## Kernmodule

### 1. Workstream Validator

Validiert Workstreams gegen Governance-Regeln:
- Owner gesetzt
- Scope nicht leer
- Structural Model vorhanden
- Risks strukturiert
- Layer korrekt
- Autonomy Policy kompatibel
- DoD vorhanden

**Blockiert Start bei Verstoß.**

### 2. Decision Compiler

Pipeline für Decision-Validierung:
1. Schema Validation
2. Layer Purity Check
3. Policy Rule Check
4. Autonomy Escalation Check
5. Conflict Detection

### 3. Clarification Engine

- **Ambiguity Detector:** Erkennt mehrdeutige Anforderungen
- **Conflict Detector:** Erkennt Konflikte zwischen Autonomy-Regeln

**Erzeugt gezielte Rückfragen statt impliziter Annahmen.**

### 4. Policy Engine

- Parst `autonomy_policy.md`
- Parst `policy_approval_rules.yaml`
- Erstellt deterministische Entscheidungslogik

### 5. Governance Scorecard

Berechnet:
- Layer Purity (0-2)
- Workstream Completeness (0-2)
- Escalation Discipline (0-2)
- Decision Traceability (0-2)
- DoD Enforcement (0-2)
- Clarification Compliance (0-2)

**Total Score:** 0-12, normalisiert zu 0-10

### 6. Audit Runner

- CI Integration für kontinuierliche Governance-Audits
- Weekly Entropy Reports
- Failure Injection Tests

**CI Fail bei Score < 8.0**

## Usage

```typescript
import { WorkstreamValidator } from '@agent-system/governance-v2';
import { DecisionCompiler } from '@agent-system/governance-v2';
import { AuditRunner } from '@agent-system/governance-v2';

// Validate Workstream
const validator = new WorkstreamValidator();
const result = validator.validate(workstream);
if (result.status === 'blocked') {
  console.error('Workstream blocked:', result.reasons);
}

// Compile Decision
const compiler = new DecisionCompiler(policyEngine, autonomyGuard);
const compilation = compiler.compile(decision);
if (compilation.status !== 'pass') {
  console.error('Decision blocked:', compilation.reasons);
}

// Run Audit
const auditRunner = new AuditRunner();
const audit = await auditRunner.runAudit(workstreams, decisions);
console.log('Governance Score:', audit.scorecard.totalScore);
console.log('Entropy Score:', audit.entropyScore);
```

## Integration

### CI/CD

```yaml
# .github/workflows/governance-audit.yml
- name: Governance Audit
  run: |
    pnpm --filter @agent-system/governance-v2 audit
    # Fail if score < 8.0
```

### Agent-Team Workflow

1. **Workstream Creation:** Validator prüft vor Start
2. **Decision Logging:** Compiler validiert vor Persistierung
3. **Weekly Audit:** Audit Runner generiert Report
4. **CI Gate:** CI blockiert bei Score < 8.0

## Status

- ✅ Core Interfaces definiert
- ✅ Workstream Validator implementiert
- ✅ Decision Compiler implementiert
- ✅ Clarification Engine implementiert
- ✅ Policy Engine implementiert
- ✅ Scorecard Engine implementiert
- ✅ Audit Runner implementiert
- ⚠️ YAML Parser (vereinfacht, sollte js-yaml verwenden)
- ⚠️ CI Integration (Phase 4)

## Nächste Schritte

Siehe `ops/agent-team/team_plan.md` für Implementierungs-Phasen.

