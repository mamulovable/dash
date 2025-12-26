import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { transformStream } from "@crayonai/stream";
import { DBMessage, getMessageStore } from "./messageStore";
import { getOrCreateUser, incrementQueryCount } from "@/lib/auth";
import { queryOne, query } from "@/lib/db";
import { processDataQuery, generateQueryExplanation, DataSourceAnalysis } from "@/lib/gemini";
import { generateCacheKey, getFromCache, setCache } from "@/lib/redis";
import { canMakeQuery } from "@/lib/tier-limits";
import { DataSource } from "@/types";
import Papa from "papaparse";

interface ChatRequestBody {
  prompt: DBMessage;
  threadId: string;
  responseId: string;
  dataSourceId?: string;
}

export async function POST(req: NextRequest) {
  const { prompt, threadId, responseId, dataSourceId: bodyDataSourceId } = (await req.json()) as ChatRequestBody;
  
  // Also check query string for dataSourceId (from C1Chat apiUrl)
  const { searchParams } = new URL(req.url);
  const queryDataSourceId = searchParams.get("dataSourceId");
  const dataSourceId = bodyDataSourceId || queryDataSourceId;
  
  // Get authenticated user (optional - allow unauthenticated for demo)
  const user = await getOrCreateUser().catch(() => null);
  
  // Check query limits if user is authenticated
  if (user && !canMakeQuery(user, false)) {
    return NextResponse.json(
      {
        error: "Query limit reached",
        message: "You've used all your queries for this month",
        reset_date: user.reset_date,
      },
      { status: 429 }
    );
  }
  
  const client = new OpenAI({
    baseURL: "https://api.thesys.dev/v1/embed/",
    apiKey: process.env.THESYS_API_KEY,
  });
  
  const messageStore = getMessageStore(threadId);
  
  // Early return if no actual query content
  let userQuery = typeof prompt.content === "string" ? prompt.content.trim() : JSON.stringify(prompt.content);
  if (!userQuery || userQuery.length === 0) {
    // Just return empty response for empty queries
    messageStore.addMessage(prompt);
    return new NextResponse("", {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }
  
  // Get data source context if provided
  let dataContext = "";
  let dataSource: DataSource | null = null;
  let geminiResult: Awaited<ReturnType<typeof processDataQuery>> | null = null;
  let queryExplanation: Awaited<ReturnType<typeof generateQueryExplanation>> | null = null;
  let isCached = false;
  
  // Normalize query to reference the data source explicitly
  // This helps Gemini understand that queries like "summarize this document" refer to the selected data source
  const normalizeQuery = (query: string, dataSourceName?: string): string => {
    if (!dataSourceName) return query;
    
    let normalized = query;
    
    // Replace generic references with explicit data source name
    normalized = normalized.replace(
      /\b(this document|the document|this file|the file|this data|the data|this source|the source|this dataset|the dataset)\b/gi,
      `the ${dataSourceName} data`
    );
    
    // Replace action verbs followed by "it/this/that" with explicit reference
    normalized = normalized.replace(
      /\b(summarize|analyze|explain|describe|show|display|visualize)\s+(it|this|that)\b/gi,
      (match, verb) => `${verb} the ${dataSourceName} data`
    );
    
    return normalized;
  };
  
  if (dataSourceId) {
    try {
      // Handle both authenticated and unauthenticated cases
      const query = user 
        ? `SELECT * FROM data_sources WHERE id = $1 AND user_id = $2`
        : `SELECT * FROM data_sources WHERE id = $1`;
      const params = user ? [dataSourceId, user.id] : [dataSourceId];
      const dsResult = await queryOne<Record<string, unknown>>(query, params);
    
      if (dsResult) {
        // Parse JSONB fields
        dataSource = {
          ...dsResult,
          config: typeof dsResult.config === 'string' ? JSON.parse(dsResult.config) : dsResult.config,
          selected_columns: typeof dsResult.selected_columns === 'string' 
            ? JSON.parse(dsResult.selected_columns) 
            : dsResult.selected_columns,
          schema_info: typeof dsResult.schema_info === 'string' 
            ? JSON.parse(dsResult.schema_info) 
            : dsResult.schema_info,
        } as DataSource;
        
        // Normalize the query to explicitly reference the data source
        userQuery = normalizeQuery(userQuery, dataSource.name);
        
        // Debug logging
        console.log(`Data source loaded: ${dataSource.name}, type: ${dataSource.type}`);
        console.log(`Original query: "${typeof prompt.content === "string" ? prompt.content.trim() : JSON.stringify(prompt.content)}"`);
        console.log(`Normalized query: "${userQuery}"`);
        console.log(`Schema info keys: ${Object.keys(dataSource.schema_info || {}).length}`);
        console.log(`Config keys: ${Object.keys(dataSource.config || {}).join(", ")}`);
      }
    } catch (error) {
      console.error("Error loading data source:", error);
      // Continue processing - we'll build fallback context if needed
    }
    
    if (dataSource) {
      // Get stored analysis from data source config (from initial Gemini analysis)
      const storedAnalysis = (dataSource.config as Record<string, unknown>)?.analysis as DataSourceAnalysis | null;
      
      // Generate cache key (userQuery already defined above)
      const cacheKey = generateCacheKey(
        dataSourceId,
        userQuery,
        dataSource.fingerprint || ""
      );
      
      // Check cache
      const cached = await getFromCache<{ result: typeof geminiResult; explanation: typeof queryExplanation }>(cacheKey);
      
      if (cached) {
        geminiResult = cached.result;
        queryExplanation = cached.explanation;
        isCached = true;
      } else {
        // Process with Gemini - analyze query and extract ONLY minimal data needed for UI
        try {
          // Get sample data from data source based on type
          let sampleData: Record<string, unknown>[] = [];
          
          if (dataSource.type === "csv") {
            // Read CSV data from database config (stored as base64)
            try {
              const config = dataSource.config as Record<string, unknown>;
              const csvBase64 = config.csv_content as string;
              
              if (csvBase64) {
                console.log(`Found csv_content in config, length: ${csvBase64.length}`);
                // Decode base64 CSV content
                const csvContent = Buffer.from(csvBase64, "base64").toString("utf-8");
                console.log(`Decoded CSV content length: ${csvContent.length}`);
                
                const parseResult = Papa.parse(csvContent, {
                  header: true,
                  skipEmptyLines: true,
                  dynamicTyping: true,
                });
                
                if (parseResult.errors.length > 0) {
                  console.error("CSV parsing errors:", parseResult.errors);
                }
                
                const csvData = parseResult.data as Record<string, unknown>[];
                console.log(`Parsed CSV data: ${csvData.length} rows, columns: ${parseResult.meta.fields?.join(", ") || "none"}`);
                
                if (csvData.length === 0) {
                  console.warn("CSV data is empty after parsing");
                } else {
                  // Use ALL CSV data, not just first 50 rows
                  // This ensures we have access to all data from the selected data source
                  sampleData = csvData; // Use all rows, not just first 50
                  console.log(`Loaded ALL ${sampleData.length} rows from CSV data source for analysis`);
                }
              } else {
                console.warn("No csv_content found in data source config. Config keys:", Object.keys(config));
                // For older data sources without csv_content, we'll rely on schema_info
                // which should still be available
              }
            } catch (error) {
              console.error("Error reading CSV data from database:", error);
              // Continue with empty sample data
            }
          } else if (dataSource.type === "api") {
            // For API sources, we don't have sample data readily available
            // The Gemini analysis from initial connection should be sufficient
            sampleData = [];
          }
          
          // Validate we have at least schema or sample data
          const schemaInfo = dataSource.schema_info || {};
          const hasSchema = Object.keys(schemaInfo).length > 0;
          const hasSampleData = sampleData.length > 0;
          
          if (!hasSchema && !hasSampleData) {
            console.error("No schema or sample data available for data source:", dataSource.id);
            // Return early with error instead of throwing
            return NextResponse.json(
              {
                error: "No data available",
                message: "The data source has no schema or data available. Please re-upload the data source.",
              },
              { status: 400 }
            );
          }
          
          console.log(`Processing query with schema (${Object.keys(schemaInfo).length} columns) and ${sampleData.length} sample rows`);
          
          // Use ALL columns from schema_info, not just selected_columns
          // selected_columns is just for UI display, we should use all available data
          const allSchemaColumns = Object.keys(schemaInfo);
          console.log(`Using ALL ${allSchemaColumns.length} columns from schema (not limited to selected columns)`);
          
          // First, get the query result (this is the critical path)
          geminiResult = await processDataQuery(
            schemaInfo, // Use full schema with all columns
            userQuery,
            sampleData, // Pass actual sample data
            storedAnalysis || undefined
          );
          
          if (!geminiResult || !geminiResult.data || geminiResult.data.length === 0) {
            console.warn("Gemini returned empty result");
          }
          
          // Generate explanation in parallel with timeout - don't block if it's slow
          if (geminiResult) {
            // Use Promise.race to timeout explanation after 3 seconds
            const explanationPromise = generateQueryExplanation(
              userQuery,
              dataSource.name,
              geminiResult
            );
            
            const timeoutPromise = new Promise<null>((resolve) => 
              setTimeout(() => resolve(null), 3000)
            );
            
            try {
              queryExplanation = await Promise.race([explanationPromise, timeoutPromise]);
            } catch (error) {
              console.error("Gemini explanation error:", error);
              // Continue without explanation if it fails
            }
          }
          
          // Cache both result and explanation (even if explanation failed or timed out)
          if (geminiResult) {
            // Don't await cache write - fire and forget for better performance
            setCache(cacheKey, { result: geminiResult, explanation: queryExplanation }, 3600)
              .catch(err => console.error("Cache write error:", err));
          }
        } catch (error) {
          console.error("Gemini processing error:", error);
        }
      }
      
      // Build data context for C1 - always build context if data source exists
      // Build full context if Gemini succeeded, fallback context if Gemini failed
      if (dataSource) {
        // Capture dataSource in const for TypeScript narrowing
        const ds = dataSource;
        
        // Get sample data for fallback context
        let sampleData: Record<string, unknown>[] = [];
        if (ds.type === "csv") {
          try {
            const config = ds.config as Record<string, unknown>;
            const csvBase64 = config.csv_content as string;
            if (csvBase64) {
              const csvContent = Buffer.from(csvBase64, "base64").toString("utf-8");
              const parseResult = Papa.parse(csvContent, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
              });
              sampleData = (parseResult.data as Record<string, unknown>[]).slice(0, 20);
            }
          } catch (error) {
            console.error("Error reading CSV data for fallback context:", error);
          }
        }
        
        // Build full context if Gemini succeeded and returned data
        if (geminiResult && geminiResult.data && geminiResult.data.length > 0) {
          // Use columns determined by Gemini based on the query
          // Gemini analyzes the query and determines which columns are needed
          // We use ALL available columns in schema_info, not just selected_columns
          const allAvailableColumns = Object.keys(ds.schema_info || {});
          const requiredColumns = geminiResult.requiredColumns || 
            (storedAnalysis?.keyColumns || allAvailableColumns.slice(0, 10));
          
          console.log(`Query requires ${requiredColumns.length} columns from ${allAvailableColumns.length} total available columns`);
          
          // Extract schema for ONLY required columns
          const minimalSchema = requiredColumns.reduce((acc: Record<string, string>, col: string) => {
            if (ds.schema_info?.[col]) {
              acc[col] = ds.schema_info[col];
            }
            return acc;
          }, {});
          
          // Get minimal data - ONLY the required columns, max 30 rows
          const minimalData = geminiResult.data.slice(0, 30).map((row: Record<string, unknown>) => {
            const minimal: Record<string, unknown> = {};
            requiredColumns.forEach((col: string) => {
              if (row && col in row) {
                minimal[col] = row[col];
              }
            });
            return minimal;
          });
          
          // Build chart configuration if available
          const chartConfigStr = geminiResult.chartConfig 
            ? `\n**Chart Configuration:**
- X-Axis: ${geminiResult.chartConfig.xAxis || "N/A"}
- Y-Axis: ${geminiResult.chartConfig.yAxis || "N/A"}
- Series: ${geminiResult.chartConfig.series?.join(", ") || "N/A"}
- Categories: ${geminiResult.chartConfig.categories?.slice(0, 10).join(", ") || "N/A"}`
            : '';
          
          // Build explanation text if available
          const explanationText = queryExplanation 
            ? `\n**Explanation:** ${queryExplanation.explanation}\n**What this shows:** ${queryExplanation.dataSummary}\n**Interpretation:** ${queryExplanation.interpretation}`
            : `\n**Summary:** ${geminiResult.summary}`;
          
          dataContext = `
You are DashMind AI, a business intelligence assistant generating interactive UI components.

**CRITICAL**: The user has selected data source "${ds.name}" (${ds.type}).
ALL user queries MUST use this data source. NEVER generate document upload UIs or ask for file uploads.

**IMPORTANT CONTEXT:**
- The user has selected the data source "${ds.name}" (${ds.type})
- ALL user queries refer to THIS selected data source
- When the user says "summarize this document", "analyze the data", "show me insights", etc., they mean the "${ds.name}" data source
- Do NOT generate generic document upload UIs or ask for file uploads
- Generate visualizations and insights based on the data provided below

**User Request:** ${userQuery}${explanationText}

**Data Source:** ${ds.name} (${ds.type})

**Required Data Structure (${requiredColumns.length} columns only):**
${JSON.stringify(minimalSchema, null, 2)}

**Data to Visualize (${minimalData.length} rows):**
${JSON.stringify(minimalData, null, 2)}

**Visualization Requirements:**
- Type: ${geminiResult.visualization}
- Aggregation: ${geminiResult.aggregationType || "none"}
- Group By: ${geminiResult.groupByColumns?.join(", ") || "none"}${chartConfigStr}

Generate interactive UI components (${geminiResult.visualization === "mixed" ? "charts and tables" : geminiResult.visualization}) to display this data. Use appropriate React components with proper styling. Focus ONLY on the columns provided above. Start your response with a brief explanation of what the visualization shows, then generate the UI components.

${isCached ? "Note: This response is from cache." : ""}
`;
        } else {
          // Build fallback context when Gemini fails or returns empty
          console.log("Building fallback context - Gemini failed or returned empty result");
          dataContext = `
You are DashMind AI, a business intelligence assistant.

**CRITICAL**: The user has selected data source "${ds.name}" (${ds.type}).
ALL user queries MUST use this data source. NEVER generate document upload UIs or ask for file uploads.

**Data Schema:**
${JSON.stringify(ds.schema_info || {}, null, 2)}

${sampleData.length > 0 ? `**Sample Data (first ${sampleData.length} rows):**
${JSON.stringify(sampleData, null, 2)}` : ''}

Generate visualizations and insights based on this data. Use ONLY the data provided above. Do NOT ask for file uploads or generate document upload forms.
`;
        }
      }
    }
  }
  
  // Add system context if we have data source (always send when data source exists)
  if (dataSource) {
    // Ensure we have a context (use fallback if dataContext is empty)
    const contextToUse = dataContext || `
You are DashMind AI, a business intelligence assistant.

**CRITICAL**: The user has selected data source "${dataSource.name}" (${dataSource.type}).
ALL user queries MUST use this data source. NEVER generate document upload UIs or ask for file uploads.

**Data Schema:**
${JSON.stringify(dataSource.schema_info || {}, null, 2)}

Generate visualizations and insights based on this data. Use ONLY the data provided above. Do NOT ask for file uploads or generate document upload forms.
`;
    
    // Prepend system message with data context
    const systemMessage: DBMessage = {
      role: "system",
      content: contextToUse,
    };
    
    // Check if system message already exists
    if (messageStore.messageList.length === 0 || messageStore.messageList[0].role !== "system") {
      messageStore.messageList.unshift(systemMessage);
    } else {
      // Update existing system message
      messageStore.messageList[0] = systemMessage;
    }
  }
  
  messageStore.addMessage(prompt);

  const llmStream = await client.chat.completions.create({
    model: "c1/openai/gpt-5/v-20251130",
    messages: messageStore.getOpenAICompatibleMessageList(),
    stream: true,
  });

  const responseStream = transformStream(
    llmStream,
    (chunk) => {
      return chunk.choices?.[0]?.delta?.content ?? "";
    },
    {
      onEnd: async ({ accumulated }) => {
        const message = accumulated.filter((message) => message).join("");
        messageStore.addMessage({
          role: "assistant",
          content: message,
          id: responseId,
        });
        
        // Save query to database if user is authenticated
        if (user) {
          try {
            await query(
              `INSERT INTO queries (user_id, data_source_id, thread_id, prompt, response, cached)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                user.id,
                dataSourceId || null,
                threadId,
                typeof prompt.content === "string" ? prompt.content : JSON.stringify(prompt.content),
                JSON.stringify({
                  geminiResult,
                  explanation: queryExplanation,
                  message,
                }),
                isCached,
              ]
            );
            
            // Increment query count only if not cached
            if (!isCached) {
              await incrementQueryCount(user.id);
            }
          } catch (error) {
            console.error("Error saving query:", error);
          }
        }
      },
    }
  ) as ReadableStream<string>;

  return new NextResponse(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Cached": isCached ? "true" : "false",
    },
  });
}
