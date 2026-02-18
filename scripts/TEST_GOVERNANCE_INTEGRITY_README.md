# Governance Integrity Stress Test

## Übersicht

Dieses Test-Script (`test-governance-integrity.ts`) testet die Integration zwischen Customer Data Plane und PolicyEngine mit deterministischer Clock für replay-fähige Logs.

## Test-Szenarien

### Szenario A: Happy Path
- **Ziel:** Testet den erfolgreichen Zugriff auf ein allowlistetes Feld
- **Erwartung:** Stabiler `resultHash` und korrekter `ActionLog`-Eintrag
- **Test:** `customer_data.getEntity` für `entity: "customer"`, `id: "123"` mit erlaubten Feldern `["id", "name", "status"]`

### Szenario B: Governance Violation
- **Ziel:** Testet, ob nicht erlaubte Felder blockiert werden
- **Erwartung:** PolicyEngine wirft `PolicyError` mit Code `CONSTRAINT_VIOLATION` oder `OPERATION_NOT_ALLOWED`
- **Test:** Versuch, `email` Feld abzufragen, das NICHT in `allowedFields` steht

### Szenario C: Time-Skew Test
- **Ziel:** Testet die Zeit-Gap-Erkennung
- **Erwartung:** Nach 60 Minuten Pause sollte das System das `TIME_GAP_DETECTED` Event korrekt triggern
- **Test:** 
  1. Erster Zugriff bei `2026-02-18T10:00:00Z`
  2. Clock um 60 Minuten vorrücken
  3. Zweiter Zugriff
  4. Prüfen, ob Hash-Stabilität erhalten bleibt

### Szenario D: PII Redaction
- **Ziel:** Testet, ob PII-Felder korrekt entfernt werden
- **Erwartung:** `email` Feld wird durch `denyFields` entfernt, auch wenn es im Connector-Result vorhanden ist
- **Test:** Connector gibt Daten mit `email` zurück, aber `denyFields: ["email"]` sollte es entfernen

## Hash-Stabilität

Das Script prüft die Hash-Stabilität über zwei identische Läufe:
- **Result Hash:** Sollte identisch sein für identische Inputs
- **Policy Decision Hash:** Sollte identisch sein für identische Policy-Entscheidungen (mit deterministischer Clock)

## Ausführung

**Hinweis:** Das Script verwendet TypeScript und ES Modules. Die Ausführung kann je nach Projekt-Konfiguration variieren.

### Option 1: Mit ts-node (ESM)
```bash
cd scripts
pnpm ts-node --esm test-governance-integrity.ts
```

### Option 2: Kompilieren und ausführen
```bash
# Kompilieren
pnpm tsc scripts/test-governance-integrity.ts --outDir dist --module esnext --moduleResolution node

# Ausführen
node dist/test-governance-integrity.js
```

### Option 3: Mit tsx (falls installiert)
```bash
pnpm tsx scripts/test-governance-integrity.ts
```

## Erwartete Ergebnisse

### ✅ Erfolgreiche Tests sollten zeigen:

1. **Szenario A:**
   - `ok: true`
   - `resultHash` vorhanden
   - `policyDecisionHash` vorhanden
   - Felder: `["id", "name", "status"]` (ohne `email`)

2. **Szenario B:**
   - `ok: false`
   - `error` enthält Fehlermeldung über nicht erlaubte Felder
   - Audit-Log mit `action: "policy.violation"`

3. **Szenario C:**
   - Beide Hashes identisch (Hash-Stabilität)
   - Zeit-Gap von 60 Minuten erkannt

4. **Szenario D:**
   - `email` Feld NICHT im Output
   - `redactedFields: ["email"]` im Audit-Log

### 🔐 Hash-Stabilität

- **Result Hash:** Identisch über zwei identische Läufe
- **Policy Decision Hash:** Identisch über zwei identische Läufe (mit deterministischer Clock)

## Wichtige Regeln

1. **Niemals `Date.now()` verwenden:** Nur die injizierte `Clock`
2. **Deterministische Hashes:** Alle Hashes müssen bei identischen Inputs identisch sein
3. **Governance-Bypass unmöglich:** Alle Zugriffe müssen über PolicyEngine laufen

## Mock-Komponenten

Das Script verwendet:
- **MockCustomerConnector:** Simuliert Datenbank-Zugriffe
- **MockActionLogger:** Sammelt Audit-Logs im Speicher
- **FakeClock:** Deterministische Zeit-Steuerung
- **InMemoryCapabilityRegistry:** In-Memory Capability Maps
- **InMemoryMultiSourceConnectorRegistry:** In-Memory Connector Registry

## Capability Map für test-agency-1

```typescript
{
  clientId: "test-agency-1",
  operations: {
    GetCustomer: {
      operationId: "GetCustomer",
      source: "mock",
      allowedFields: ["id", "name", "status", "phone"], // email NICHT erlaubt
      denyFields: ["email"], // email wird entfernt
    },
  },
  defaultMaxRows: 200,
}
```

