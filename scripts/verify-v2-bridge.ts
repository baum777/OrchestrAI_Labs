/**
 * V2 Bridge Verification Test
 * 
 * Verifies that V1 PolicyEngine works deterministically through V2 Clock abstraction.
 * Tests that same input + same FakeClock time = same output.
 */

import { FakeClock, SystemClock } from "../packages/governance-v2/src/runtime/clock.js";
import { V1PolicyEngineAdapter } from "../packages/governance-v2/src/bridge/v1-adapter.js";
import type { PolicyContext } from "../packages/governance/src/policy/types.js";

async function runVerification() {
  console.log("🔍 V2 Bridge Verification Test\n");
  console.log("=".repeat(60));

  const sysClock = new SystemClock();
  const fixedTime = sysClock.parseISO("2026-02-18T10:00:00.000Z");
  const clock1 = new FakeClock(fixedTime);
  const clock2 = new FakeClock(fixedTime);

  console.log(`⏰ Fixed Clock Time: ${clock1.now().toISOString()}\n`);

  // Setup: Create V1 adapters with same clock time
  const adapter1 = new V1PolicyEngineAdapter(clock1);
  const adapter2 = new V1PolicyEngineAdapter(clock2);

  // Test context
  const policyCtx: PolicyContext = {
    userId: "test-user",
    clientId: "test-client",
    projectId: "test-project",
    permissions: ["customer_data.read"],
  };

  const operation = "customer_data.getEntity";
  const params = {
    clientId: "test-client",
    entity: "customer",
    id: "123",
  };

  console.log("📋 Test: PolicyEngine Authorization");
  console.log("-".repeat(60));

  try {
    // First authorization
    const decision1 = adapter1.authorize(policyCtx, operation, params);
    console.log(`✅ Decision 1:`);
    console.log(`   Timestamp: ${decision1.timestamp}`);
    console.log(`   Decision Hash: ${decision1.decisionHash}`);
    console.log(`   Allowed: ${decision1.allowed}`);

    // Second authorization (same input, same clock time)
    const decision2 = adapter2.authorize(policyCtx, operation, params);
    console.log(`\n✅ Decision 2:`);
    console.log(`   Timestamp: ${decision2.timestamp}`);
    console.log(`   Decision Hash: ${decision2.decisionHash}`);
    console.log(`   Allowed: ${decision2.allowed}`);

    // Verification
    console.log(`\n🔐 Determinism Check:`);
    const timestampMatch = decision1.timestamp === decision2.timestamp;
    const hashMatch = decision1.decisionHash === decision2.decisionHash;
    const allowedMatch = decision1.allowed === decision2.allowed;

    console.log(`   Timestamps match: ${timestampMatch ? "✅" : "❌"}`);
    console.log(`   Decision Hashes match: ${hashMatch ? "✅" : "❌"}`);
    console.log(`   Allowed status match: ${allowedMatch ? "✅" : "❌"}`);

    if (timestampMatch && hashMatch && allowedMatch) {
      console.log(`\n✅ VERIFICATION PASSED: V1 PolicyEngine is deterministic through V2 Clock`);
    } else {
      console.log(`\n❌ VERIFICATION FAILED: Non-deterministic behavior detected`);
      process.exit(1);
    }

    // Test with different clock time (should produce different timestamp but same hash)
    console.log(`\n📋 Test: Clock Time Independence`);
    console.log("-".repeat(60));
    
    const clock3 = new FakeClock(sysClock.parseISO("2026-02-18T11:00:00.000Z"));
    const adapter3 = new V1PolicyEngineAdapter(clock3);
    const decision3 = adapter3.authorize(policyCtx, operation, params);

    console.log(`⏰ Clock 3 Time: ${clock3.now().toISOString()}`);
    console.log(`   Timestamp: ${decision3.timestamp}`);
    console.log(`   Decision Hash: ${decision3.decisionHash}`);

    // Hash should be same (deterministic, excludes timestamp)
    const hashStillMatches = decision1.decisionHash === decision3.decisionHash;
    const timestampDiffers = decision1.timestamp !== decision3.timestamp;

    console.log(`\n🔐 Hash Determinism Check:`);
    console.log(`   Hash matches (despite different time): ${hashStillMatches ? "✅" : "❌"}`);
    console.log(`   Timestamp differs: ${timestampDiffers ? "✅" : "❌"}`);

    if (hashStillMatches && timestampDiffers) {
      console.log(`\n✅ VERIFICATION PASSED: Decision hash is time-independent (deterministic)`);
    } else {
      console.log(`\n❌ VERIFICATION FAILED: Hash should be time-independent`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ Test failed with error:`, error);
    process.exit(1);
  }

  console.log(`\n✅ All verifications passed!`);
}

runVerification().catch((error) => {
  console.error("❌ Verification script failed:", error);
  process.exit(1);
});

