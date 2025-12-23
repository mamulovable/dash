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
import { readFile } from "fs/promises";
import { join } from "path";

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
  const userQuery = typeof prompt.content === "string" ? prompt.content.trim() : JSON.stringify(prompt.content);
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
  
  if (dataSourceId && user) {
    const dsResult = await queryOne<Record<string, unknown>>(
      `SELECT * FROM data_sources WHERE id = $1 AND user_id = $2`,
      [dataSourceId, user.id]
    );
    
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
            // Read CSV file for CSV data sources
            try {
              const config = dataSource.config as Record<string, unknown>;
              const filePath = config.file_path as string;
              
              if (filePath) {
                const fileContent = await readFile(filePath, "utf-8");
                const parseResult = Papa.parse(fileContent, {
                  header: true,
                  skipEmptyLines: true,
                  dynamicTyping: true,
                });
                
                const csvData = parseResult.data as Record<string, unknown>[];
                // Use first 50 rows as sample for analysis
                sampleData = csvData.slice(0, 50);
              }
            } catch (error) {
              console.error("Error reading CSV file:", error);
              // Continue with empty sample data
            }
          } else if (dataSource.type === "api") {
            // For API sources, we don't have sample data readily available
            // The Gemini analysis from initial connection should be sufficient
            sampleData = [];
          }
          
          // First, get the query result (this is the critical path)
          geminiResult = await processDataQuery(
            dataSource.schema_info || {},
            userQuery,
            sampleData, // Pass actual sample data
            storedAnalysis || undefined
          );
          
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
      
      // Build MINIMAL data context for C1 - only what's needed for UI generation
      if (geminiResult && dataSource) {
        // Capture dataSource in const for TypeScript narrowing
        const ds = dataSource;
        // Use ONLY the required columns from Gemini analysis
        const requiredColumns = geminiResult.requiredColumns || 
          (storedAnalysis?.keyColumns || Object.keys(ds.schema_info || {}).slice(0, 10));
        
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
      }
    }
  }
  
  // Add system context if we have data
  if (dataContext) {
    // Prepend system message with data context
    const systemMessage: DBMessage = {
      role: "system",
      content: dataContext,
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
