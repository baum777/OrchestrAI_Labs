# BLOCK 1 · IST-Snapshot + Kontext-Summary

**Erstellt:** 2025-01-27T12:00:00Z  
**Zweck:** Vorbereitung für BLOCK 1 · Schritt 1 – Shared Decision Types  
**Modus:** Read-Only (keine Code-Änderungen)

---

## A) IST Snapshot

### Repo-Schnitt (relevante Ordner/Dateien)

| Pfad | Zweck |
|------|-------|
| `packages/shared/src/types/decision.ts` | **Shared Decision Types** – bereits vorhanden mit `DecisionStatus`, `DecisionBase`, `DecisionDraft`, `DecisionFinal` |
| `packages/shared/src/index.ts` | Barrel-File – exportiert `decision.ts` (nicht `review.ts`) |
| `packages/shared/src/types/review.ts` | Review-Types (CommitToken) – existiert, nicht in Barrel-File |
| `infrastructure/db/migrations/001_init.sql` | Basis-Schema: `decisions`-Tabelle (status: draft/final) |
| `infrastructure/db/migrations/003_decisions_domain.sql` | Erweiterte Felder: `assumptions`, `derivation`, `risks`, `client_context`, `comms_context`, `client_implications`, `goal`, `success_criteria`, `next_steps`, `review_id`, `draft_id` |
| `infrastructure/db/migrations/002_review_commit_token.sql` | Commit-Token-Support in `review_requests` |
| `apps/api/src/modules/decisions/decisions.service.ts` | Service-Layer: `createDraft()`, `finalizeFromDraft()` (prüft `review_id` required) |
| `apps/api/src/modules/decisions/decisions.controller.ts` | REST-API: POST `/projects/:projectId/decisions/draft`, GET `/decisions/:id`, GET `/projects/:projectId/decisions` |
| `apps/api/src/modules/agents/agents.runtime.ts` | Tool-Handler: `tool.decisions.createDraft`, `tool.decisions.finalizeFromDraft` |
| `packages/agent-runtime/src/orchestrator/orchestrator.ts` | Orchestrator: fügt `reviewId` automatisch zu `finalizeFromDraft` im Commit-Run hinzu |
| `docs/decisions.md` | Dokumentation: Feldstruktur nach Sections (META, INTERNAL, CLIENT, OUTCOME, GOVERNANCE) |

### Bereits vorhanden: Decisions/Reviews/Logs

#### Datenbank
- ✅ `decisions`-Tabelle mit `status` CHECK (`'draft'`, `'final'`)
- ✅ `review_requests`-Tabelle mit Commit-Token-Support
- ✅ `review_actions`-Tabelle (History)
- ✅ `action_logs`-Tabelle (Append-only Audit Trail)
- ✅ Migrationen: `001_init.sql`, `002_review_commit_token.sql`, `003_decisions_domain.sql`

#### Code
- ✅ **Shared Types:** `packages/shared/src/types/decision.ts` mit:
  - `DecisionStatus = "draft" | "final"`
  - `DecisionBase` (alle Felder inkl. Sections)
  - `DecisionDraft` (status: "draft", reviewId optional)
  - `DecisionFinal` (status: "final", **reviewId required**)
- ✅ **Service-Layer:** `DecisionsService.finalizeFromDraft()` prüft:
  - Review existiert und ist `approved`
  - `review_id` wird im UPDATE gesetzt
  - Runtime-Check: `decision.status !== "final" || !decision.reviewId` → Error
- ✅ **Tool-Implementierung:** `tool.decisions.createDraft`, `tool.decisions.finalizeFromDraft`
- ✅ **Orchestrator:** Fügt `reviewId` automatisch zu `finalizeFromDraft` im Commit-Run hinzu

### Fehlt / unklar (konkrete Lücken für BLOCK 1)

#### ❌ **Kritisch für BLOCK 1 · Schritt 1:**
1. **Strukturierung nach Sections fehlt in Types:**
   - `DecisionBase` enthält alle Felder flach
   - Keine explizite Gruppierung nach META / INTERNAL / CLIENT / OUTCOME / GOVERNANCE
   - **Impact:** Types sind funktional korrekt, aber nicht nach dokumentierter Struktur organisiert

2. **Barrel-File unvollständig:**
   - `packages/shared/src/index.ts` exportiert `decision.ts`, aber nicht `review.ts`
   - Kein `packages/shared/src/types/index.ts` vorhanden

3. **DB-Schema vs. Type-Mapping:**
   - DB: `snake_case` (z. B. `project_id`, `review_id`, `client_context`)
   - Types: `camelCase` (z. B. `projectId`, `reviewId`, `clientContext`)
   - Mapping erfolgt in `DecisionsService.mapRow()` – **korrekt, aber dokumentieren**

#### ⚠️ **Nicht blockierend, aber zu beachten:**
- Keine JSON-Schema/DTO-Validierung (z. B. zod, class-validator) – aktuell manuelle Validierung in Tool-Handlern
- `docs/decisions.md` beschreibt Sections, aber Types bilden diese nicht explizit ab

---

## B) Konkrete Inputs für BLOCK 1 · Schritt 1

### Datei-Ziel
**`packages/shared/src/types/decision.ts`**

### Benötigte Exporte (IST vs. Soll)

| Export | IST | Soll (BLOCK 1) |
|--------|-----|----------------|
| `DecisionStatus` | ✅ `"draft" \| "final"` | ✅ Unverändert |
| `DecisionBase` | ✅ Alle Felder flach | ⚠️ **Optional:** Sections als Kommentare/Struktur |
| `DecisionDraft` | ✅ `status: "draft"`, `reviewId?: string` | ✅ Unverändert |
| `DecisionFinal` | ✅ `status: "final"`, `reviewId: string` (required) | ✅ Unverändert |

