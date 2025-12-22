/**
 * Database Initialization Script
 * Run this to set up your Neon database schema
 * 
 * Usage: npx tsx scripts/init-db.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables from .env
config({ path: join(process.cwd(), ".env") });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env");
  console.error("Please make sure your .env file contains DATABASE_URL");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function initDatabase() {
  try {
    console.log("📦 Reading schema file...");
    const schemaPath = join(process.cwd(), "schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");

    console.log("🚀 Executing schema...");
    
    // Execute the entire schema as one block using eval to create template literal
    // This is necessary because Neon requires tagged template literals
    const executeSQL = async (query: string) => {
      // Create a template literal dynamically
      // We'll use a workaround: construct the call properly
      return await (sql as any).unsafe(query);
    };

    // Try using unsafe method if available, otherwise split intelligently
    try {
      // Check if sql has an unsafe method (some Neon clients have this)
      if (typeof (sql as any).unsafe === 'function') {
        await (sql as any).unsafe(schema);
      } else {
        // Fallback: execute as template literal by constructing it
        // Remove comments first
        const cleanSchema = schema
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n');
        
        // Execute using eval to create proper template literal
        const fn = new Function('sql', `return sql\`${cleanSchema.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\``);
        await fn(sql);
      }
    } catch (err: any) {
      // If that fails, try executing statement by statement more carefully
      console.log("  Trying statement-by-statement execution...");
      
      // Better splitting: only split on semicolons that are not inside function bodies
      const statements: string[] = [];
      let current = '';
      let inFunction = false;
      let depth = 0;
      
      for (const line of schema.split('\n')) {
        if (line.trim().startsWith('--')) continue; // Skip comments
        
        current += line + '\n';
        
        // Track function/trigger depth
        if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('CREATE FUNCTION')) {
          inFunction = true;
          depth = 0;
        }
        if (inFunction) {
          depth += (line.match(/\{/g) || []).length;
          depth -= (line.match(/\}/g) || []).length;
          if (line.includes('$$') && depth <= 0) {
            inFunction = false;
          }
        }
        
        // Only split on semicolon if not in function
        if (line.trim().endsWith(';') && !inFunction) {
          const stmt = current.trim();
          if (stmt) {
            statements.push(stmt);
          }
          current = '';
        }
      }
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          const fn = new Function('sql', `return sql\`${stmt.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\``);
          await fn(sql);
          console.log(`  ✓ Executed statement ${i + 1}/${statements.length}`);
        } catch (stmtErr: any) {
          if (stmtErr.message?.includes('already exists') || stmtErr.message?.includes('duplicate')) {
            console.log(`  ⚠️  Statement ${i + 1} (already exists)`);
          } else {
            console.error(`  ❌ Error in statement ${i + 1}`);
            throw stmtErr;
          }
        }
      }
    }

    console.log("✅ Database initialized successfully!");
    console.log("\nTables created:");
    console.log("  - users");
    console.log("  - data_sources");
    console.log("  - queries");
    console.log("  - query_packs");
    console.log("  - teams");
    console.log("  - team_members");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  }
}

initDatabase();

