import { Pool, Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env file if present (respects CI env vars via override: false)
dotenv.config({ override: false });

/**
 * Determine if SSL should be used based on connection string.
 * Railway public Postgres requires ssl:{rejectUnauthorized:false}
 */
function getSslConfig(databaseUrl: string): { rejectUnauthorized: boolean } | undefined {
  // Always use SSL for Railway or any remote Postgres
  const isRemote = databaseUrl.includes("railway.app") ||
                     databaseUrl.includes("render.com") ||
                     databaseUrl.includes("aws") ||
                     databaseUrl.includes("amazon") ||
                     databaseUrl.includes("sslmode=require") ||
                     databaseUrl.includes("ssl=true");

  if (isRemote) {
    return { rejectUnauthorized: false };
  }

  // For localhost/development, no SSL needed
  if (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")) {
    return undefined;
  }

  // Default: try without SSL first
  return undefined;
}

/**
 * Reset all E2E test tables (deterministic cleanup)
 */
async function resetTables(client: Client): Promise<void> {
  console.log("Resetting E2E test tables...");

  // Truncate all tables with RESTART IDENTITY to reset sequences
  // CASCADE handles foreign key dependencies
  await client.query(`
    TRUNCATE TABLE
      action_logs,
      review_requests,
      decisions,
      user_consents,
      user_permissions,
      user_roles,
      projects
    RESTART IDENTITY CASCADE
  `);

  // Re-seed role_permissions (static reference data)
  await client.query(`
    INSERT INTO role_permissions (role, permissions) VALUES
      ('admin', '["knowledge.read", "knowledge.search", "project.read", "project.update", "project.manage", "decision.create", "decision.read", "log.write", "review.request", "review.approve", "review.reject", "customer_data.read", "marketing.generate"]'::jsonb),
      ('reviewer', '["knowledge.read", "knowledge.search", "project.read", "decision.read", "review.request", "review.approve", "review.reject"]'::jsonb),
      ('user', '["knowledge.read", "knowledge.search", "project.read", "decision.create", "decision.read", "review.request"]'::jsonb),
      ('partner', '["knowledge.read", "knowledge.search", "project.read", "decision.read", "review.request", "review.approve", "review.reject"]'::jsonb)
    ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = now()
  `);

  console.log("✓ Tables reset (TRUNCATE ... RESTART IDENTITY CASCADE)");
}

/**
 * Apply E2E schema (CREATE TABLE IF NOT EXISTS)
 */
async function applySchema(client: Client): Promise<void> {
  console.log("Applying E2E schema...");

  // Read SQL file
  const sqlPath = path.join(__dirname, "e2e-schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // Execute only the CREATE TABLE sections (everything before "SECTION 4")
  const createSection = sql.split("-- ========================================================")[0] +
                         sql.split("-- ========================================================")[1] +
                         sql.split("-- ========================================================")[2] +
                         sql.split("-- ========================================================")[3];

  await client.query(createSection);

  console.log("✓ Schema applied (CREATE TABLE IF NOT EXISTS)");
}

/**
 * Verify all expected tables exist
 */
async function verifyTables(client: Client): Promise<void> {
  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'projects', 'decisions', 'review_requests', 'action_logs',
        'user_consents', 'user_roles', 'user_permissions', 'role_permissions'
      )
    ORDER BY table_name
  `);

  console.log(`\nVerified ${rows.length} tables:`);
  rows.forEach((row) => console.log(`  - ${row.table_name}`));

  if (rows.length !== 8) {
    console.warn(`\nWarning: Expected 8 tables, found ${rows.length}`);
    const foundTables = rows.map((r) => r.table_name);
    const expectedTables = ['projects', 'decisions', 'review_requests', 'action_logs',
                           'user_consents', 'user_roles', 'user_permissions', 'role_permissions'];
    const missing = expectedTables.filter((t) => !foundTables.includes(t));
    if (missing.length > 0) {
      console.warn(`Missing tables: ${missing.join(", ")}`);
    }
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable must be set");
    process.exit(1);
  }

  // Mask and log connection info (no secrets)
  const maskedUrl = databaseUrl.replace(/\/\/[^:]+:[^@]+@/, "//****:****@");
  console.log(`Connecting to: ${maskedUrl}`);

  const ssl = getSslConfig(databaseUrl);
  if (ssl) {
    console.log("Using SSL with rejectUnauthorized: false (Railway/remote Postgres)");
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl,
  });

  try {
    await client.connect();

    // Test connection
    const { rows } = await client.query("SELECT now() as server_time");
    console.log(`✓ Connected to Postgres (server time: ${rows[0].server_time})`);

    const shouldReset = process.argv.includes("--reset");

    if (shouldReset) {
      // Full reset: recreate from scratch
      await resetTables(client);
    }

    // Ensure schema exists (idempotent)
    await applySchema(client);

    // Verify tables
    await verifyTables(client);

    console.log("\n✓ E2E database setup complete");

  } catch (error) {
    console.error("\nFailed to setup E2E database:", error);

    // Provide helpful guidance for common errors
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        console.error("\nHint: Check that DATABASE_URL is correct and the database is reachable.");
        console.error("For Railway: ensure you're using the public database URL.");
      }
      if (error.message.includes("SSL")) {
        console.error("\nHint: SSL error detected. For Railway public Postgres, SSL is required.");
        console.error("The script should auto-detect this. If not, check your DATABASE_URL format.");
      }
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
