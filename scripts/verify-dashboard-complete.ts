import { neon, neonConfig } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);

async function verifyDashboardComplete() {
  try {
    console.log("🔍 Verifying dashboard_collections table...");

    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dashboard_collections'
      );
    `;

    if (tableCheck[0]?.exists) {
      console.log("✅ dashboard_collections table exists!");

      // Check columns
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'dashboard_collections'
        ORDER BY ordinal_position;
      `;

      console.log("\n📋 Table columns:");
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `(default: ${col.column_default})` : ''}`);
      });

      // Check indexes
      const indexes = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'dashboard_collections';
      `;

      console.log("\n📊 Indexes:");
      indexes.forEach((idx: any) => {
        console.log(`  - ${idx.indexname}`);
      });

      // Check triggers
      const triggers = await sql`
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'dashboard_collections';
      `;

      console.log("\n⚙️  Triggers:");
      if (triggers.length > 0) {
        triggers.forEach((trg: any) => {
          console.log(`  - ${trg.trigger_name} (${trg.event_manipulation})`);
        });
      } else {
        console.log("  ⚠️  No triggers found - need to create update trigger");
      }

      // Check foreign key
      const fkeys = await sql`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'dashboard_collections';
      `;

      console.log("\n🔗 Foreign Keys:");
      if (fkeys.length > 0) {
        fkeys.forEach((fk: any) => {
          console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      } else {
        console.log("  ⚠️  No foreign keys found");
      }
    } else {
      console.log("❌ dashboard_collections table does not exist!");
      console.log("\nCreating table now...");
      
      // Create with TEXT user_id to match existing schema
      await sql`
        CREATE TABLE IF NOT EXISTS dashboard_collections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          queries JSONB DEFAULT '[]',
          layout JSONB DEFAULT '{}',
          is_public BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_dashboard_collections_user_id 
        ON dashboard_collections(user_id);
      `;

      await sql`
        CREATE TRIGGER update_dashboard_collections_updated_at 
        BEFORE UPDATE ON dashboard_collections
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;

      console.log("✅ Table created!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

verifyDashboardComplete();


