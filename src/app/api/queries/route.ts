import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { Query } from "@/types";

// GET /api/queries - List query history
export async function GET(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("per_page") || "20");
    const filter = searchParams.get("filter") || "all"; // all, favorites, week, month
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sort") || "recent"; // recent, oldest
    
    const offset = (page - 1) * perPage;
    
    // Build WHERE clause
    let whereClause = "WHERE user_id = $1";
    const params: unknown[] = [user.id];
    let paramIndex = 2;
    
    if (filter === "favorites") {
      whereClause += " AND is_favorite = true";
    } else if (filter === "week") {
      whereClause += " AND created_at >= now() - interval '7 days'";
    } else if (filter === "month") {
      whereClause += " AND created_at >= now() - interval '30 days'";
    }
    
    if (search) {
      whereClause += ` AND prompt ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }
    
    // Order clause
    const orderClause =
      sortBy === "oldest" ? "ORDER BY created_at ASC" : "ORDER BY created_at DESC";
    
    // Get total count
    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM queries ${whereClause}`,
      params
    );
    const total = countResult[0]?.count || 0;
    
    // Get queries with data source info
    params.push(perPage);
    params.push(offset);
    
    const queries = await query<Query & { data_source_name?: string; data_source_type?: string }>(
      `SELECT q.*, ds.name as data_source_name, ds.type as data_source_type
       FROM queries q
       LEFT JOIN data_sources ds ON q.data_source_id = ds.id
       ${whereClause}
       ${orderClause}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );
    
    return NextResponse.json({
      success: true,
      data: queries,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error("Error fetching queries:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch queries" },
      { status: 500 }
    );
  }
}









