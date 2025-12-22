import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { canAddDataSource, TIER_LIMITS } from "@/lib/tier-limits";
import { DataSource } from "@/types";
import { v4 as uuidv4 } from "uuid";

// GET /api/data-sources - List user's data sources
export async function GET() {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const dataSources = await query<Record<string, unknown>>(
      `SELECT * FROM data_sources WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );
    
    // Parse JSONB fields (they might come as strings from Neon)
    const parsedDataSources = dataSources.map((ds: Record<string, unknown>) => ({
      ...ds,
      config: typeof ds.config === 'string' ? JSON.parse(ds.config) : ds.config,
      selected_columns: typeof ds.selected_columns === 'string' 
        ? JSON.parse(ds.selected_columns) 
        : ds.selected_columns,
      schema_info: typeof ds.schema_info === 'string' 
        ? JSON.parse(ds.schema_info) 
        : ds.schema_info,
    }));
    
    const limits = TIER_LIMITS[user.tier];
    
    return NextResponse.json({
      success: true,
      data: parsedDataSources,
      meta: {
        count: parsedDataSources.length,
        limit: limits.max_data_sources,
        can_add: canAddDataSource(user.tier, parsedDataSources.length),
      },
    });
  } catch (error) {
    console.error("Error fetching data sources:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data sources" },
      { status: 500 }
    );
  }
}

// POST /api/data-sources - Create new data source
export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check data source limit
    const existingCount = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM data_sources WHERE user_id = $1`,
      [user.id]
    );
    
    if (!canAddDataSource(user.tier, existingCount?.count || 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "Data source limit reached",
          upgrade_message: `Upgrade to ${user.tier === "starter" ? "Pro" : "Agency"} for more data sources`,
        },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { name, type, config, selected_columns, schema_info } = body;
    
    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: "Name and type are required" },
        { status: 400 }
      );
    }
    
    // Validate column limit
    const limits = TIER_LIMITS[user.tier];
    if (selected_columns && selected_columns.length > limits.max_columns) {
      return NextResponse.json(
        {
          success: false,
          error: `Column limit exceeded. Max ${limits.max_columns} columns allowed.`,
        },
        { status: 400 }
      );
    }
    
    // Generate fingerprint for caching
    const fingerprint = uuidv4();
    
    const result = await query<DataSource>(
      `INSERT INTO data_sources (user_id, name, type, config, selected_columns, schema_info, fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user.id,
        name,
        type,
        JSON.stringify(config || {}),
        JSON.stringify(selected_columns || []),
        JSON.stringify(schema_info || {}),
        fingerprint,
      ]
    );
    
    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error creating data source:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create data source" },
      { status: 500 }
    );
  }
}



