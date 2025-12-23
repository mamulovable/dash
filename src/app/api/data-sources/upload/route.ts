import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import Papa from "papaparse";
import { generateSchemaFromData, analyzeDataSource } from "@/lib/gemini";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// POST /api/data-sources/upload - Upload and parse CSV
export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const selectedColumns = formData.get("selectedColumns") as string | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }
    
    // Check file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { success: false, error: "Only CSV files are supported" },
        { status: 400 }
      );
    }
    
    // Parse CSV
    const text = await file.text();
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse CSV",
          details: parseResult.errors.slice(0, 5),
        },
        { status: 400 }
      );
    }
    
    const data = parseResult.data as Record<string, unknown>[];
    const columns = parseResult.meta.fields || [];
    
    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: "CSV file is empty" },
        { status: 400 }
      );
    }
    
    // Generate schema from data
    const schema = await generateSchemaFromData(data);
    
    // Parse selected columns if provided (for final connection)
    let finalSelectedColumns: string[] = [];
    if (selectedColumns) {
      try {
        finalSelectedColumns = JSON.parse(selectedColumns);
      } catch {
        // If not provided, auto-select important columns
        finalSelectedColumns = columns.filter((col) => {
          const type = schema[col];
          return type === "date" || type === "number" || type === "integer" || col.toLowerCase().includes("id");
        }).slice(0, 10);
      }
    } else {
      // Auto-select important columns
      finalSelectedColumns = columns.filter((col) => {
        const type = schema[col];
        return type === "date" || type === "number" || type === "integer" || col.toLowerCase().includes("id");
      }).slice(0, 10);
    }
    
    // If this is a preview request (no name), just return preview data
    if (!name) {
      const preview = data.slice(0, 10);
      return NextResponse.json({
        success: true,
        preview: true,
        data: {
          file_name: file.name,
          row_count: data.length,
          columns: columns.map((col) => ({
            name: col,
            type: schema[col] || "unknown",
          })),
          schema,
          preview,
        },
      });
    }
    
    // This is a final connection request - create data source
    // On Vercel, we can't write to filesystem, so store CSV data in database
    const fileId = uuidv4();
    
    // Store CSV content as base64 for retrieval later
    const csvContent = await file.text();
    const csvBase64 = Buffer.from(csvContent).toString("base64");
    
    // Use Gemini to analyze the data source (same as API route)
    let dataSourceAnalysis = null;
    if (data.length > 0 && process.env.GEMINI_API_KEY) {
      try {
        console.log("Analyzing CSV data source with Gemini...");
        dataSourceAnalysis = await analyzeDataSource(
          data,
          schema,
          name || file.name.replace(".csv", "")
        );
        console.log("Gemini analysis completed:", {
          keyColumns: dataSourceAnalysis.keyColumns.length,
          dataType: dataSourceAnalysis.dataType,
          insights: dataSourceAnalysis.insights.length,
        });
        
        // Use Gemini's recommended key columns if available and within tier limits
        const { TIER_LIMITS } = await import("@/lib/tier-limits");
        const userTier = user.tier as keyof typeof TIER_LIMITS;
        const maxColumns = TIER_LIMITS[userTier]?.max_columns || 10;
        
        if (dataSourceAnalysis.keyColumns.length > 0) {
          const recommendedColumns = dataSourceAnalysis.keyColumns
            .filter((col: string) => columns.includes(col))
            .slice(0, maxColumns);
          
          if (recommendedColumns.length > 0) {
            finalSelectedColumns = recommendedColumns;
          }
        }
      } catch (error) {
        console.error("Error analyzing CSV data source with Gemini:", error);
        // Continue without analysis if Gemini fails
      }
    }
    
    // Generate fingerprint for caching
    const fingerprint = uuidv4();
    
    // Create data source in database
    const result = await query<{
      id: string;
      user_id: string;
      name: string;
      type: string;
      config: string;
      selected_columns: string;
      schema_info: string;
      fingerprint: string;
      status: string;
      row_count: number;
      created_at: Date;
    }>(
      `INSERT INTO data_sources (user_id, name, type, config, selected_columns, schema_info, fingerprint, status, row_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, name, type, config, selected_columns, schema_info, fingerprint, status, row_count, created_at`,
      [
        user.id,
        name || file.name.replace(".csv", ""),
        "csv",
        JSON.stringify({
          file_name: file.name,
          file_id: fileId,
          csv_content: csvBase64, // Store CSV content as base64
          // Store Gemini analysis in config (same as API route)
          analysis: dataSourceAnalysis ? {
            keyColumns: dataSourceAnalysis.keyColumns,
            dataType: dataSourceAnalysis.dataType,
            recommendedVisualizations: dataSourceAnalysis.recommendedVisualizations,
            insights: dataSourceAnalysis.insights,
            summary: dataSourceAnalysis.summary,
            hasTimeDimension: dataSourceAnalysis.hasTimeDimension,
            timeColumn: dataSourceAnalysis.timeColumn,
            numericColumns: dataSourceAnalysis.numericColumns,
            categoricalColumns: dataSourceAnalysis.categoricalColumns,
          } : null,
        }),
        JSON.stringify(finalSelectedColumns),
        JSON.stringify(schema),
        fingerprint,
        "connected",
        data.length,
      ]
    );
    
    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process file" },
      { status: 500 }
    );
  }
}



