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
