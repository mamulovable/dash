import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export async function GET() {
  try {
    // Check database connection
    const sql = getSql();
    const dbResult = await sql`SELECT 1 as ok` as Array<{ ok: number }>;
    const dbOk = dbResult[0]?.ok === 1;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? "connected" : "error",
        thesys: process.env.THESYS_API_KEY ? "configured" : "missing",
        clerk: process.env.CLERK_SECRET_KEY ? "configured" : "missing",
        gemini: process.env.GEMINI_API_KEY ? "configured" : "missing",
        redis: process.env.UPSTASH_REDIS_URL ? "configured" : "missing",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}






