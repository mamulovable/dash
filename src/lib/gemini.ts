import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

export interface DataQueryResult {
  sql?: string;
  data: Record<string, unknown>[];
  visualization: "bar" | "line" | "pie" | "table" | "kpi" | "mixed";
  insights: string[];
  summary: string;
  // New fields for minimal UI generation
  requiredColumns?: string[]; // Only columns needed for this specific query
  aggregationType?: "sum" | "count" | "avg" | "max" | "min" | "group" | "none";
  groupByColumns?: string[]; // Columns to group by (e.g., plan_type)
  chartConfig?: {
    xAxis?: string;
    yAxis?: string;
    series?: string[];
    categories?: string[];
  };
}

export interface QueryExplanation {
  explanation: string; // Human-readable explanation of what the query does
  dataSummary: string; // Brief summary of the data being shown
  interpretation: string; // What the results mean
}

/**
 * Analyzes user query and extracts ONLY the minimal data structure needed for UI generation.
 * This is optimized to send minimal information to Thesys C1 for generative UI.
 */
export async function processDataQuery(
  schema: Record<string, unknown>,
  prompt: string,
  sampleData: Record<string, unknown>[],
  dataSourceAnalysis?: DataSourceAnalysis
): Promise<DataQueryResult> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const userPrompt = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  
  // Build context about available columns - use ALL columns, not just key columns
  const allColumns = Object.keys(schema);
  const keyColumns = dataSourceAnalysis?.keyColumns || allColumns;
  const numericColumns = dataSourceAnalysis?.numericColumns || [];
  const categoricalColumns = dataSourceAnalysis?.categoricalColumns || [];

  // Include actual sample data in the prompt if available
  // Use more data (up to 100 rows) to give Gemini better context
  const maxSampleRows = Math.min(sampleData.length, 100);
  const sampleDataSection = sampleData.length > 0
    ? `\n\nActual sample data from the data source (${maxSampleRows} rows out of ${sampleData.length} total):
${JSON.stringify(sampleData.slice(0, maxSampleRows), null, 2)}

Use this ACTUAL data to generate your response. Process and aggregate the real data based on the user's query. If the user asks for specific values, calculations, or aggregations, use the real data from above.`
    : `\n\nNote: No sample data provided. Generate realistic data based on the schema.`;

  const systemPrompt = `You are a business intelligence data analyst assistant. Your job is to process REAL data from the selected data source and generate visualizations.

Given this data schema (ALL ${allColumns.length} columns available):
${JSON.stringify(schema, null, 2)}

All available columns: ${allColumns.join(", ")}
Key columns: ${keyColumns.join(", ")}
Numeric columns: ${numericColumns.join(", ") || "None"}
Categorical columns: ${categoricalColumns.join(", ") || "None"}${sampleDataSection}

User query: "${userPrompt}"

CRITICAL INSTRUCTIONS:
- You have access to ALL ${allColumns.length} columns from the data source
- The user selected this specific data source, so use ALL its data
- If sample data is provided above, PROCESS THE ACTUAL DATA VALUES
- Perform real aggregations, calculations, and filtering on the actual data
- Do NOT generate fake or mock data - use the real data provided
- If the query asks for "total customers by plan type", actually count/group the real data
- If the query asks for "top 10", actually sort and get the top 10 from real data

Analyze the query and determine:
1. What specific columns are needed (can be ANY columns from the ${allColumns.length} available)
2. What aggregation/grouping is needed (e.g., count by plan_type, sum by category)
3. What visualization type is best suited
4. Process the ACTUAL data and return results (max 50 rows for display, but process all available data)

IMPORTANT: 
- Process the REAL data provided above
- Perform actual calculations, aggregations, and filtering
- Return results based on the actual data, not mock data

Respond with a JSON object containing:
1. "requiredColumns": Array of ONLY the column names needed for this query (e.g., ["plan_type", "customer_count"])
2. "aggregationType": One of "sum", "count", "avg", "max", "min", "group", or "none"
3. "groupByColumns": Array of columns to group by (e.g., ["plan_type"] for grouping by plan type)
4. "data": MINIMAL array of objects with ONLY the required columns. If grouping is needed, show aggregated results (e.g., [{"plan_type": "Basic", "total_customers": 150}, {"plan_type": "Pro", "total_customers": 89}])
5. "visualization": Best visualization type ("bar", "line", "pie", "table", "kpi", or "mixed")
6. "chartConfig": Object with chart configuration:
   - "xAxis": Column name for X-axis (if applicable)
   - "yAxis": Column name for Y-axis (if applicable)
   - "series": Array of column names for series (if applicable)
   - "categories": Array of category values (if applicable)
7. "insights": Array of 2-3 key insights as strings
8. "summary": One sentence summary of what data is being shown

IMPORTANT: 
- Return ONLY the columns mentioned in the query or required for the visualization
- Keep data minimal (max 50 rows, ideally 10-20 for charts)
- If the query asks for "total customers by plan type", return data like [{"plan_type": "Basic", "total": 150}, {"plan_type": "Pro", "total": 89}]
- Return ONLY valid JSON, no markdown formatting.`;

  try {
    // Use generation config for faster responses
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for faster, more deterministic responses
        maxOutputTokens: 2000, // Limit output for faster responses
      },
    });
    const responseText = result.response.text();
    
    // Clean up response (remove markdown code blocks if present)
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const parsed = JSON.parse(cleanedResponse) as DataQueryResult;
    
    // Ensure data is minimal - limit to 50 rows max
    if (parsed.data && parsed.data.length > 50) {
      parsed.data = parsed.data.slice(0, 50);
    }
    
    return parsed;
  } catch (error) {
    console.error("Gemini processing error:", error);
    // Return a default response on error
    return {
      data: [],
      visualization: "table",
      insights: ["Unable to process query"],
      summary: "Error processing your request",
      requiredColumns: [],
      aggregationType: "none",
    };
  }
}

