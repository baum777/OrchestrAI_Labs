# Golden Task Automated Tests

## Voraussetzungen

- Node.js >= 20
- `DATABASE_URL`: PostgreSQL Connection String (z.B. `postgresql://user:pass@localhost:5432/dbname`)
- `TEST_PROJECT_ID` (optional): Bestehende Project-ID in der DB (Fallback: `proj_test`)

## Befehle

```bash
# Alle Golden Task Tests ausführen
pnpm -C apps/api test:golden

# Alle Tests ausführen
pnpm -C apps/api test
```

## Test-Ablauf

Die Tests:
1. Laden Fixtures aus `testdata/golden-tasks/GT-XXX/`
2. Senden `createDraft` Requests an `/projects/:projectId/decisions/draft`
3. Prüfen Response Shape (status, required fields, arrays non-empty)
4. Optional: Monitoring Smoke Check (GET `/monitoring/drift`)

**Hinweis:** Tests schlagen fehl, wenn `DATABASE_URL` nicht gesetzt ist (by design).
