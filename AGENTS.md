# AGENTS.md — Repo Agent Guidelines

## Default Roles
- Team Lead / Orchestrator: **GPT-5.2 Thinking** (delegate-first)
- Implementer: Codex
- Reviewer: Claude (Review-only)
- QA/E2E: Playwright + Golden Tasks

## Golden Rule
**Repo-Artefakte sind die Wahrheit**, nicht Chat-Kontext.

## Mandatory Repo Artifacts
All work must keep these files current:
- `ops/agent-team/team_plan.md`
- `ops/agent-team/team_findings.md`
- `ops/agent-team/team_progress.md`
- `ops/agent-team/team_decisions.md`

## Safety / Guardrails
- Never read/write secrets or `.env` contents.
- Ask for confirmation before destructive actions (delete, force push, reset, rebase).
- If `policy_approval_rules.yaml` triggers: do not merge without required approvals.

## Workflow
1) Read `ops/agent-team/README.md` + `team_plan.md`
2) Only implement bounded tasks from `team_plan.md`
3) Log findings + progress immediately
4) Run Golden Tasks relevant to your change
5) Request review + scorecard gate when applicable

## Codex Shared-Core Consumer
- If `.codex/shared-core-consumer.json` exists, read `docs/codex-workflow-consumer.md` and `docs/repo-specific-canonical-sources.md` first.
- If `.codex/repo-intake-inputs.json` exists, keep it aligned with the repo-intake skill before mapping the repo.
- If `.codex/runtime-policy-inputs.json` exists, keep it aligned with `runtime-policy-auditor` before auditing runtime policy.
  - Use shared-core assets only through the local consumer overlay.
  - The authoritative shared-core source is `C:/workspace/main_projects/codex-workflow-core/`.
  - Do not edit the standalone shared-core source from this repository.
  - Keep repo-specific governance in `ops/agent-team/` and the local canonical docs.
