# Compliance Hardening — Umsetzungsplan

**Version:** 1.0.0  
**Owner:** @teamlead_orchestrator  
**Layer:** strategy  
**Erstellt:** 2026-02-19T00:00:00.000Z  
**Aktualisiert:** 2026-02-19T00:00:00.000Z  
**Definition of Done:**
- [ ] Alle 3 Phasen in team_plan.md integriert
- [ ] Workstreams mit Owners, Deliverables, Risks definiert
- [ ] Abhängigkeitslogik dokumentiert
- [ ] Compliance-Score-Matrix erstellt

---

## Übersicht

Das Compliance Hardening ist in **3 Phasen** strukturiert:

1. **Phase 1** (0-2 Wochen): Kritische Blocker eliminieren
2. **Phase 2** (2-6 Wochen): Compliance-Struktur vervollständigen
3. **Phase 3** (6-12 Wochen): Enterprise Hardening & Zertifizierungsreife

**Ziel:** Zertifizierungsfähigkeit (DSGVO / ISO 27001 / SOC 2 Type II)

---

## Phase 1 — Kritische Blocker (0-2 Wochen)

### R-003: Secrets-Management
- **Owner:** @implementer_codex
- **Support:** @ops_team
- **Deliverable:** Refactored docker-compose, .env.example, CI-Integration
- **Erfolgskriterium:** Kein Secret im Repo, CI fail bei Secret

### R-001: Consent-Management
- **Owner:** @implementer_codex
- **Support:** @reviewer_claude
- **Deliverable:** Consent-Tabelle + Service + API + PolicyHook
- **Erfolgskriterium:** Consent required enforced

### R-002: Data-Deletion
- **Owner:** @implementer_codex
- **Support:** @reviewer_claude
- **Deliverable:** Lösch-Service + Endpoint
- **Erfolgskriterium:** Löschung + Log-Anonymisierung

---

## Phase 2 — Compliance-Struktur (2-6 Wochen)

### R-004: Vollständiges RBAC
- **Owner:** @implementer_codex
- **Support:** @reviewer_claude
- **Deliverable:** user_roles + permission matrix
- **Erfolgskriterium:** Least-Privilege durchgesetzt

### R-005: Mandatory Audit Logging
- **Owner:** @implementer_codex
- **Support:** @observability_eval
- **Deliverable:** Log-Hook Middleware
- **Erfolgskriterium:** Alle kritischen Operationen geloggt

### R-008: Error Sanitization
- **Owner:** @implementer_codex
- **Support:** @observability_eval
- **Deliverable:** Production-safe ErrorFilter
- **Erfolgskriterium:** Keine sensiblen Infos in Fehlermeldungen

---

## Phase 3 — Enterprise Hardening (6-12 Wochen)

### R-006: Prompt Sanitizer
- **Owner:** @implementer_codex
- **Support:** @reviewer_claude
- **Deliverable:** PromptSanitizer Service
- **Erfolgskriterium:** Prompt-Injection blockiert

### R-007: Data Loss Prevention (DLP)
- **Owner:** @implementer_codex
- **Support:** @ops_team
- **Deliverable:** Export Limits + Domain Blocking
- **Erfolgskriterium:** Ungewöhnliche Datenexporte blockiert

### INF-001, INF-002, INF-003: Infrastructure Security
- **Owner:** @ops_team
- **Support:** @reviewer_claude
- **Deliverable:** Network Diagram, TLS, Rate Limiting, Alerting
- **Erfolgskriterium:** Hardened Infrastructure

---

## Abhängigkeitslogik

```
Secrets Fix (R-003)
    ↓
Consent Layer (R-001)
    ↓
Data Deletion (R-002)
    ↓
RBAC (R-004)
    ↓
Audit Completion (R-005)
    ↓
DLP & Sanitization (R-006, R-007)
    ↓
Enterprise Readiness (INF-001, INF-002, INF-003)
```

---

## Compliance-Score-Matrix

| Phase | DSGVO | ISO 27001 | SOC 2 | Gesamt |
|-------|-------|-----------|-------|--------|
| **Jetzt** | 4/10 | 5/10 | 6/10 | 5/10 |
| **Phase 1** | 7.5/10 | 7/10 | 6.5/10 | 7/10 |
| **Phase 2** | 8.5/10 | 8/10 | 7.5/10 | 8/10 |
| **Phase 3** | 9/10 | 9/10 | 8.5/10 | 9/10 |

---

## Rollen-Aufteilung

### Codex (@implementer_codex)
- DB Migrationen
- Service-Implementierung
- PolicyEngine Erweiterung
- API Endpoints

### Claude (@reviewer_claude)
- Architektur-Review
- Rechtsgrundlagenprüfung
- Edge Cases (Soft-Delete vs. Audit)
- Race Conditions
- Policy Enforcement Vollständigkeit

### QA (@observability_eval)
- Teststrategie
- E2E Tests
- Golden-Test Reports

### Ops (@ops_team)
- Secrets-Management
- Infrastructure Security
- TLS / Rate Limiting
- Monitoring & Alerting

---

## Kritische Erfolgsfaktoren

1. ✅ Keine "Compliance als Feature" – sondern als Systemlayer
2. ✅ PolicyEngine ist der zentrale Enforcement-Punkt
3. ✅ Audit Logging darf niemals optional sein
4. ✅ Secrets niemals im Repo
5. ✅ Timezone / Clock-Integrity sauber halten

---

## Nächste Schritte

1. **Sofort:** Phase 1 starten (R-003: Secrets-Management)
2. **Diese Woche:** Phase 1 WS1-4 parallelisieren
3. **Nach Phase 1:** Phase 2 starten (RBAC + Audit)
4. **Nach Phase 2:** Phase 3 starten (Enterprise Hardening)

---

**Status:** ✅ **PLAN INTEGRIERT IN team_plan.md**

Alle Workstreams sind dokumentiert mit:
- Owners
- Deliverables
- Risks
- Definition of Done
- Approval Gates

