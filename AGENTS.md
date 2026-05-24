# AGENTS.md — Repo Agent Guidelines

## Default Roles
- Team Lead / Orchestrator: **reasoning.lead** capability profile (delegate-first)
- Implementer: **implementation.code** capability profile
- Reviewer: **review.validation** capability profile (review-only)
- QA/E2E: **qa.e2e** capability profile with Playwright + Golden Tasks

## Model-Agnostic First
- Agent roles are defined by capability profile first.
- Concrete vendor or model names may be used as adapter metadata or historical evidence.
- Concrete vendor or model names are not the source of truth for routing, assignment, or governance.
- Provider routing rules live in `docs/provider-resilience.md`.
- Repo source-of-truth rules live in `docs/repo-specific-canonical-sources.md` and `docs/DOCS_BLUEPRINT_SPEC.md`.

## Golden Rule
**Repo-Artefakte sind die Wahrheit**, nicht Chat-Kontext.

## Mandatory Repo Artifacts
All work must keep these files current:
- `ops/agent-team/team_plan.md`
- `ops/agent-team/team_findings.md`
- `ops/agent-team/team_progress.md`
- `ops/agent-team/team_decisions.md`

## Safety / Guardrails
- Protect credentials and local-only configuration files.
- Ask for confirmation before destructive actions (delete, force push, reset, rebase).
- If `policy_approval_rules.yaml` triggers: do not merge without required approvals.

## Workflow
1) Read `ops/agent-team/README.md` + `team_plan.md`
2) Only implement bounded tasks from `team_plan.md`
3) Log findings + progress immediately
4) Run Golden Tasks relevant to your change
5) Request review + scorecard gate when applicable

## Shared-Core Consumer
- If `.codex/shared-core-consumer.json` exists, read `docs/codex-workflow-consumer.md` and `docs/repo-specific-canonical-sources.md` first.
- Keep repo-specific governance in `ops/agent-team/` and the local canonical docs.
- If shared-core guidance conflicts with local canonical docs, local canonical docs win.
