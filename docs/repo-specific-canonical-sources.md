# Repo-Specific Canonical Sources

This file records the local sources of truth for `agent-system`.

## Governance and Workflow

- `AGENTS.md`
- `.codex/repo-intake-inputs.json`
- `.codex/runtime-policy-inputs.json`
- `ops/agent-team/README.md`
- `ops/agent-team/team_plan.md`
- `ops/agent-team/team_findings.md`
- `ops/agent-team/team_progress.md`
- `ops/agent-team/team_decisions.md`
- `ops/agent-team/autonomy_policy.md`
- `ops/agent-team/policy_approval_rules.yaml`
- `ops/agent-team/scorecard_definition.md`
- `ops/agent-team/golden_tasks.yaml`

## Product and Architecture

- `README.md`
- `docs/ist-zustand-agent-system.md`
- `docs/onepager-agentensystem-architektur.md`
- `docs/produktlogik-spezifikation.md`
- `docs/governance.md`
- `docs/decisions.md`
- `docs/project-phases.md`
- `docs/drift_playbook.md`

## Runtime Policy Inputs

- `ops/agent-team/autonomy_policy.md`
- `ops/agent-team/policy_approval_rules.yaml`
- `ops/agent-team/scorecard_definition.md`
- `ops/agent-team/runtime_state.json`
- `ops/agent-team/agent_team_spec.v1.yaml`
- `ops/agent-team/retention_policy.yaml`
- `docs/provider-resilience.md`
- `docs/governance-clock-hardening.md`

## Shared-Core Boundary

Shared-core assets are consumed only through `.codex/shared-core-consumer.json`.
The current consumer overlay is `docs/model-agnostic-workflow-system-consumer.md`.
The standalone `model-agnostic-workflow-system` repository is a workflow dependency, not agent-system runtime authority.

## Rule

If a shared-core document conflicts with these local sources, the local source wins for this repository.