### Struktur/Sections (muss abbildbar sein)

**Aktuell in `DecisionBase` (flach):**
```typescript
// META
id, projectId, clientId?, title, owner, ownerRole?, status, createdAt, updatedAt

// INTERNAL
assumptions[], derivation?, alternatives[], risks[]

// CLIENT
clientContext?, commsContext?, clientImplications?

// OUTCOME
goal?, successCriteria[], nextSteps[], reviewAt?

// GOVERNANCE
reviewId?, draftId?
```

**Optionen für BLOCK 1:**
1. **Minimal:** Kommentare in `DecisionBase` hinzufügen (Sections als Kommentar-Blöcke)
2. **Erweitert:** Nested Types (`DecisionMeta`, `DecisionInternal`, etc.) – **nur wenn explizit gewünscht**
3. **Status Quo:** Belassen, da funktional korrekt

**Empfehlung:** Option 1 (Kommentare) – dokumentiert Sections ohne Breaking Changes.

---

## C) Risiken / Constraints

### Invarianten (darf nicht verletzt werden)

1. **`DecisionFinal.reviewId` ist required:**
   - ✅ Type-Level: `reviewId: string` (nicht optional)
   - ✅ Runtime: `DecisionsService.finalizeFromDraft()` prüft `review_id` im UPDATE
   - ✅ Runtime: `if (decision.status !== "final" || !decision.reviewId) throw Error`
   - **Constraint:** Diese Invariante muss erhalten bleiben

2. **Finalisierung nur via Commit-Run:**
   - ✅ Kein REST-Endpunkt für Finalisierung
   - ✅ Nur `tool.decisions.finalizeFromDraft` im Commit-Run (mit Commit-Token)
   - ✅ Orchestrator fügt `reviewId` automatisch hinzu
   - **Constraint:** Keine direkte Finalisierung ohne Review/Commit-Token

3. **DB-Schema:**
   - ✅ `status` CHECK (`'draft'`, `'final'`)
   - ✅ `review_id` NULL erlaubt (für Drafts)
   - **Constraint:** Keine DB-Migration ohne explizite Anweisung

### Approval Rules (policy_approval_rules.yaml)

- ✅ **Keine Approval nötig** für Type-Änderungen in `packages/shared` (nicht in `prompt_or_agent_core`-Pfaden)
- ⚠️ **Vorsicht:** Wenn `ops/agent-team/**` berührt wird → Approval erforderlich

### High-Risk Paths

1. **Breaking Changes in Shared Types:**
   - `DecisionBase`, `DecisionDraft`, `DecisionFinal` werden von `DecisionsService` und Tool-Handlern verwendet
   - **Constraint:** Keine Breaking Changes ohne Migration-Plan

2. **Alt-Typecheck-Fehler:**
   - ⚠️ **Explizit ausgeschlossen:** `packages/workflow` / `packages/knowledge` haben Typecheck-Fehler → **dürfen nicht bearbeitet werden**

---

## D) Next-Step Checkliste (für Implementer)

### BLOCK 1 · Schritt 1 – Shared Decision Types

- [ ] **1. Datei öffnen:** `packages/shared/src/types/decision.ts`
- [ ] **2. Prüfen:** Alle Exporte vorhanden (`DecisionStatus`, `DecisionBase`, `DecisionDraft`, `DecisionFinal`)
- [ ] **3. Sections dokumentieren:** Kommentar-Blöcke in `DecisionBase` hinzufügen (META, INTERNAL, CLIENT, OUTCOME, GOVERNANCE)
- [ ] **4. Type-Check:** `DecisionFinal.reviewId` ist `string` (nicht optional) ✅
- [ ] **5. Barrel-File prüfen:** `packages/shared/src/index.ts` exportiert `decision.ts` ✅
- [ ] **6. Optional:** `packages/shared/src/types/index.ts` erstellen (falls gewünscht)
- [ ] **7. Test:** TypeScript-Kompilierung (`tsc --noEmit` in `packages/shared`)
- [ ] **8. Dokumentation:** `docs/decisions.md` prüfen – Sections stimmen mit Types überein
- [ ] **9. Keine Breaking Changes:** `DecisionsService.mapRow()` und Tool-Handler müssen weiterhin funktionieren
- [ ] **10. Log:** Progress in `ops/agent-team/team_progress.md` eintragen

### Nicht in Scope (BLOCK 1 · Schritt 1)

- ❌ DB-Migrationen ändern
- ❌ Service-Layer ändern
- ❌ Tool-Handler ändern
- ❌ Nested Types einführen (nur wenn explizit gewünscht)
- ❌ JSON-Schema-Validierung hinzufügen
- ❌ `packages/workflow` / `packages/knowledge` bearbeiten

---

## Zusammenfassung

**Status:** ✅ **BLOCK 1 · Schritt 1 ist vorbereitet**

- Shared Decision Types existieren und sind funktional korrekt
- `DecisionFinal.reviewId` ist required (Type + Runtime)
- Sections sind in `docs/decisions.md` dokumentiert, aber nicht explizit in Types strukturiert
- **Nächster Schritt:** Sections als Kommentare in `DecisionBase` dokumentieren (optional, aber empfohlen)

**Blockierend:** ❌ Nichts – Types sind einsatzbereit.

**Empfehlung:** Minimal-Änderung (Kommentare) für bessere Dokumentation, keine strukturellen Änderungen nötig.

