# GOLDEN TASK REGISTRY

**Purpose:** Canonical Registry fuer Golden Task Definitionen als SoT fuer Docs, Fixtures und Ops-Validation.  
**Scope:** `docs/golden-tasks/**`, `testdata/golden-tasks/**`, `ops/agent-team/golden_tasks.yaml`.  
**Owner:** @teamlead_orchestrator  
**Layer:** evidence  
**Last Updated:** 2026-02-21T10:09:38Z

---

## Registry

| GT-ID | Name | Scope | Required Fixture | CI Required | Minimum Required |
|---|---|---|---|---|---|
| GT-001 | Website Relaunch Budget Overrun | delivery | yes | yes | 8 |
| GT-002 | CRM Selection | design | yes | yes | 8 |
| GT-003 | Marketing Strategy Switch | discovery | yes | no | 8 |
| GT-004 | GDPR Tracking Risk | review | yes | no | 8 |
| GT-005 | Scope Creep Development | delivery | yes | no | 8 |
| GT-006 | Tool Stack Standardization | design | yes | no | 8 |
| GT-007 | Campaign Fail Budget Loss | review | yes | no | 8 |
| GT-008 | Commit Without Review | delivery | yes | no | 8 |

---

## Notes

- Diese Registry ist die **canonical SoT** fuer GT-IDs und Mindestumfang.
- `Minimum Required` ist bewusst pro Zeile enthalten, damit schema-basierte Parser Konsistenz pruefen koennen.
- Phase-1 Enforcement laeuft warn-only. Phase-2 kann per `ENFORCEMENT_STRICT=1` auf fail-on-error umgestellt werden.
