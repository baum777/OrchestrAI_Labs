/**
 * Governance Integrity Stress Test
 * 
 * Testet die Integration zwischen Customer Data Plane und PolicyEngine
 * mit deterministischer Clock für replay-fähige Logs.
 * 
 * Szenarien:
 * - A: Happy Path mit allowlistetem Feld
 * - B: Governance Violation (nicht erlaubtes Feld)
 * - C: Time-Skew Test (60 Minuten Pause)
 * - D: PII Redaction (E-Mail-Adresse entfernen)
 */

import { FakeClock } from "../packages/governance-v2/src/runtime/clock.js";
import { PolicyEngine } from "../packages/governance/src/policy/policy-engine.js";
import { PolicyError } from "../packages/governance/src/policy/errors.js";
import type { PolicyContext } from "../packages/governance/src/policy/types.js";
import type {
  CustomerConnector,
  CapabilityMap,
  ReadModelResult,
  HealthStatus,
  ReadConstraints,
} from "../packages/customer-data/src/index.js";
import {
  InMemoryMultiSourceConnectorRegistry,
  InMemoryCapabilityRegistry,
  generateResultHash,
} from "../packages/customer-data/src/index.js";
import type { ActionLogger } from "../packages/agent-runtime/src/orchestrator/orchestrator.js";

// Mock ActionLogger
class MockActionLogger implements ActionLogger {
  private logs: any[] = [];

  async append(entry: any): Promise<void> {
    this.logs.push(entry);
  }

  getLogs(): any[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  findLogsByAction(action: string): any[] {
    return this.logs.filter(log => log.action === action);
  }
}

// Mock CustomerConnector
class MockCustomerConnector implements CustomerConnector {
  private data: Record<string, Record<string, unknown>> = {};

  constructor() {
    // Test-Daten für "customer" Entity
    this.data["customer"] = {
      "123": {
        id: "123",
        name: "Test Customer",
        email: "test@example.com",
        phone: "+49 30 12345678",
        status: "active",
      },
    };
  }

  async executeReadModel(
    operationId: string,
    params: Record<string, unknown>,
    constraints: ReadConstraints
  ): Promise<ReadModelResult> {
    const entity = params.entity as string;
    const id = params.id as string;

    if (!entity || !id || !this.data[entity] || !this.data[entity][id]) {
      return {
        data: [],
        metadata: {
          sourceType: "mock",
          rowCount: 0,
          fieldsReturned: [],
        },
        executionMetrics: {
          latencyMs: 5,
        },
      };
    }

    let result: Record<string, unknown> = { ...(this.data[entity][id] as Record<string, unknown>) };

    // Apply field filtering if specified
    if (constraints.allowedFields && constraints.allowedFields.length > 0) {
      const filtered: Record<string, unknown> = {};
      for (const field of constraints.allowedFields) {
        if (field in result) {
          filtered[field] = result[field];
        }
      }
      result = filtered;
    }

    return {
      data: [result],
      metadata: {
        sourceType: "mock",
        rowCount: 1,
        fieldsReturned: Object.keys(result),
      },
      executionMetrics: {
        latencyMs: 5,
      },
    };
  }

