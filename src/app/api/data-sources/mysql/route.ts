import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import mysql from "mysql2/promise";

// POST /api/data-sources/mysql - Connect MySQL database
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
    let connection: mysql.Connection | null = null;
    let tableSchema: Record<string, string> = {};
    let sampleData: Record<string, unknown>[] = [];
    let rowCount = 0;

    try {
      connection = await mysql.createConnection({
        host,
        port: parseInt(port),
        database,
        user: username,
        password,
        ssl: false, // For development; use proper SSL in production
      });

      // Test connection
      await connection.ping();

      // Get table schema
      const [schemaRows] = await connection.execute(
        `SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
        [database, tableName]
      ) as [mysql.RowDataPacket[], unknown];

      if (schemaRows.length === 0) {
        throw new Error(`Table ${database}.${tableName} not found`);
      }

      // Build schema info
      (schemaRows as any[]).forEach((row) => {
        tableSchema[row.COLUMN_NAME] = row.DATA_TYPE;
      });

      // Get sample data (first 100 rows)
      const [sampleRows] = await connection.execute(
        `SELECT * FROM ?? LIMIT 100`,
        [tableName]
      ) as [mysql.RowDataPacket[], unknown];
      
      sampleData = sampleRows as Record<string, unknown>[];

      // Get row count
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as count FROM ??`,
        [tableName]
      ) as [mysql.RowDataPacket[], unknown];
      
      rowCount = parseInt((countRows as any[])[0].count);

    } finally {
      if (connection) {
        await connection.end();
      }
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
        name || `MySQL: ${database}.${tableName}`,
        "mysql",
        JSON.stringify({
          host,
          port: parseInt(port),
          database,
          username,
          password: encryptedPassword, // Base64 encoded (not secure, use proper encryption in production)
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
    console.error("Error connecting MySQL:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to connect to MySQL database" 
      },
      { status: 500 }
    );
  }
}


