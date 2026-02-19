# SECTION C — Das System erklärt wie für einen intelligenten 15-Jährigen

**Ziel:** Technische Konzepte in einfache Sprache und Metaphern übersetzen – ohne Substanz zu verlieren.

---

## 1. Das Gehirn: Der Orchestrator

**Metapher:** Stell dir einen **Dirigenten** vor, der ein Orchester leitet. Er gibt nicht selbst die Töne von sich – er sagt: „Du spielst jetzt. Du wartest. Du prüfst zuerst.“

So funktioniert der **Orchestrator**: Er koordiniert die Agenten (die „Musiker“). Er entscheidet, wer was wann machen darf. Er prüft Berechtigungen und Regeln – bevor irgendetwas passiert.

**Kurz:** Der Orchestrator ist das **Kommandozentrum**. Ohne ihn läuft nichts.

---

## 2. Das Nervensystem: Die Agenten

**Metapher:** Die Agenten sind wie **spezialisierte Assistenten**. Nicht einer macht alles – jeder hat eine klare Aufgabe:

- **Knowledge Agent:** „Ich suche in allem, was wir schon entschieden haben.“
- **Project Agent:** „Ich kenne die Projekte, Phasen und Checklisten.“
- **Documentation Agent:** „Ich erstelle und strukturiere Dokumente.“
- **Junior Agent:** „Ich helfe bei einfachen Sachen – aber nur mit Abnahme vom Senior.“
- **Governance Agent:** „Ich prüfe, ob Regeln eingehalten werden. Wenn nicht – Stopp.“

**Kurz:** Jeder Agent hat eine **Rolle**. Sie arbeiten zusammen wie ein Team – mit klaren Verantwortlichkeiten.

---

## 3. Der Manager + Regeln: Governance

**Metapher:** Stell dir vor, du willst ein großes Loch graben. Ohne Regeln könnte jeder einfach graben – auch da, wo Kabel liegen. **Governance** ist wie ein Bauleiter, der sagt: „Bevor du gräbst, zeig mir den Plan. Und bevor du fertig bist, muss jemand prüfen, ob es stimmt.“

Im System bedeutet das:
- **Review-Gate:** Bestimmte Aktionen (z.B. eine Entscheidung „final“ machen) brauchen eine **Freigabe** von einem Menschen.
- **Commit-Token:** Wie eine **Eintrittskarte** – nur wer sie hat, darf finalisieren.
- **Policy-Engine:** Prüft vor jeder Aktion: Darf das überhaupt? Sind die Daten sauber? Muss etwas geschwärzt werden (PII)?

**Kurz:** Governance ist der **Sicherheitsgurt**. Er verhindert, dass jemand Abkürzungen nimmt oder Regeln umgeht.

---

## 4. Das Entscheidungsprotokoll: Draft → Review → Commit → Final

**Metapher:** Wie ein **4-Stufen-Rauchmelder**:

1. **Draft:** Jemand schreibt auf: „Wir wollen X tun, die Optionen sind A, B, C, die Risiken sind …“
2. **Review:** Jemand anderes prüft: „Stimmt das? Fehlt was?“
3. **Commit:** Der Prüfer sagt: „Okay, ich gebe frei.“ Er vergibt einen **Token** – wie einen Stempel.
4. **Final:** Nur mit dem Stempel kann die Entscheidung verbindlich werden. Ohne Stempel – **blockiert**.

**Kurz:** Jede wichtige Entscheidung geht durch dieses Protokoll. Kein „wir machen es schnell ohne Review“ – das System **stoppt** das.

---

## 5. Das Gedächtnis: Memory-on-Disk

**Metapher:** Stell dir vor, alles, was im Chat passiert, würde beim Schließen des Browsers **gelöscht**. Unser System speichert stattdessen:
- Entscheidungen in einer **Datenbank**
- Jede Aktion in einem **Log** (append-only = nichts wird gelöscht)
- Findings und Progress in **versionierten Dateien** (wie Git)

**Kurz:** Wissen geht nicht verloren. Es ist **auffindbar** – auch Jahre später.

---

## 6. Der Wachhund: Action-Logger & Escalation

**Metapher:** Wie eine **Videoüberwachung** in einem Geschäft – nur: Sie zeichnet nicht nur auf, sie **stoppt** auch, wenn jemand etwas Falsches tut.

- **Action-Logger:** Jede Aktion wird protokolliert – wer, wann, was, mit welchem Ergebnis.
- **Escalation:** Wenn jemand versucht, Regeln zu umgehen (z.B. finalisieren ohne Review), wird das **geloggt** und die Aktion wird **blockiert**.

**Kurz:** Es gibt keinen Weg „drum herum“. Entweder man geht den richtigen Weg – oder es passiert nichts.

---

## 7. Das System als Team (Text-Diagramm)

```
                    ┌──────────────────┐
                    │   NUTZER/CLIENT  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  ORCHESTRATOR    │  ← Der Dirigent
                    │  (Kommandozentrum)│
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌─────▼─────┐        ┌────▼────┐
    │Knowledge│        │  Project  │        │Governance│  ← Die Assistenten
    │ Agent   │        │  Agent    │        │  Agent   │
    └────┬────┘        └─────┬─────┘        └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   GOVERNANCE    │  ← Der Bauleiter
                    │ (Policy, Review,│
                    │  Commit-Token) │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  ACTION-LOGGER   │  ← Der Wachhund
                    │  (Audit-Trail)  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   DATENBANK     │  ← Das Gedächtnis
                    │ (Decisions,     │
                    │  Reviews, Logs) │
                    └─────────────────┘
```

---

## 8. Datenfluss (einfach)

1. **Eingabe:** Nutzer oder Agent: „Erstelle eine Entscheidung zu X.“
2. **Orchestrator:** Prüft: Hat der Agent die Berechtigung? Braucht es ein Review?
3. **Agent:** Führt die Aktion aus (z.B. Draft erstellen).
4. **Governance:** Prüft nochmals (Policy, Sanitization, Redaction).
5. **Logger:** Schreibt: „Am [Datum] hat Agent Y Aktion Z ausgeführt – Ergebnis: OK.“
6. **Ausgabe:** Der Nutzer sieht das Ergebnis – oder eine klare Fehlermeldung, wenn etwas blockiert wurde.

---

## 9. Entscheidungsprozess (Metapher: Flughafen)

- **Draft:** Du checkst ein – hast Gepäck, Ticket, Ausweis.
- **Review:** Die Sicherheitskontrolle prüft dich – keine Flüssigkeiten, keine verbotenen Gegenstände.
- **Commit:** Du bekommst einen **Boarding-Pass** – wie ein Commit-Token.
- **Final:** Nur mit dem Boarding-Pass darfst du ins Flugzeug. Ohne – **kein Einlass**.

**Kurz:** Es gibt keinen „Backstage-Eingang“. Jeder muss durch die gleiche Tür – mit den gleichen Kontrollen.

---

## 10. Warum das besonders ist (für den 15-Jährigen)

- **Andere Systeme:** „Wir haben einen Chatbot. Der antwortet smart.“ – Aber was passiert mit dem Wissen? Verschwindet es?
- **Unser System:** „Wir haben ein Team von Assistenten mit Regeln. Alles wird protokolliert. Nichts geht verloren. Keine Abkürzungen.“

**Kurz:** Nicht nur „smart“ – sondern **sicher**, **nachvollziehbar** und **regelkonform**.

---

*Diese Erklärung nutzt Metaphern und einfache Sprache. Für technische Details siehe das Whitepaper oder die technische Dokumentation.*
