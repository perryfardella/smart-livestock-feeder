#!/usr/bin/env node

/**
 * Test script to verify batch permissions API performance
 * Usage: node scripts/test-batch-permissions.js
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000";

// Mock data - replace with actual feeder ID and auth token in real testing
const TEST_FEEDER_ID = "12a33986-e6aa-4182-b8f1-44715e526c5b";
const TEST_PERMISSIONS = [
  "manual_feed_release",
  "create_feeding_schedules",
  "edit_feeding_schedules",
  "delete_feeding_schedules",
  "edit_feeder_settings",
];

async function testBatchPermissions() {
  console.log("🚀 Testing Batch Permissions API Performance...\n");

  // Test 1: Individual Permission Calls (OLD WAY)
  console.log("📊 Testing Individual Permission Calls (OLD WAY)...");
  const startIndividual = Date.now();

  try {
    const individualPromises = TEST_PERMISSIONS.map((permission) =>
      fetch(
        `${BASE_URL}/api/feeders/${TEST_FEEDER_ID}/permissions?permission=${permission}`
      )
        .then((res) => res.json())
        .catch((err) => ({ error: err.message, permission }))
    );

    const individualResults = await Promise.all(individualPromises);
    const individualTime = Date.now() - startIndividual;

    console.log(`⏱️  Individual calls took: ${individualTime}ms`);
    console.log(`📈 Results: ${individualResults.length} permission checks`);
    console.log(
      `💾 Individual results:`,
      individualResults.map((r) => r.hasPermission || r.error)
    );
  } catch (error) {
    console.log(`❌ Individual calls failed: ${error.message}`);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Batch Permission Call (NEW WAY)
  console.log("🔥 Testing Batch Permission Call (NEW WAY)...");
  const startBatch = Date.now();

  try {
    const batchResponse = await fetch(
      `${BASE_URL}/api/feeders/${TEST_FEEDER_ID}/permissions/batch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: TEST_PERMISSIONS }),
      }
    );

    const batchResult = await batchResponse.json();
    const batchTime = Date.now() - startBatch;

    console.log(`⏱️  Batch call took: ${batchTime}ms`);
    console.log(
      `📈 Results: ${Object.keys(batchResult.permissions || {}).length} permission checks`
    );
    console.log(
      `💾 Batch results:`,
      batchResult.permissions || batchResult.error
    );

    // Calculate performance improvement
    if (individualTime && batchTime) {
      const improvement = (
        ((individualTime - batchTime) / individualTime) *
        100
      ).toFixed(1);
      const speedup = (individualTime / batchTime).toFixed(1);

      console.log(`\n🎉 PERFORMANCE IMPROVEMENT:`);
      console.log(`   📉 ${improvement}% faster (${speedup}x speedup)`);
      console.log(`   ⚡ Saved ${individualTime - batchTime}ms per load`);
    }
  } catch (error) {
    console.log(`❌ Batch call failed: ${error.message}`);
  }

  console.log("\n" + "=".repeat(50) + "\n");
  console.log("✅ Test completed!");
  console.log(
    "💡 Remember: The batch API reduces database queries from 5+ to 2"
  );
  console.log(
    "🔧 Benefits: Faster page loads, better user experience, reduced server load"
  );
}

// Run the test
testBatchPermissions().catch(console.error);