/**
 * Generates a human-readable explanation of the query using a lighter Gemini model.
 * This provides context and interpretation separate from the UI generation.
 */
export async function generateQueryExplanation(
  userQuery: string,
  dataSourceName: string,
  queryResult: DataQueryResult
): Promise<QueryExplanation> {
  const client = getGeminiClient();
  // Use flash-lite for faster, cheaper explanations
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `You are a helpful data analyst assistant. Explain this data query in a clear, concise way.

User asked: "${userQuery}"
Data source: ${dataSourceName}

Query results summary:
- Visualization: ${queryResult.visualization}
- Data points: ${queryResult.data.length} rows
- Key insights: ${queryResult.insights.join("; ")}

Provide a JSON response with:
1. "explanation": A clear 2-3 sentence explanation of what the user asked for and what data is being shown
2. "dataSummary": A brief one-sentence summary of the data (e.g., "Showing total customers grouped by plan type")
3. "interpretation": A 1-2 sentence interpretation of what the results mean or what patterns are visible

Keep responses concise and user-friendly. Return ONLY valid JSON, no markdown formatting.`;

  try {
    // Use generation config for faster responses with flash-lite
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2, // Lower temperature for faster responses
        maxOutputTokens: 500, // Keep explanations short and fast
      },
    });
    const responseText = result.response.text();
    
    // Clean up response
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    return JSON.parse(cleanedResponse) as QueryExplanation;
  } catch (error) {
    console.error("Gemini explanation error:", error);
    // Return a default explanation
    return {
      explanation: `This query analyzes ${dataSourceName} data to show ${queryResult.visualization} visualization.`,
      dataSummary: `Displaying ${queryResult.data.length} data points.`,
      interpretation: queryResult.summary || "Data visualization ready for display.",
    };
  }
}

export interface DataSourceAnalysis {
  schema: Record<string, string>;
  keyColumns: string[]; // Most important columns for visualization
  dataType: "tabular" | "time-series" | "categorical" | "mixed";
  recommendedVisualizations: ("bar" | "line" | "pie" | "table" | "kpi" | "mixed")[];
  insights: string[]; // Key insights about the data structure
  summary: string; // Brief description of the data source
  sampleSize: number;
  hasTimeDimension: boolean;
  timeColumn?: string;
  numericColumns: string[];
  categoricalColumns: string[];
}

