import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// GET /api/queries/export - Export query history as CSV
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
    const filter = searchParams.get("filter") || "all";

    // Build WHERE clause
    let whereClause = "WHERE user_id = $1";
    const params: unknown[] = [user.id];

    if (filter === "favorites") {
      whereClause += " AND is_favorite = true";
    } else if (filter === "week") {
      whereClause += " AND created_at >= now() - interval '7 days'";
    } else if (filter === "month") {
      whereClause += " AND created_at >= now() - interval '30 days'";
    }

    // Get all queries
    const queries = await query<{
      id: string;
      prompt: string;
      data_source_name: string | null;
      data_source_type: string | null;
      cached: boolean;
      created_at: Date;
    }>(
      `SELECT 
        q.id,
        q.prompt,
        ds.name as data_source_name,
        ds.type as data_source_type,
        q.cached,
        q.created_at
       FROM queries q
       LEFT JOIN data_sources ds ON q.data_source_id = ds.id
       ${whereClause}
       ORDER BY q.created_at DESC`,
      params
    );

    // Convert to CSV
    const headers = ["ID", "Query", "Data Source", "Status", "Date"];
    const rows = queries.map((q) => [
      q.id,
      `"${q.prompt.replace(/"/g, '""')}"`, // Escape quotes in CSV
      q.data_source_name || q.data_source_type || "Unknown",
      q.cached ? "Cached" : "API Call",
      new Date(q.created_at).toISOString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="queries-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting queries:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export queries" },
      { status: 500 }
    );
  }
}



