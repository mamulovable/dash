import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { analyzeDataSource } from "@/lib/gemini";

// POST /api/data-sources/api - Connect REST API
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
    const { 
      url,
      method = "GET",
      headers = {},
      authType = "none",
      authConfig = {},
      name,
      selectedColumns 
    } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "API URL is required" },
        { status: 400 }
      );
    }

    // Test API connection
    let responseData: unknown = null;
    const tableSchema: Record<string, string> = {};
    let sampleData: Record<string, unknown>[] = [];
    let rowCount = 0;

    try {
      // Build request headers
      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...headers,
      };

      // Add authentication headers
      if (authType === "bearer" && authConfig.token) {
        requestHeaders["Authorization"] = `Bearer ${authConfig.token}`;
      } else if (authType === "basic" && authConfig.username && authConfig.password) {
        const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString("base64");
        requestHeaders["Authorization"] = `Basic ${credentials}`;
      } else if (authType === "api_key" && authConfig.key && authConfig.value) {
        if (authConfig.location === "header") {
          requestHeaders[authConfig.key] = authConfig.value;
        }
      }

      // Make test request
      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };
      
      // Only add body for POST/PUT/PATCH if provided
      if (method !== "GET" && body.requestBody) {
        fetchOptions.body = JSON.stringify(body.requestBody);
      }
      
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      // Try to parse as JSON, fallback to text if not JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        // If not JSON, try to parse as text and create a simple object
        const textData = await response.text();
        try {
          responseData = JSON.parse(textData);
        } catch {
          // If parsing fails, create a simple response object
          responseData = { data: textData, message: "Response is not JSON" };
        }
      }

      // Handle different response formats
      if (Array.isArray(responseData)) {
        sampleData = responseData as Record<string, unknown>[];
      } else if (responseData && typeof responseData === "object") {
        // Try to find data array in common patterns
        const responseObj = responseData as Record<string, unknown>;
        const data = (responseObj.data || responseObj.results || responseObj.items || []) as unknown[];
        if (Array.isArray(data)) {
          sampleData = data as Record<string, unknown>[];
        } else {
          // Single object, wrap in array
          sampleData = [responseData as Record<string, unknown>];
        }
      }

      rowCount = sampleData.length;

      // Generate schema from first item
      if (sampleData.length > 0) {
        const sample = sampleData[0];
        for (const [key, value] of Object.entries(sample)) {
          if (typeof value === "number") {
            tableSchema[key] = Number.isInteger(value) ? "integer" : "decimal";
          } else if (typeof value === "boolean") {
            tableSchema[key] = "boolean";
          } else if (typeof value === "string") {
            if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
              tableSchema[key] = "date";
            } else {
              tableSchema[key] = "text";
            }
          } else if (value === null) {
            tableSchema[key] = "null";
          } else {
            tableSchema[key] = "unknown";
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to API";
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage
        },
        { status: 400 }
      );
    }

    // Parse selected columns
    let finalSelectedColumns: string[] = [];
    if (selectedColumns && Array.isArray(selectedColumns)) {
      finalSelectedColumns = selectedColumns;
    } else if (selectedColumns) {
      try {
        finalSelectedColumns = typeof selectedColumns === "string" 
          ? JSON.parse(selectedColumns) 
          : [];
      } catch {
        // Auto-select all columns if parsing fails
        finalSelectedColumns = Object.keys(tableSchema);
      }
    } else {
      // Auto-select all columns
      finalSelectedColumns = Object.keys(tableSchema);
    }

    // Limit columns based on tier
    const { TIER_LIMITS } = await import("@/lib/tier-limits");
    const userTier = user.tier as keyof typeof TIER_LIMITS;
    const maxColumns = TIER_LIMITS[userTier]?.max_columns || 10;
    finalSelectedColumns = finalSelectedColumns.slice(0, maxColumns);

    // Use Gemini to analyze the data source
    let dataSourceAnalysis = null;
    if (sampleData.length > 0 && process.env.GEMINI_API_KEY) {
      try {
        console.log("Analyzing data source with Gemini...");
        dataSourceAnalysis = await analyzeDataSource(
          sampleData,
          tableSchema,
          name || `REST API: ${new URL(url).hostname}`
        );
        console.log("Gemini analysis completed:", {
          keyColumns: dataSourceAnalysis.keyColumns.length,
          dataType: dataSourceAnalysis.dataType,
          insights: dataSourceAnalysis.insights.length,
        });
        
        // Use Gemini's recommended key columns if available and within tier limits
        if (dataSourceAnalysis.keyColumns.length > 0) {
          const recommendedColumns = dataSourceAnalysis.keyColumns
            .filter((col: string) => Object.keys(tableSchema).includes(col))
            .slice(0, maxColumns);
          
          if (recommendedColumns.length > 0) {
            finalSelectedColumns = recommendedColumns;
          }
        }
      } catch (error) {
        console.error("Error analyzing data source with Gemini:", error);
        // Continue without analysis if Gemini fails
      }
    }

    // Generate fingerprint
    const fingerprint = uuidv4();

    // Encrypt sensitive auth config (in production, use proper encryption)
    const encryptedAuthConfig = { ...authConfig };
    if (authConfig.password) {
      encryptedAuthConfig.password = Buffer.from(authConfig.password).toString("base64");
    }
    if (authConfig.token) {
      encryptedAuthConfig.token = Buffer.from(authConfig.token).toString("base64");
    }

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
        name || `REST API: ${new URL(url).hostname}`,
        "api",
        JSON.stringify({
          url,
          method,
          headers,
          auth_type: authType,
          auth_config: encryptedAuthConfig,
          // Store Gemini analysis in config
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
        JSON.stringify(tableSchema),
        fingerprint,
        "connected",
        rowCount,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result[0],
      preview: sampleData.slice(0, 10), // Return first 10 rows as preview
    });
  } catch (error) {
    console.error("Error connecting REST API:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to connect to REST API";
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

