import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// GET /api/teams - Get user's team
export async function GET() {
  try {
    const user = await getOrCreateUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is a team member
    const teamMember = await queryOne<{
      team_id: string;
      role: string;
    }>(
      `SELECT team_id, role FROM team_members WHERE user_id = $1`,
      [user.id]
    );

    if (!teamMember) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "User is not part of any team",
      });
    }

    // Get team details
    const team = await queryOne<{
      id: string;
      name: string;
      tier: string;
      owner_id: string;
      created_at: Date;
    }>(
      `SELECT * FROM teams WHERE id = $1`,
      [teamMember.team_id]
    );

    if (!team) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Team not found",
      });
    }

    // Get team members
    const members = await query<{
      id: string;
      user_id: string;
      role: string;
      user_name: string | null;
      user_email: string | null;
      created_at: Date;
    }>(
      `SELECT 
        tm.id,
        tm.user_id,
        tm.role,
        u.name as user_name,
        u.email as user_email,
        tm.created_at
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.created_at ASC`,
      [team.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...team,
        members: members.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          name: m.user_name,
          email: m.user_email,
          joined_at: m.created_at,
        })),
        userRole: teamMember.role,
      },
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create team
export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user already has a team
    const existingMember = await queryOne<{ team_id: string }>(
      `SELECT team_id FROM team_members WHERE user_id = $1`,
      [user.id]
    );

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "User is already part of a team" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Team name is required" },
        { status: 400 }
      );
    }

    // Create team
    const team = await query<{
      id: string;
      name: string;
      tier: string;
      owner_id: string;
      created_at: Date;
    }>(
      `INSERT INTO teams (name, tier, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, user.tier, user.id]
    );

    // Add creator as admin
    await query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [team[0].id, user.id, "admin"]
    );

    return NextResponse.json({
      success: true,
      data: team[0],
    });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create team" },
      { status: 500 }
    );
  }
}