  async health(): Promise<HealthStatus> {
    return {
      healthy: true,
      latencyMs: 1,
    };
  }
}

// Capability Map für test-agency-1
function createTestCapabilityMap(): CapabilityMap {
  return {
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
  };
}

// Simuliert customer_data.getEntity Tool Handler
async function simulateGetEntity(
  clock: FakeClock,
  policyEngine: PolicyEngine,
  connectorRegistry: InMemoryMultiSourceConnectorRegistry,
  capabilityRegistry: InMemoryCapabilityRegistry,
  logger: MockActionLogger,
  ctx: {
    userId: string;
    clientId: string;
    projectId?: string;
    agentId?: string;
  },
  input: {
    entity: string;
    id: string;
    fields?: string[];
  }
): Promise<{ ok: boolean; error?: string; output?: any; resultHash?: string; policyDecisionHash?: string }> {
  const startTime = clock.now().getTime();
  const requestId = crypto.randomUUID();

  const clientId = ctx.clientId;
  const entity = input.entity;
  const id = input.id;

  if (!clientId) {
    return { ok: false, error: "clientId is required" };
  }
  if (!entity || !id) {
    return { ok: false, error: "entity and id are required" };
  }

  const agentId = ctx.agentId ?? ctx.userId;
    const permissions: string[] = ["customer_data.read"]; // Mock permissions

  const policyCtx: PolicyContext = {
    userId: ctx.userId,
    clientId,
    projectId: ctx.projectId,
    agentId,
    permissions: permissions as any[],
  };

  try {
    // PHASE 1: PolicyEngine Authorization
    const decision = policyEngine.authorize(
      policyCtx,
      "customer_data.getEntity",
      { clientId, ...input }
    );

    // Get capability map
    const capability = capabilityRegistry.getCapabilities(clientId);
    if (!capability) {
      return { ok: false, error: "No capabilities found for clientId" };
    }

    // For getEntity, we use a synthetic operationId
    const operationId = `Get${entity.charAt(0).toUpperCase() + entity.slice(1)}`;
    if (!capabilityRegistry.isOperationAllowed(clientId, operationId)) {
      return { ok: false, error: `Entity ${entity} not allowed for clientId` };
    }

    const source = capabilityRegistry.getSourceForOperation(clientId, operationId);
    const sanitized = policyEngine.sanitize(
      { entity, id, fields: input.fields },
      capability,
      operationId
    );

    const connector = connectorRegistry.getConnector(clientId, source);

    // Execute connector (sanitized.params already contains entity/id from input)
    const result = await connector.executeReadModel(
      operationId,
      sanitized.params,
      sanitized.constraints
    );

    // PHASE 2: Redact result
    const redacted = policyEngine.redact(result.data, capability, operationId);
    const latencyMs = clock.now().getTime() - startTime;
    const resultHash = generateResultHash(redacted.data, capability.operations[operationId]?.denyFields);

    // PHASE 5: Enriched audit log
    await logger.append({
      agentId,
      userId: ctx.userId,
      projectId: ctx.projectId,
      clientId,
      action: "customer_data.access",
      input: { clientId, requestId, ...input },
      output: {
        rowCount: redacted.metadata.rowCount,
        fieldsReturned: redacted.metadata.fieldsReturned,
        latencyMs,
        sourceType: result.metadata.sourceType,
        resultHash,
        policyDecisionHash: decision.decisionHash,
        requestId,
      },
      ts: clock.now().toISOString(),
      blocked: false,
    });

    return {
      ok: true,
      output: {
        entity: redacted.data[0] ?? null,
        metadata: redacted.metadata,
        executionMetrics: { latencyMs },
        requestId,
      },
      resultHash,
      policyDecisionHash: decision.decisionHash,
    };
  } catch (error: unknown) {
    if (error instanceof PolicyError) {
      try {
        await logger.append({
          agentId,
          userId: ctx.userId,
          projectId: ctx.projectId,
          clientId,
          action: "policy.violation",
          input: { clientId, operation: "customer_data.getEntity", requestId, ...input },
          output: { reason: error.message, code: error.code, requestId },
          ts: clock.now().toISOString(),
          blocked: true,
          reason: error.message,
        });
      } catch (logError) {
        console.error("Failed to log policy violation:", logError);
      }
      return { ok: false, error: error.message };
    }
    // Re-throw non-PolicyError exceptions
    throw error;
  }
}

// Haupttest-Funktion
async function runTests() {
  console.log("🧪 Governance Integrity Stress Test\n");
  console.log("=" .repeat(60));

  // Setup: FakeClock auf festen Zeitpunkt setzen
  const initialTime = new Date("2026-02-18T10:00:00.000Z");
  const clock = new FakeClock(initialTime);
  console.log(`\n⏰ Clock initialisiert auf: ${clock.now().toISOString()}\n`);

  // Setup: Komponenten initialisieren
  const policyEngine = new PolicyEngine(clock);
  const connectorRegistry = new InMemoryMultiSourceConnectorRegistry();
  const capabilityRegistry = new InMemoryCapabilityRegistry();
  const logger = new MockActionLogger();

  // Setup: Capability Map registrieren
  const capability = createTestCapabilityMap();
  capabilityRegistry.register("test-agency-1", capability);

  // Setup: Connector registrieren
  const connector = new MockCustomerConnector();
  connectorRegistry.register("test-agency-1", "mock", connector);

  const ctx = {
    userId: "test-user-1",
    clientId: "test-agency-1",
    projectId: "test-project-1",
    agentId: "test-agent-1",
  };

  // ============================================
  // SZENARIO A: Happy Path
  // ============================================
  console.log("📋 Szenario A: Happy Path (allowlistetes Feld)");
  console.log("-".repeat(60));

  logger.clear();
  clock.set(initialTime);

  const resultA1 = await simulateGetEntity(
    clock,
    policyEngine,
    connectorRegistry,
    capabilityRegistry,
    logger,
    ctx,
    {
      entity: "customer",
      id: "123",
      fields: ["id", "name", "status"], // Nur erlaubte Felder
    }
  );

  console.log(`✅ Ergebnis: ${resultA1.ok ? "OK" : "FEHLER"}`);
  if (resultA1.ok) {
    console.log(`   Result Hash: ${resultA1.resultHash}`);
    console.log(`   Policy Decision Hash: ${resultA1.policyDecisionHash}`);
    console.log(`   Felder zurückgegeben: ${JSON.stringify(resultA1.output?.metadata?.fieldsReturned)}`);
    console.log(`   Entity-Daten: ${JSON.stringify(resultA1.output?.entity)}`);
  } else {
    console.log(`   Fehler: ${resultA1.error}`);
  }

  // Zweiter identischer Lauf für Hash-Stabilität
  logger.clear();
  clock.set(initialTime);

  const resultA2 = await simulateGetEntity(
    clock,
    policyEngine,
    connectorRegistry,
    capabilityRegistry,
    logger,
    ctx,
    {
      entity: "customer",
      id: "123",
      fields: ["id", "name", "status"],
    }
  );

  console.log(`\n🔄 Zweiter identischer Lauf:`);
  console.log(`   Result Hash: ${resultA2.resultHash}`);
  console.log(`   Policy Decision Hash: ${resultA2.policyDecisionHash}`);
  console.log(`   Hash-Stabilität: ${resultA1.resultHash === resultA2.resultHash ? "✅ STABIL" : "❌ NICHT STABIL"}`);
  console.log(`   Policy Hash-Stabilität: ${resultA1.policyDecisionHash === resultA2.policyDecisionHash ? "✅ STABIL" : "❌ NICHT STABIL"}`);

  // ============================================
  // SZENARIO B: Governance Violation
  // ============================================
  console.log("\n\n📋 Szenario B: Governance Violation (nicht erlaubtes Feld)");
  console.log("-".repeat(60));

  logger.clear();
  clock.set(initialTime);

  const resultB = await simulateGetEntity(
    clock,
    policyEngine,
    connectorRegistry,
    capabilityRegistry,
    logger,
    ctx,
    {
      entity: "customer",
      id: "123",
      fields: ["id", "name", "email"], // email ist NICHT erlaubt
    }
  );

  console.log(`✅ Ergebnis: ${resultB.ok ? "OK (unerwartet!)" : "BLOCKIERT (erwartet)"}`);
  if (!resultB.ok) {
    console.log(`   Fehler: ${resultB.error}`);
    const violationLogs = logger.findLogsByAction("policy.violation");
    if (violationLogs.length > 0) {
      console.log(`   Audit-Log: ${JSON.stringify(violationLogs[0].output, null, 2)}`);
    }
  } else {
    console.log(`   ⚠️  WARNUNG: System sollte blockieren, hat aber nicht blockiert!`);
  }

  // ============================================
  // SZENARIO C: Time-Skew Test
  // ============================================
  console.log("\n\n📋 Szenario C: Time-Skew Test (60 Minuten Pause)");
  console.log("-".repeat(60));

  logger.clear();
  clock.set(initialTime);

  // Erster Zugriff
  const resultC1 = await simulateGetEntity(
    clock,
    policyEngine,
    connectorRegistry,
    capabilityRegistry,
    logger,
    ctx,
    {
      entity: "customer",
      id: "123",
      fields: ["id", "name"],
    }
  );

  console.log(`⏰ Erster Zugriff: ${clock.now().toISOString()}`);
  console.log(`   Result Hash: ${resultC1.resultHash}`);

  // 60 Minuten vorrücken
  clock.advance(60 * 60 * 1000); // 60 Minuten = 3600000 ms
  console.log(`⏰ Nach 60 Minuten: ${clock.now().toISOString()}`);

  // Zweiter Zugriff nach Pause
  const resultC2 = await simulateGetEntity(
    clock,
    policyEngine,
    connectorRegistry,
    capabilityRegistry,
    logger,
    ctx,
    {
      entity: "customer",
      id: "123",
      fields: ["id", "name"],
    }
  );

  console.log(`   Result Hash (nach Pause): ${resultC2.resultHash}`);
  console.log(`   Hash-Stabilität: ${resultC1.resultHash === resultC2.resultHash ? "✅ STABIL" : "❌ NICHT STABIL"}`);

  // Prüfe auf TIME_GAP_DETECTED Event (wird normalerweise im Orchestrator geloggt)
  // Hier simulieren wir nur die Zeit-Differenz
  const timeGap = (clock.now().getTime() - initialTime.getTime()) / (60 * 1000);
  console.log(`   Zeit-Gap: ${timeGap} Minuten`);

  // ============================================
  // SZENARIO D: PII Redaction
  // ============================================
  console.log("\n\n📋 Szenario D: PII Redaction (E-Mail-Adresse entfernen)");
  console.log("-".repeat(60));

  logger.clear();
  clock.set(initialTime);

  // Connector gibt Daten mit email zurück
  const resultD = await simulateGetEntity(
    clock,
    policyEngine,
    connectorRegistry,
    capabilityRegistry,
    logger,
    ctx,
    {
      entity: "customer",
      id: "123",
      fields: ["id", "name", "phone"], // email nicht angefragt, aber sollte entfernt werden
    }
  );

  console.log(`✅ Ergebnis: ${resultD.ok ? "OK" : "FEHLER"}`);
  if (resultD.ok) {
    const entity = resultD.output?.entity as Record<string, unknown> | undefined;
    console.log(`   Entity-Daten: ${JSON.stringify(entity, null, 2)}`);
    
    if (entity) {
      const hasEmail = "email" in entity;
      console.log(`   E-Mail im Output: ${hasEmail ? "❌ VORHANDEN (Fehler!)" : "✅ ENTFERNT (korrekt)"}`);
      
      if (hasEmail) {
        console.log(`   ⚠️  WARNUNG: E-Mail sollte durch denyFields entfernt werden!`);
      }
    }

    const accessLogs = logger.findLogsByAction("customer_data.access");
    if (accessLogs.length > 0) {
      const metadata = accessLogs[0].output as any;
      console.log(`   Redacted Fields: ${JSON.stringify(metadata.redactedFields || [])}`);
    }
  } else {
    console.log(`   Fehler: ${resultD.error}`);
  }

  // ============================================
  // ZUSAMMENFASSUNG
  // ============================================
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 ZUSAMMENFASSUNG");
  console.log("=".repeat(60));

  // Hash-Stabilität über zwei identische Läufe
  logger.clear();
  clock.set(initialTime);
  const hashTest1 = await simulateGetEntity(
    clock,
    policyEngine,
    connectorRegistry,
    capabilityRegistry,
    logger,
    ctx,
    { entity: "customer", id: "123", fields: ["id", "name", "status"] }
  );

  logger.clear();
  clock.set(initialTime);
  const hashTest2 = await simulateGetEntity(
    clock,
    policyEngine,
    connectorRegistry,
    capabilityRegistry,
    logger,
    ctx,
    { entity: "customer", id: "123", fields: ["id", "name", "status"] }
  );

  console.log("\n🔐 Hash-Stabilität (zwei identische Läufe):");
  console.log(`   Result Hash 1: ${hashTest1.resultHash}`);
  console.log(`   Result Hash 2: ${hashTest2.resultHash}`);
  console.log(`   ✅ Result Hash stabil: ${hashTest1.resultHash === hashTest2.resultHash ? "JA" : "NEIN"}`);
  
  console.log(`   Policy Decision Hash 1: ${hashTest1.policyDecisionHash}`);
  console.log(`   Policy Decision Hash 2: ${hashTest2.policyDecisionHash}`);
  console.log(`   ✅ Policy Decision Hash stabil: ${hashTest1.policyDecisionHash === hashTest2.policyDecisionHash ? "JA" : "NEIN"}`);

  console.log("\n✅ Test abgeschlossen!");
}

import crypto from "node:crypto";

// Test ausführen
runTests().catch((error) => {
  console.error("❌ Test fehlgeschlagen:", error);
  process.exit(1);
});

