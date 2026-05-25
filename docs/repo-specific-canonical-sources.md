# Repo-Specific Canonical Sources

This file records the local sources of truth for `agent-system`.

## Source-of-Truth Rule

Local repo policy wins over shared-core guidance when the two conflict. If two local canonical sources conflict, create or update a decision record in `ops/agent-team/team_decisions.md` before changing behavior.

## Model-Agnostic First Rule

Provider and agent behavior must be described by capability/profile contracts first. Concrete vendor or model names may appear as adapter metadata, examples, or historical evidence, but they are not canonical for runtime routing, role assignment, or governance.

Canonical file for provider/model routing: `docs/provider-resilience.md`.
Canonical runtime contracts: `packages/agent-runtime/src/providers/provider-config.schema.ts` and `packages/agent-runtime/src/providers/provider-router.ts`.

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
- `docs/provider-resilience.md`

## Runtime Policy Inputs

- `ops/agent-team/autonomy_policy.md`
- `ops/agent-team/policy_approval_rules.yaml`
- `ops/agent-team/scorecard_definition.md`
- `ops/agent-team/runtime_state.json`
- `ops/agent-team/agent_team_spec.v1.yaml`
- `ops/agent-team/retention_policy.yaml`
- `docs/provider-resilience.md`
- `docs/governance-clock-hardening.md`

## Derived / Evidence Docs

Derived docs may summarize canonical sources, but they must link back to the canonical file instead of redefining the same rule. Evidence docs may quote concrete models/providers only as observed runtime evidence, not as normative routing policy.

## Conflict Handling

If a shared-core document conflicts with these local sources, the local source wins for this repository. If a docs-only change alters SoT hierarchy, the PR must include the affected canonical files and the verification plan.
