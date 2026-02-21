# PR DESCRIPTION TEMPLATE

**Purpose:** Standardisierte, blueprint-konforme PR-Beschreibung fuer dieses Repo.  
**Scope:** Alle Aenderungen in Code, Doku, Ops und Governance-Artefakten.  
**Owner:** @teamlead_orchestrator  
**Last Updated:** 2026-02-21T10:09:38Z  
**Layer:** operations

---

## Change Summary

- [ ] Was wurde geaendert? (kurze Bullet-Liste)
- [ ] Welche Module/Pfade sind betroffen?
- [ ] Warum war die Aenderung notwendig?

## Risk Assessment

**Risk Level:** [Low | Medium | High]

- [ ] Hauptrisiko 1 + Begruendung
- [ ] Hauptrisiko 2 + Begruendung
- [ ] Mitigation je Risiko

## Rollback Strategy

- [ ] Konkrete Dateien/Commits fuer Revert
- [ ] Was bleibt bei Rollback unveraendert?
- [ ] Gibt es Migrations-/Datenfolgen?

## Verification Plan

### Checks
- [ ] Lint/Typecheck/Test Befehle
- [ ] Ergebnis je Check (pass/fail + ggf. Hinweis)

## Golden Task Impact
- [ ] Ich habe den Golden-Task-Impact bewertet (none | docs-only | fixtures | ci-contract)
- [ ] Relevante Golden Tasks und Registry-Eintraege wurden geprueft
- [ ] Bei Blueprint-SoT-Aenderung wurde Impact explizit dokumentiert

## Verification (Golden Tasks)
- [ ] Relevante Golden Tasks benannt
- [ ] Ausgefuehrt oder bewusst nicht ausgefuehrt (mit Begruendung, z. B. Tier-2 docs-only)
- [ ] Evidence-Referenzen (Datei/Log)

## Files Touched

- [ ] Vollstaendige Pfadliste der geaenderten Dateien

## Approval Gates (policy_approval_rules.yaml)

- [ ] Trigger geprueft: `large_change`
- [ ] Trigger geprueft: `destructive_ops`
- [ ] Trigger geprueft: `ci_or_build`
- [ ] Trigger geprueft: `prompt_or_agent_core`
- [ ] Trigger geprueft: `prod_config`
- [ ] Erforderliche Approvals dokumentiert

## Open Questions / Escalations

- [ ] Offene Punkte (falls vorhanden)
- [ ] Scope-/Policy-Eskalationen (falls vorhanden)

## Ops Evidence Updated

- [ ] `ops/agent-team/team_plan.md` aktualisiert
- [ ] `ops/agent-team/team_findings.md` aktualisiert
- [ ] `ops/agent-team/team_progress.md` aktualisiert
- [ ] `ops/agent-team/team_decisions.md` aktualisiert
