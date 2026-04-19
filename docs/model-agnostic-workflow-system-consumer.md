# Model-Agnostic Workflow System Consumer Overlay

Scope: shared-core consumer linkage for this repository.  
Authority: authoritative for shared-core linkage only, not for repository runtime architecture.

This repository consumes the standalone `model-agnostic-workflow-system` shared-core package through the consumer manifest.

## Linked Version

- shared-core version: `0.2.1`
- package fingerprint: `42c40e701633cce0606efce1a7057c4831fe095a66676906bfa8270049d97c96`
- linkage mode: standalone local repository reference

## Adopted Shared-Core Skills

- `repo-intake-sot-mapper` via `.codex/repo-intake-inputs.json`
- `runtime-policy-auditor` via `.codex/runtime-policy-inputs.json`
- planning slice building
- implementation contract extraction
- test matrix building
- post-implementation review writing
- patch strategy selection
- failure mode enumeration
- release narrative building

## Local Consumer Truth

Consumer-local overlays remain:

- `AGENTS.md`
- `.codex/repo-intake-inputs.json`
- `.codex/runtime-policy-inputs.json`
- `docs/repo-specific-canonical-sources.md`
- `ops/agent-team/`
- `policy_approval_rules.yaml`
- `golden_tasks.yaml`
- `scorecard_definition.md`
- `trace_schema.json`

## Operator Rule

Read the consumer manifest before using shared-core assets.
Do not edit the standalone `model-agnostic-workflow-system` source from this repository.
Keep both `.codex/repo-intake-inputs.json` and `.codex/runtime-policy-inputs.json` current when using the matching shared-with-local-inputs skills.

## Validation

Run the consumer validator after changing overlay files or changing the shared-core source reference.
