# Team Decisions

## Format
- date:
  decision:
  rationale:
  alternatives:
  implications:
  owner:

## Decisions

- date: 2026-02-15
  decision: Managed Postgres Credentials via Cursor Secrets (DATABASE_URL) in Cloud-VM injizieren
  rationale: Connection-Strings sind Secrets und sollen weder im Repo noch im Chat/Logs auftauchen; die Golden Tests lesen ausschließlich ENV (`DATABASE_URL`, `TEST_PROJECT_ID`) und benötigen eine echte Postgres-Instanz
  alternatives:
    - `.env` Datei im Repo (verworfen: Secret-Leak-Risiko)
    - Local Postgres/Docker (verworfen: Task verlangt Managed DB ohne Docker)
    - CI-only Setup (verworfen: Ziel ist Cloud-VM Golden Tests lokal lauffähig)
  implications:
    - Nutzer setzt `DATABASE_URL` (inkl. `sslmode=require` falls nötig) als Secret in Cursor Dashboard
    - Agent kann danach Migrationen per `psql` anwenden und `pnpm -C apps/api test:golden` verifizieren, ohne Secrets auszugeben
  owner: GPT-5.2 (Cloud Agent)

- date: 2026-02-14
  decision: Geschäftspartner-Onboarding als Business-Dokument in `docs/` pflegen
  rationale: `docs/` ist im Repo die zentrale Dokumentationsablage; es existiert noch keine Partner-/Vertriebsunterlage, daher neues, eigenständiges Onboarding-Paper ohne Tech-Stack
  alternatives:
    - Ablage unter `ops/` (verworfen, da `ops/` agent-/prozessbezogen ist)
    - Ablage im Root `README.md` (verworfen, da zu lang und zielgruppenspezifisch)
  implications:
    - Neues Dokument `docs/geschaeftspartner-onboarding-konzept.md`
    - Inhalt fokussiert auf Businessmodell, Produktnutzen und Verkaufskonzept (keine Implementierungsdetails)
  owner: GPT-5.2 (Cloud Agent)

- date: 2026-02-14
  decision: Pitch- und Architektur-Onepager als eigenständige Docs in `docs/` anlegen
  rationale: Onepager sind konsumierbare Einstiegsartefakte (für Stakeholder/Onboarding) und sollen die Detail-Doku nicht duplizieren, sondern kondensieren und verlinken
  alternatives:
    - In `README.md` integrieren (verworfen, da Root-README bereits kompakt ist und sonst überfrachtet)
    - Als Anhang in `docs/ist-zustand-agent-system.md` (verworfen, da Onepager bewusst separat „printbar“/teilbar sein sollen)
  implications:
    - Neue Dateien `docs/onepager-agentensystem-pitch.md` und `docs/onepager-agentensystem-architektur.md`
    - Beide verlinken auf `docs/ist-zustand-agent-system.md` als Single Source of Truth für Details
  owner: GPT-5.2 (Cloud Agent)