export async function analyzeDataSource(
  sampleData: Record<string, unknown>[],
  schema: Record<string, string>,
  dataSourceName?: string
): Promise<DataSourceAnalysis> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  // Limit sample data to first 20 rows for analysis
  const limitedSample = sampleData.slice(0, 20);

  const systemPrompt = `You are a data analyst expert. Analyze this data source and provide a comprehensive analysis.

Data Source Name: ${dataSourceName || "Unknown"}

Schema (column types):
${JSON.stringify(schema, null, 2)}

Sample Data (first ${limitedSample.length} rows):
${JSON.stringify(limitedSample, null, 2)}

Analyze this data and respond with a JSON object containing:
1. "keyColumns": Array of the 5-10 most important column names for visualization and analysis (prioritize numeric, date, and categorical key fields)
2. "dataType": One of "tabular", "time-series", "categorical", or "mixed"
3. "recommendedVisualizations": Array of recommended visualization types (e.g., ["bar", "line", "kpi"])
4. "insights": Array of 3-5 key insights about the data structure, patterns, and what it represents
5. "summary": One sentence summary describing what this data source contains
6. "hasTimeDimension": Boolean indicating if there's a time/date column
7. "timeColumn": Name of the time/date column if hasTimeDimension is true, null otherwise
8. "numericColumns": Array of column names that are numeric (integer or decimal)
9. "categoricalColumns": Array of column names that are categorical/text

Focus on understanding:
- What the data represents (e.g., sales, users, transactions, metrics)
- Key metrics and dimensions
- Relationships between columns
- Best ways to visualize this data

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

  try {
    // Use generation config for faster responses
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
      },
    });
    const responseText = result.response.text();
    
    // Clean up response (remove markdown code blocks if present)
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const analysis = JSON.parse(cleanedResponse) as Omit<DataSourceAnalysis, "schema" | "sampleSize">;
    
    // Extract numeric and categorical columns from schema if not provided
    const numericColumns = analysis.numericColumns || Object.entries(schema)
      .filter(([, type]) => type === "integer" || type === "decimal")
      .map(([key]) => key);
    
    const categoricalColumns = analysis.categoricalColumns || Object.entries(schema)
      .filter(([, type]) => type === "text" || type === "boolean")
      .map(([key]) => key);

    return {
      schema,
      keyColumns: analysis.keyColumns || Object.keys(schema).slice(0, 10),
      dataType: analysis.dataType || "tabular",
      recommendedVisualizations: analysis.recommendedVisualizations || ["table"],
      insights: analysis.insights || [],
      summary: analysis.summary || "Data source analysis",
      sampleSize: sampleData.length,
      hasTimeDimension: analysis.hasTimeDimension || false,
      timeColumn: analysis.timeColumn || undefined,
      numericColumns,
      categoricalColumns,
    };
  } catch (error) {
    console.error("Gemini data source analysis error:", error);
    
    // Fallback: generate basic analysis from schema
    const numericColumns = Object.entries(schema)
      .filter(([, type]) => type === "integer" || type === "decimal")
      .map(([key]) => key);
    
    const categoricalColumns = Object.entries(schema)
      .filter(([, type]) => type === "text" || type === "boolean")
      .map(([key]) => key);
    
    const timeColumns = Object.entries(schema)
      .filter(([, type]) => type === "date")
      .map(([key]) => key);
    
    return {
      schema,
      keyColumns: Object.keys(schema).slice(0, 10),
      dataType: timeColumns.length > 0 ? "time-series" : "tabular",
      recommendedVisualizations: numericColumns.length > 0 ? ["bar", "line", "kpi"] : ["table"],
      insights: [
        `Contains ${Object.keys(schema).length} columns`,
        numericColumns.length > 0 ? `${numericColumns.length} numeric columns` : "No numeric columns",
        sampleData.length > 0 ? `${sampleData.length} sample rows` : "No sample data",
      ],
      summary: `${dataSourceName || "Data source"} with ${Object.keys(schema).length} columns`,
      sampleSize: sampleData.length,
      hasTimeDimension: timeColumns.length > 0,
      timeColumn: timeColumns[0],
      numericColumns,
      categoricalColumns,
    };
  }
}

/**
 * Generates sample business intelligence prompts based on data source analysis.
 * These prompts help users understand what questions they can ask about their data.
 */
export async function generateSamplePrompts(
  dataSourceAnalysis: DataSourceAnalysis,
  dataSourceName: string
): Promise<string[]> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `You are a business intelligence assistant. Generate 5-7 sample questions that users can ask about this data source.

