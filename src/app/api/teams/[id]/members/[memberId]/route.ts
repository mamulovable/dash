import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

// DELETE /api/teams/[id]/members/[memberId] - Remove member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await getOrCreateUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id, memberId } = await params;

    // Verify user is admin of team
    const member = await queryOne<{ role: string }>(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (!member || member.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can remove members" },
        { status: 403 }
      );
    }

    // Get member to remove
    const memberToRemove = await queryOne<{ user_id: string; role: string }>(
      `SELECT user_id, role FROM team_members WHERE id = $1 AND team_id = $2`,
      [memberId, id]
    );

    if (!memberToRemove) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent removing the owner
    const team = await queryOne<{ owner_id: string }>(
      `SELECT owner_id FROM teams WHERE id = $1`,
      [id]
    );

    if (team && team.owner_id === memberToRemove.user_id) {
      return NextResponse.json(
        { success: false, error: "Cannot remove team owner" },
        { status: 400 }
      );
    }

    // Remove member
    await query(
      `DELETE FROM team_members WHERE id = $1 AND team_id = $2`,
      [memberId, id]
    );

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove member" },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[id]/members/[memberId] - Update member role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await getOrCreateUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id, memberId } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role || !["admin", "member"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
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
        { success: false, error: "Only admins can update member roles" },
        { status: 403 }
      );
    }

    // Update role
    const result = await query<{
      id: string;
      role: string;
    }>(
      `UPDATE team_members SET role = $1
       WHERE id = $2 AND team_id = $3
       RETURNING id, role`,
      [role, memberId, id]
    );

    if (!result.length) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update member role" },
      { status: 500 }
    );
  }
}



