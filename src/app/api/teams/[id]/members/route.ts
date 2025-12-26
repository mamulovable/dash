import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// GET /api/teams/[id]/members - Get team members
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

    // Verify user is member of team
    const member = await queryOne<{ role: string }>(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Not a team member" },
        { status: 403 }
      );
    }

    // Get all team members
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
      [id]
    );

    return NextResponse.json({
      success: true,
      data: members.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        name: m.user_name,
        email: m.user_email,
        joined_at: m.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST /api/teams/[id]/members - Invite/add member
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
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Verify user is admin of team
    const member = await queryOne<{ role: string }>(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (!member || member.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can invite members" },
        { status: 403 }
      );
    }

    // Find user by email
    const targetUser = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await queryOne<{ id: string }>(
      `SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [id, targetUser.id]
    );

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "User is already a team member" },
        { status: 400 }
      );
    }

    // Add member
    const result = await query<{
      id: string;
      team_id: string;
      user_id: string;
      role: string;
      created_at: Date;
    }>(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, targetUser.id, "member"]
    );

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error adding team member:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add team member" },
      { status: 500 }
    );
  }
}