Data Source: ${dataSourceName}
Summary: ${dataSourceAnalysis.summary}
Data Type: ${dataSourceAnalysis.dataType}
Key Columns: ${dataSourceAnalysis.keyColumns.join(", ")}
Numeric Columns: ${dataSourceAnalysis.numericColumns.join(", ") || "None"}
Categorical Columns: ${dataSourceAnalysis.categoricalColumns.join(", ") || "None"}
Has Time Dimension: ${dataSourceAnalysis.hasTimeDimension ? `Yes (${dataSourceAnalysis.timeColumn})` : "No"}

Generate business intelligence questions that:
1. Are relevant to the data structure and columns
2. Focus on business insights (trends, comparisons, aggregations, KPIs)
3. Use actual column names from the data
4. Are practical and actionable
5. Cover different types of analysis (summaries, trends, comparisons, top/bottom items)

Examples of good questions:
- "Show me total revenue by month"
- "What are the top 10 customers by sales?"
- "Compare sales performance across different regions"
- "Show me the trend of user signups over time"
- "What is the average order value by product category?"

Return ONLY a JSON array of strings, no markdown formatting. Example: ["question 1", "question 2", "question 3"]`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 500,
      },
    });
    
    const responseText = result.response.text();
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const prompts = JSON.parse(cleanedResponse) as string[];
    return prompts.slice(0, 7); // Limit to 7 prompts
  } catch (error) {
    console.error("Error generating sample prompts:", error);
    
    // Fallback: generate basic prompts based on analysis
    const prompts: string[] = [];
    
    if (dataSourceAnalysis.hasTimeDimension && dataSourceAnalysis.timeColumn) {
      prompts.push(`Show me trends over time using ${dataSourceAnalysis.timeColumn}`);
    }
    
    if (dataSourceAnalysis.numericColumns.length > 0) {
      const numCol = dataSourceAnalysis.numericColumns[0];
      prompts.push(`What is the total ${numCol}?`);
      prompts.push(`Show me the top 10 items by ${numCol}`);
    }
    
    if (dataSourceAnalysis.categoricalColumns.length > 0) {
      const catCol = dataSourceAnalysis.categoricalColumns[0];
      prompts.push(`Show me breakdown by ${catCol}`);
      prompts.push(`Compare metrics across different ${catCol} values`);
    }
    
    prompts.push(`Give me a summary of this data`);
    prompts.push(`What are the key insights from this data?`);
    
    return prompts.slice(0, 7);
  }
}

export async function generateSchemaFromData(
  data: Record<string, unknown>[]
): Promise<Record<string, string>> {
  if (!data.length) return {};
  
  const schema: Record<string, string> = {};
  const sample = data[0];
  
  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === "number") {
      schema[key] = Number.isInteger(value) ? "integer" : "decimal";
    } else if (typeof value === "boolean") {
      schema[key] = "boolean";
    } else if (value instanceof Date) {
      schema[key] = "date";
    } else if (typeof value === "string") {
      // Try to detect date strings
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        schema[key] = "date";
      } else if (/^\d+$/.test(value)) {
        schema[key] = "id";
      } else {
        schema[key] = "text";
      }
    } else {
      schema[key] = "unknown";
    }
  }
  
  return schema;
}
