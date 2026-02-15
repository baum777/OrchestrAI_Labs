# Managed Postgres Setup (Cloud-VM, ohne Docker)

Ziel: Golden Tests (`pnpm -C apps/api test:golden`) in der Cloud-VM lauffähig machen, indem eine externe Managed PostgreSQL-Datenbank verwendet wird.

Scope: **Keine Produktcode-Änderungen**, **keine Migration-Anpassungen**. Nur ENV + DB-Setup.

## Voraussetzungen

- Eine Managed PostgreSQL-Instanz (z.B. Supabase/Neon/Railway/Render/RDS)
- Ein Connection String im Format:

  `postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require`

- In der Cloud-VM muss `psql` verfügbar sein:

```bash
sudo apt-get update
sudo apt-get install -y postgresql-client
psql --version
```

## Secrets / Environment Variablen

### In Cursor (empfohlen)

Lege folgende Secrets im Cursor Dashboard an (Cloud Agents → Secrets), damit sie **als ENV** in die VM injiziert werden:

- `DATABASE_URL`
- `TEST_PROJECT_ID`
- optional: `TEST_PROJECT_ID_2` (wird sonst als `${TEST_PROJECT_ID}_B` abgeleitet)

Hinweis: Der Connection String ist ein Secret und soll **nicht** ins Repo oder in Chat/Logs.

### Ad-hoc in einer Shell-Session

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
export TEST_PROJECT_ID="proj_test"
# optional:
export TEST_PROJECT_ID_2="proj_test_B"
```

## Migrationen anwenden

Im Repo-Root ausführen (Reihenfolge beachten):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infrastructure/db/migrations/001_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infrastructure/db/migrations/002_review_commit_token.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infrastructure/db/migrations/003_decisions_domain.sql
```

Verifikation:

```bash
psql "$DATABASE_URL" -c "\\dt"
```

Erwartung: Tabellen wie `projects`, `decisions`, `review_requests`, `review_actions`, `action_logs` existieren.

## Golden Tests ausführen

```bash
pnpm -C apps/api test:golden
```

Erwartung:

- Seed läuft (mindestens `projects` wird via Test-Seed angelegt)
- `golden-tasks (smoke)` grün
- `governance-bypass (E2E, negative)` grün

## Troubleshooting

- **SSL Fehler**
  - Prüfe, ob `sslmode=require` im `DATABASE_URL` enthalten ist (bei Managed DBs meist notwendig).
- **"relation does not exist"**
  - Migrationen nicht ausgeführt oder falsche DB (Connection String prüfen).
- **Auth Fehler**
  - USER/PASSWORD prüfen
  - DB Host/Port prüfen
  - Netzwerk/Firewall/Allowlist beim Provider prüfen (ausgehende Verbindungen aus der Cloud-VM müssen erlaubt sein)

