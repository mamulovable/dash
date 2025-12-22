import { NextResponse } from "next/server";
import { getOrCreateUser, resetQueryCountIfNeeded } from "@/lib/auth";
import { query } from "@/lib/db";
import { TIER_LIMITS } from "@/lib/tier-limits";

// GET /api/dashboard/stats - Get dashboard statistics
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

    // Get data source count
    const dataSourceCount = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM data_sources WHERE user_id = $1`,
      [user.id]
    );

    // Get query statistics
    const queryStats = await query<{
      total: number;
      cached: number;
      this_month: number;
      last_month: number;
    }>(
      `SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE cached = true)::int as cached,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int as this_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()) - interval '1 month' 
                         AND created_at < date_trunc('month', now()))::int as last_month
       FROM queries WHERE user_id = $1`,
      [user.id]
    );

    const stats = queryStats[0] || {
      total: 0,
      cached: 0,
      this_month: 0,
      last_month: 0,
    };

    // Calculate cache hit rate
    const cacheHitRate =
      stats.total > 0 ? Math.round((stats.cached / stats.total) * 100) : 0;

    // Calculate trend (this month vs last month)
    const trend =
      stats.last_month > 0
        ? Math.round(((stats.this_month - stats.last_month) / stats.last_month) * 100)
        : 0;

    // Get query activity chart data (last 30 days)
    const activityData = await query<{
      date: string;
      cached: number;
      api: number;
    }>(
      `SELECT 
        DATE(created_at)::text as date,
        COUNT(*) FILTER (WHERE cached = true)::int as cached,
        COUNT(*) FILTER (WHERE cached = false)::int as api
       FROM queries 
       WHERE user_id = $1 AND created_at >= now() - interval '30 days'
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [user.id]
    );

    // Format activity data for chart (ensure all dates are present)
    const formattedActivity = activityData.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      cached: item.cached,
      api: item.api,
    }));

    // Get recent queries (last 5)
    const recentQueries = await query<{
      id: string;
      prompt: string;
      data_source_name: string | null;
      data_source_type: string | null;
      created_at: Date;
    }>(
      `SELECT 
        q.id,
        q.prompt,
        ds.name as data_source_name,
        ds.type as data_source_type,
        q.created_at
       FROM queries q
       LEFT JOIN data_sources ds ON q.data_source_id = ds.id
       WHERE q.user_id = $1
       ORDER BY q.created_at DESC
       LIMIT 5`,
      [user.id]
    );

    // Get dashboard count
    const dashboardCount = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM dashboard_collections WHERE user_id = $1`,
      [user.id]
    );

    const limits = TIER_LIMITS[updatedUser.tier];

    // Calculate days until reset
    const resetDate = new Date(updatedUser.reset_date);
    const now = new Date();
    const daysUntilReset = Math.ceil(
      (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate saved cost (estimate: $0.01 per API query, cached queries are free)
    const savedCost = (stats.cached * 0.01).toFixed(2);

    return NextResponse.json({
      success: true,
      data: {
        queries: {
          used: updatedUser.queries_used,
          limit: updatedUser.queries_limit,
          progress: updatedUser.queries_limit > 0
            ? Math.round((updatedUser.queries_used / updatedUser.queries_limit) * 100)
            : 0,
          trend: trend > 0 ? `↑ ${Math.abs(trend)}% from last month` : trend < 0 ? `↓ ${Math.abs(trend)}% from last month` : "No change",
        },
        cache: {
          hitRate: cacheHitRate,
          cachedQueries: stats.cached,
          savedCost: savedCost,
        },
        dataSources: {
          count: dataSourceCount[0]?.count || 0,
          limit: limits.max_data_sources,
        },
        activity: formattedActivity,
        recentQueries: recentQueries.map((q) => ({
          id: q.id,
          query: q.prompt,
          source: q.data_source_name || q.data_source_type || "Unknown",
          timestamp: q.created_at,
        })),
        user: {
          name: updatedUser.name || "User",
          resetDate: updatedUser.reset_date,
          daysUntilReset: daysUntilReset,
        },
        dashboards: {
          count: dashboardCount[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

