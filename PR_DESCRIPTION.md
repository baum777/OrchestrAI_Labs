# PR DESCRIPTION TEMPLATE

**Zweck:** Standardisierte, blueprint-konforme PR-Beschreibung fuer dieses Repo.  
**Scope:** Alle Aenderungen in Code, Doku, Ops und Governance-Artefakten.  
**Owner:** @teamlead_orchestrator  
**Last Updated:** 2026-02-21T08:51:07Z  
**Layer:** operations

---

## 1) Change Summary

- [ ] Was wurde geaendert? (kurze Bullet-Liste)
- [ ] Welche Module/Pfade sind betroffen?
- [ ] Warum war die Aenderung notwendig?

## 2) Risk Assessment

**Risk Level:** [Low | Medium | High]

- [ ] Hauptrisiko 1 + Begruendung
- [ ] Hauptrisiko 2 + Begruendung
- [ ] Mitigation je Risiko

## 3) Rollback Strategy

- [ ] Konkrete Dateien/Commits fuer Revert
- [ ] Was bleibt bei Rollback unveraendert?
- [ ] Gibt es Migrations-/Datenfolgen?

## 4) Verification

### 4.1 Checks
- [ ] Lint/Typecheck/Test Befehle
- [ ] Ergebnis je Check (pass/fail + ggf. Hinweis)

### 4.2 Golden Tasks
- [ ] Relevante Golden Tasks benannt
- [ ] Ausgefuehrt oder bewusst nicht ausgefuehrt (mit Begruendung, z. B. Tier-2 docs-only)
- [ ] Evidence-Referenzen (Datei/Log)

## 5) Files Touched

- [ ] Vollstaendige Pfadliste der geaenderten Dateien

## 6) Approval Gates (policy_approval_rules.yaml)

- [ ] Trigger geprueft: `large_change`
- [ ] Trigger geprueft: `destructive_ops`
- [ ] Trigger geprueft: `ci_or_build`
- [ ] Trigger geprueft: `prompt_or_agent_core`
- [ ] Trigger geprueft: `prod_config`
- [ ] Erforderliche Approvals dokumentiert

## 7) Open Questions / Escalations

- [ ] Offene Punkte (falls vorhanden)
- [ ] Scope-/Policy-Eskalationen (falls vorhanden)

## 8) Ops Evidence (Mandatory)

- [ ] `ops/agent-team/team_plan.md` aktualisiert
- [ ] `ops/agent-team/team_findings.md` aktualisiert
- [ ] `ops/agent-team/team_progress.md` aktualisiert
- [ ] `ops/agent-team/team_decisions.md` aktualisiert
