import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { TIER_LIMITS } from "@/lib/tier-limits";
import { DataSource } from "@/types";

// GET /api/data-sources/[id] - Get single data source
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    const dataSource = await queryOne<DataSource>(
      `SELECT * FROM data_sources WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );
    
    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: "Data source not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: dataSource,
    });
  } catch (error) {
    console.error("Error fetching data source:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data source" },
      { status: 500 }
    );
  }
}

// PUT /api/data-sources/[id] - Update data source
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const body = await req.json();
    const { name, config, selected_columns, schema_info, status } = body;
    
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
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(config));
    }
    if (selected_columns !== undefined) {
      updates.push(`selected_columns = $${paramIndex++}`);
      values.push(JSON.stringify(selected_columns));
    }
    if (schema_info !== undefined) {
      updates.push(`schema_info = $${paramIndex++}`);
      values.push(JSON.stringify(schema_info));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    
    updates.push(`updated_at = now()`);
    
    values.push(id);
    values.push(user.id);
    
    const result = await query<DataSource>(
      `UPDATE data_sources SET ${updates.join(", ")}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (!result.length) {
      return NextResponse.json(
        { success: false, error: "Data source not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error updating data source:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update data source" },
      { status: 500 }
    );
  }
}

// DELETE /api/data-sources/[id] - Delete data source
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    const result = await query(
      `DELETE FROM data_sources WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user.id]
    );
    
    if (!result.length) {
      return NextResponse.json(
        { success: false, error: "Data source not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Data source deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting data source:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete data source" },
      { status: 500 }
    );
  }
}









