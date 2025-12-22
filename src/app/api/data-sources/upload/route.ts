import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import Papa from "papaparse";
import { generateSchemaFromData } from "@/lib/gemini";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Ensure uploads directory exists
const UPLOADS_DIR = join(process.cwd(), "uploads");

async function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
}

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
    
    // This is a final connection request - save file and create data source
    await ensureUploadsDir();
    
    // Save file to uploads directory
    const fileId = uuidv4();
    const fileName = `${fileId}-${file.name}`;
    const filePath = join(UPLOADS_DIR, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
    
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
          file_url: `/uploads/${fileName}`,
          file_name: file.name,
          file_path: filePath,
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



