import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { generateSamplePrompts, DataSourceAnalysis } from "@/lib/gemini";
import { DataSource } from "@/types";

// GET /api/data-sources/[id]/prompts - Get sample prompts for a data source
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
    
    // Get data source
    const dsResult = await queryOne<Record<string, unknown>>(
      `SELECT * FROM data_sources WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );
    
    if (!dsResult) {
      return NextResponse.json(
        { success: false, error: "Data source not found" },
        { status: 404 }
      );
    }
    
    // Parse JSONB fields
    const dataSource = {
      ...dsResult,
      config: typeof dsResult.config === 'string' ? JSON.parse(dsResult.config) : dsResult.config,
      schema_info: typeof dsResult.schema_info === 'string' 
        ? JSON.parse(dsResult.schema_info) 
        : dsResult.schema_info,
    } as DataSource;
    
    // Get stored analysis
    const storedAnalysis = (dataSource.config as Record<string, unknown>)?.analysis as DataSourceAnalysis | null;
    
    if (!storedAnalysis) {
      // If no analysis stored, return basic prompts
      return NextResponse.json({
        success: true,
        prompts: [
          "Show me a summary of this data",
          "What are the key insights?",
          "Display the data in a table",
        ],
      });
    }
    
    // Generate sample prompts using Gemini
    try {
      const prompts = await generateSamplePrompts(storedAnalysis, dataSource.name);
      
      return NextResponse.json({
        success: true,
        prompts,
      });
    } catch (error) {
      console.error("Error generating sample prompts:", error);
      // Return fallback prompts
      return NextResponse.json({
        success: true,
        prompts: [
          "Show me a summary of this data",
          "What are the key insights?",
          "Display the data in a table",
        ],
      });
    }
  } catch (error) {
    console.error("Error fetching sample prompts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sample prompts" },
      { status: 500 }
    );
  }
}

