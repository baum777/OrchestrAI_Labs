# Skills Package

Skill Architecture layer for the agent orchestration system.

## Overview

Skills are reusable, versioned capabilities that compile to deterministic tool call sequences. They integrate with existing governance gates (Orchestrator, ToolRouter, PolicyEngine, ReviewStore) and provide metadata-first discovery with lazy loading.

## Architecture

See [Skill Architecture Blueprint](../../docs/skill-architecture-blueprint.md) for complete design.

## Quick Start

### Creating a Skill

1. Copy `src/templates/manifest.template.json` to `skills/your.skill.id/manifest.json`
2. Copy `src/templates/instructions.template.md` to `skills/your.skill.id/instructions.md`
3. Customize manifest and instructions
4. Skill will be discovered at startup

### Example Skills

- `governance.workstream_validate` - Validates workstreams against governance v2 rules
- `governance.doc_header_validate` - Validates document headers and timestamp integrity
- `runtime.time_gap_audit` - Audits runtime state for time gaps
- `customer_data.read_safe` - Safe customer data read with policy enforcement
- `knowledge.search_project` - Project knowledge search

## Structure

```
packages/skills/
  src/
    spec/              # TypeScript interfaces, JSON Schema
    registry/           # Manifest loading, discovery
    loader/             # Lazy loading (instructions, resources)
    executor/           # Skill compilation and execution
    telemetry/          # Telemetry collection
    templates/           # Templates for skill authoring
  skills/               # Skill implementations
    <skill-id>/
      manifest.json     # Skill manifest
      instructions.md   # Skill instructions
      resources/        # Optional resources
```

## Integration

Skills integrate with:
- **Orchestrator** - Skill execution path (after gap detection, before governance v2 validation)
- **ToolRouter** - Skills execute via ToolRouter (no bypass)
- **PolicyEngine** - Customer data skills use existing policy enforcement

## Guardrails v1

Skills are protected by a guardrail layer that enforces:

### Manifest Validation
- **Schema-strict validation** at discovery time (`assertSkillManifest()`)
- **Policy constraints:** Side effects require review, customer data access constraints, required tools must match plan
- **Lifecycle management:** Status field (`experimental|stable|deprecated|disabled`) with production restrictions

### Runtime Enforcement
- **Feature flag:** `SKILLS_ENABLED=true` required
- **Allowlist:** Skills must be in `profile.allowedSkills` (if defined)
- **Permissions:** All `requiredPermissions` must be in profile
- **Tools:** All `requiredTools` must be in profile
- **Side effects:** Write operations trigger review gate
- **Customer data:** Skills with `customerDataAccess.enabled=true` may only use `customer_data.*` tools
- **Status checks:** Block disabled, warn deprecated, block experimental in production

### Observability
- All skill executions log enriched metadata: `skillId`, `skillVersion`, `skillRunId`, `skillStatus`, `skillDurationMs`, `skillBlockReason`
- Metadata stored in `action_logs.output_json` for queryability

See [Skill Architecture Blueprint](../../docs/skill-architecture-blueprint.md#guardrails-v1) for complete guardrail specification.
- **ReviewStore** - Skills use existing review/commit token flow
- **ActionLogger** - Skills log via existing action logging

## Development

### Feature Flag

Skills are controlled by `ENABLE_SKILLS` environment variable (default: `false`).

### Testing

- Unit tests: `__tests__/unit/`
- Integration tests: `__tests__/integration/`
- E2E tests: `__tests__/e2e/`

## Documentation

- [Skill Architecture Blueprint](../../docs/skill-architecture-blueprint.md) - Complete design document
- [IST-ZUSTAND Audit](../../docs/ist-zustand-architecture-audit.md) - Current system state

