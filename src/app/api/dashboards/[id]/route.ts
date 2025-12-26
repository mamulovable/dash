import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// GET /api/dashboards/[id] - Get dashboard details
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

    const dashboard = await queryOne<{
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
      `SELECT * FROM dashboard_collections WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: "Dashboard not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...dashboard,
        queries: typeof dashboard.queries === "string" ? JSON.parse(dashboard.queries) : dashboard.queries,
        layout: typeof dashboard.layout === "string" ? JSON.parse(dashboard.layout) : dashboard.layout,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}

// PUT /api/dashboards/[id] - Update dashboard
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
    const { name, description, queries, layout, is_public } = body;

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
      `UPDATE dashboard_collections
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           queries = COALESCE($3::jsonb, queries),
           layout = COALESCE($4::jsonb, layout),
           is_public = COALESCE($5, is_public),
           updated_at = now()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        name,
        description,
        queries ? JSON.stringify(queries) : null,
        layout ? JSON.stringify(layout) : null,
        is_public,
        id,
        user.id,
      ]
    );

    if (!result.length) {
      return NextResponse.json(
        { success: false, error: "Dashboard not found" },
        { status: 404 }
      );
    }

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
    console.error("Error updating dashboard:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update dashboard" },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboards/[id] - Delete dashboard
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
      `DELETE FROM dashboard_collections WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user.id]
    );

    if (!result.length) {
      return NextResponse.json(
        { success: false, error: "Dashboard not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Dashboard deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting dashboard:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete dashboard" },
      { status: 500 }
    );
  }
}





