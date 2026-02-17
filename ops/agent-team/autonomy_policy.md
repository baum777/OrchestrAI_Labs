# Autonomy Policy

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** governance  
**Last Updated:** 2026-02-13  
**Definition of Done:**
- [ ] Ladder vollständig definiert (4 Tiers)
- [ ] Hard Rules dokumentiert
- [ ] Defaults definiert
- [ ] Keine Layer-Vermischung (nur governance)

---

## Ladder
1. read-only
2. draft-only
3. execute-with-approval
4. autonomous-with-limits

---

## Hard Rules
- No secrets / .env access (deny by default).
- Confirm before destructive operations.
- Follow policy approval rules for merges.
