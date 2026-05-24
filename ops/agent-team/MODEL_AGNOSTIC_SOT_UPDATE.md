# Model-Agnostic SoT Update

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** governance  
**Last Updated:** 2026-05-24T22:35:00Z  
**Definition of Done:**
- [x] `AGENTS.md` uses capability-profile language instead of fixed model names
- [x] `docs/repo-specific-canonical-sources.md` records model-agnostic SoT rules
- [x] `docs/DOCS_BLUEPRINT_SPEC.md` records model-agnostic first rule and trigger mapping
- [x] Provider routing canonical source remains `docs/provider-resilience.md`

---

## Summary

This follow-up documents the repo-level source-of-truth update after the provider router was changed to model-agnostic-first routing.

## Files Updated

- `AGENTS.md`
- `docs/repo-specific-canonical-sources.md`
- `docs/DOCS_BLUEPRINT_SPEC.md`

## Decision

Agent roles and provider behavior are now described by capability/profile contracts first. Concrete vendor or model names may still appear as adapter metadata, examples, or historical evidence, but they are not canonical for runtime routing, assignment, or governance.

## Rationale

The runtime now supports `ModelAgnosticProfile` and `ProviderRouteRequest`. Repo docs and agent guidelines must align with that implementation to avoid future drift back to model-name-first routing.

## Verification Plan

Recommended checks:

```bash
pnpm blueprint:check
pnpm pr:check
pnpm -C packages/agent-runtime test -- provider-router.spec.ts
```

Golden Task Impact: none expected. This is a docs/governance follow-up to an already merged provider-router change.

## Rollback

Revert this file plus the same-branch edits to:

- `AGENTS.md`
- `docs/repo-specific-canonical-sources.md`
- `docs/DOCS_BLUEPRINT_SPEC.md`
