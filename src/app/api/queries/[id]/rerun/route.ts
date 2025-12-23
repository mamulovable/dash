import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { Query } from "@/types";

// POST /api/queries/[id]/rerun - Re-run a query
export async function POST(
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

    // Get original query
    const originalQuery = await queryOne<Query>(
      `SELECT * FROM queries WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (!originalQuery) {
      return NextResponse.json(
        { success: false, error: "Query not found" },
        { status: 404 }
      );
    }

    // Return the data source ID and prompt for the frontend to handle
    return NextResponse.json({
      success: true,
      dataSourceId: originalQuery.data_source_id,
      prompt: originalQuery.prompt,
    });
  } catch (error) {
    console.error("Error re-running query:", error);
    return NextResponse.json(
      { success: false, error: "Failed to re-run query" },
      { status: 500 }
    );
  }
}




