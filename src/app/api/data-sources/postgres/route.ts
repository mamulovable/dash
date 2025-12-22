import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { Pool } from "pg";

// POST /api/data-sources/postgres - Connect PostgreSQL database
export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      host, 
      port, 
      database, 
      username, 
      password, 
      schema = "public",
      tableName,
      name,
      selectedColumns 
    } = body;

    if (!host || !port || !database || !username || !password || !tableName) {
      return NextResponse.json(
        { success: false, error: "All database connection fields are required" },
        { status: 400 }
      );
    }

    // Test connection
    const pool = new Pool({
      host,
      port: parseInt(port),
      database,
      user: username,
      password,
      ssl: {
        rejectUnauthorized: false, // For development; use proper SSL in production
      },
      max: 1, // Just for testing
    });

    let connectionTested = false;
    let tableSchema: Record<string, string> = {};
    let sampleData: Record<string, unknown>[] = [];
    let rowCount = 0;

    try {
      // Test connection
      await pool.query("SELECT 1");
      connectionTested = true;

      // Get table schema
      const schemaQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;
      
      const schemaResult = await pool.query(schemaQuery, [schema, tableName]);
      
      if (schemaResult.rows.length === 0) {
        throw new Error(`Table ${schema}.${tableName} not found`);
      }

      // Build schema info
      schemaResult.rows.forEach((row) => {
        tableSchema[row.column_name] = row.data_type;
      });

      // Get sample data (first 100 rows)
      const sampleQuery = `SELECT * FROM ${schema}.${tableName} LIMIT 100`;
      const sampleResult = await pool.query(sampleQuery);
      sampleData = sampleResult.rows;

      // Get row count
      const countQuery = `SELECT COUNT(*) as count FROM ${schema}.${tableName}`;
      const countResult = await pool.query(countQuery);
      rowCount = parseInt(countResult.rows[0].count);

    } finally {
      await pool.end();
    }

    if (!connectionTested) {
      return NextResponse.json(
        { success: false, error: "Failed to connect to database" },
        { status: 400 }
      );
    }

    // Parse selected columns
    let finalSelectedColumns: string[] = [];
    if (selectedColumns && Array.isArray(selectedColumns)) {
      finalSelectedColumns = selectedColumns;
    } else if (selectedColumns) {
      try {
        finalSelectedColumns = typeof selectedColumns === "string" 
          ? JSON.parse(selectedColumns) 
          : [];
      } catch {
        // Auto-select all columns if parsing fails
        finalSelectedColumns = Object.keys(tableSchema);
      }
    } else {
      // Auto-select all columns
      finalSelectedColumns = Object.keys(tableSchema);
    }

    // Limit columns based on tier
    const { TIER_LIMITS } = await import("@/lib/tier-limits");
    const userTier = user.tier as keyof typeof TIER_LIMITS;
    const maxColumns = TIER_LIMITS[userTier]?.max_columns || 10;
    finalSelectedColumns = finalSelectedColumns.slice(0, maxColumns);

    // Generate fingerprint
    const fingerprint = uuidv4();

    // Encrypt password before storing (in production, use proper encryption)
    // For now, store in config but warn about security
    const encryptedPassword = Buffer.from(password).toString("base64");

    // Create data source in database
    const result = await query<{
      id: string;
      user_id: string;
      name: string;
      type: string;
      config: string;
      selected_columns: string;
      schema_info: string;
      fingerprint: string;
      status: string;
      row_count: number;
      created_at: Date;
    }>(
      `INSERT INTO data_sources (user_id, name, type, config, selected_columns, schema_info, fingerprint, status, row_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, name, type, config, selected_columns, schema_info, fingerprint, status, row_count, created_at`,
      [
        user.id,
        name || `PostgreSQL: ${database}.${tableName}`,
        "postgres",
        JSON.stringify({
          host,
          port: parseInt(port),
          database,
          username,
          password: encryptedPassword, // Base64 encoded (not secure, use proper encryption in production)
          schema,
          table_name: tableName,
        }),
        JSON.stringify(finalSelectedColumns),
        JSON.stringify(tableSchema),
        fingerprint,
        "connected",
        rowCount,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result[0],
      preview: sampleData.slice(0, 10), // Return first 10 rows as preview
    });
  } catch (error: any) {
    console.error("Error connecting PostgreSQL:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to connect to PostgreSQL database" 
      },
      { status: 500 }
    );
  }
}


