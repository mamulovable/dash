/**
 * Verify Database Schema
 * Run this to check if all tables were created successfully
 */

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function verifyDatabase() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log("✅ Tables in database:");
    tables.forEach((t: any) => console.log(`  - ${t.table_name}`));

    const expectedTables = [
      "users",
      "data_sources",
      "queries",
      "query_packs",
      "teams",
      "team_members",
    ];

    const foundTables = tables.map((t: any) => t.table_name);
    const missing = expectedTables.filter((t) => !foundTables.includes(t));

    if (missing.length === 0) {
      console.log("\n✅ All expected tables are present!");
    } else {
      console.log(`\n⚠️  Missing tables: ${missing.join(", ")}`);
    }
  } catch (error) {
    console.error("❌ Error verifying database:", error);
    process.exit(1);
  }
}

verifyDatabase();





