import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getOrCreateUser, resetQueryCountIfNeeded } from "@/lib/auth";
import { TIER_LIMITS, getRemainingQueries, getQueryStatus } from "@/lib/tier-limits";

// GET /api/users - Get current user profile and usage
export async function GET() {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Reset query count if needed (monthly reset)
    await resetQueryCountIfNeeded(user.id);
    
    // Get updated user data
    const updatedUser = await getOrCreateUser();
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    
    // Get usage statistics
    const dataSourceCount = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM data_sources WHERE user_id = $1`,
      [user.id]
    );
    
    const queryStats = await query<{
      total: number;
      cached: number;
      this_month: number;
    }>(
      `SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE cached = true)::int as cached,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int as this_month
       FROM queries WHERE user_id = $1`,
      [user.id]
    );
    
    // Get query pack balance
    const queryPackBalance = await query<{ total: number }>(
      `SELECT COALESCE(SUM(queries_remaining), 0)::int as total 
       FROM query_packs WHERE user_id = $1`,
      [user.id]
    );
    
    const limits = TIER_LIMITS[updatedUser.tier];
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar_url: updatedUser.avatar_url,
          tier: updatedUser.tier,
        },
        usage: {
          queries_used: updatedUser.queries_used,
          queries_limit: updatedUser.queries_limit,
          queries_remaining: getRemainingQueries(updatedUser),
          query_status: getQueryStatus(updatedUser),
          reset_date: updatedUser.reset_date,
          data_sources: dataSourceCount[0]?.count || 0,
          data_sources_limit: limits.max_data_sources,
          query_pack_balance: queryPackBalance[0]?.total || 0,
        },
        stats: {
          total_queries: queryStats[0]?.total || 0,
          cached_queries: queryStats[0]?.cached || 0,
          cache_hit_rate:
            queryStats[0]?.total > 0
              ? Math.round((queryStats[0].cached / queryStats[0].total) * 100)
              : 0,
          queries_this_month: queryStats[0]?.this_month || 0,
        },
        limits,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}

// PUT /api/users - Update user profile
export async function PUT(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { name, avatar_url } = body;
    
    const result = await query(
      `UPDATE users SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url), updated_at = now()
       WHERE id = $3 RETURNING *`,
      [name, avatar_url, user.id]
    );
    
    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}






