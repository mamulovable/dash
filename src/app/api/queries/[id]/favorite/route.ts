import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { Query } from "@/types";

// PATCH /api/queries/[id]/favorite - Toggle favorite status
export async function PATCH(
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

    // Get current favorite status
    const currentQuery = await queryOne<Query>(
      `SELECT is_favorite FROM queries WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (!currentQuery) {
      return NextResponse.json(
        { success: false, error: "Query not found" },
        { status: 404 }
      );
    }

    // Toggle favorite status
    const newFavoriteStatus = !currentQuery.is_favorite;

    const result = await query<Query>(
      `UPDATE queries SET is_favorite = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [newFavoriteStatus, id, user.id]
    );

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}





