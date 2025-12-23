import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// GET /api/dashboards - List user's dashboards
export async function GET() {
  try {
    const user = await getOrCreateUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const dashboards = await query<{
      id: string;
      user_id: string;
      name: string;
      description: string | null;
      queries: string;
      layout: string;
      is_public: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM dashboard_collections WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );

    // Parse JSONB fields
    const parsedDashboards = dashboards.map((db) => ({
      ...db,
      queries: typeof db.queries === "string" ? JSON.parse(db.queries) : db.queries,
      layout: typeof db.layout === "string" ? JSON.parse(db.layout) : db.layout,
    }));

    return NextResponse.json({
      success: true,
      data: parsedDashboards,
    });
  } catch (error) {
    console.error("Error fetching dashboards:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboards" },
      { status: 500 }
    );
  }
}

// POST /api/dashboards - Create new dashboard
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
    const { name, description, queries = [], layout = {} } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Dashboard name is required" },
        { status: 400 }
      );
    }

    const result = await query<{
      id: string;
      user_id: string;
      name: string;
      description: string | null;
      queries: string;
      layout: string;
      is_public: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO dashboard_collections (user_id, name, description, queries, layout)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.id, name, description || null, JSON.stringify(queries), JSON.stringify(layout)]
    );

    const dashboard = result[0];
    return NextResponse.json({
      success: true,
      data: {
        ...dashboard,
        queries: typeof dashboard.queries === "string" ? JSON.parse(dashboard.queries) : dashboard.queries,
        layout: typeof dashboard.layout === "string" ? JSON.parse(dashboard.layout) : dashboard.layout,
      },
    });
  } catch (error) {
    console.error("Error creating dashboard:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create dashboard" },
      { status: 500 }
    );
  }
}




