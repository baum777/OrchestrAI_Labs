# Team Decisions

## Format
- date:
  decision:
  rationale:
  alternatives:
  implications:
  owner:

## Decisions

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
