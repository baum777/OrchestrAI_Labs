# Team Findings (Log)

## Format
- YYYY-MM-DDTHH:MM:SSZ — [Owner] Finding — Impact — Suggested action

## Entries

- 2026-02-12T18:43:39Z — [Auto] Shared Decision Types bereits vorhanden — `packages/shared/src/types/decision.ts` enthält `DecisionStatus`, `DecisionBase`, `DecisionDraft`, `DecisionFinal` mit korrekter Struktur — Types sind funktional korrekt, Sections fehlen als explizite Kommentare
- 2026-02-12T18:43:39Z — [Auto] DecisionFinal.reviewId ist required — Type-Level (`reviewId: string`) und Runtime-Checks in `DecisionsService.finalizeFromDraft()` erzwingen reviewId für Final-Status — Invariante muss erhalten bleiben
- 2026-02-12T18:43:39Z — [Auto] DB-Schema vs. Type-Mapping — DB verwendet snake_case, Types camelCase — Mapping in `DecisionsService.mapRow()` korrekt, dokumentieren
- 2026-02-12T18:43:39Z — [Auto] Barrel-File unvollständig — `packages/shared/src/index.ts` exportiert `decision.ts`, aber nicht `review.ts` — Optional: `review.ts` hinzufügen oder `types/index.ts` erstellen
- 2026-02-12T18:43:39Z — [Auto] Sections nicht explizit in Types strukturiert — `DecisionBase` enthält alle Felder flach, Sections nur in `docs/decisions.md` dokumentiert — Optional: Kommentar-Blöcke in `DecisionBase` hinzufügen
- 2026-02-12T19:27:59Z — [Auto] BLOCK 1 · Schritt 1 abgeschlossen — Section Types eingeführt, DecisionBase als Komposition, GATO Charter dokumentiert — Types sind non-breaking, Typecheck grün, Invarianten erhalten (DecisionFinal.reviewId required)

