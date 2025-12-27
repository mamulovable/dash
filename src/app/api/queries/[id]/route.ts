import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { Query } from "@/types";

// GET /api/queries/[id] - Get single query
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
    
    const queryResult = await queryOne<Query & { data_source_name?: string }>(
      `SELECT q.*, ds.name as data_source_name
       FROM queries q
       LEFT JOIN data_sources ds ON q.data_source_id = ds.id
       WHERE q.id = $1 AND q.user_id = $2`,
      [id, user.id]
    );
    
    if (!queryResult) {
      return NextResponse.json(
        { success: false, error: "Query not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: queryResult,
    });
  } catch (error) {
    console.error("Error fetching query:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch query" },
      { status: 500 }
    );
  }
}

// PUT /api/queries/[id] - Update query (toggle favorite)
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
    const { is_favorite } = body;
    
    const result = await query<Query>(
      `UPDATE queries SET is_favorite = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [is_favorite, id, user.id]
    );
    
    if (!result.length) {
      return NextResponse.json(
        { success: false, error: "Query not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error updating query:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update query" },
      { status: 500 }
    );
  }
}

// DELETE /api/queries/[id] - Delete query
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
      `DELETE FROM queries WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user.id]
    );
    
    if (!result.length) {
      return NextResponse.json(
        { success: false, error: "Query not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Query deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting query:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete query" },
      { status: 500 }
    );
  }
}









