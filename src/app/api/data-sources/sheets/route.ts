import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

// GET /api/data-sources/sheets/auth - Initiate Google OAuth
export async function GET(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Handle OAuth callback
    if (action === "callback") {
      // Handle OAuth callback
      const code = searchParams.get("code");
      if (!code) {
        return NextResponse.redirect(
          new URL("/data-sources?error=no_code", req.url)
        );
      }

      // Exchange code for tokens
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/data-sources/sheets?action=callback`
      );

      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        return NextResponse.redirect(
          new URL("/data-sources?error=no_tokens", req.url)
        );
      }

      // Store tokens in cookies (in production, encrypt and store in database)
      // For now, pass tokens via URL params (they'll be used immediately)
      const redirectUrl = new URL("/data-sources", req.url);
      redirectUrl.searchParams.set("sheets_connected", "true");
      redirectUrl.searchParams.set("access_token", tokens.access_token);
      redirectUrl.searchParams.set("refresh_token", tokens.refresh_token || "");
      
      // Also set cookies for temporary storage
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set("google_access_token", tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
      });
      response.cookies.set("google_refresh_token", tokens.refresh_token || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      
      return response;
    }

    // Generate OAuth URL (default action or "auth")
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("Missing Google OAuth credentials");
      return NextResponse.json(
        { success: false, error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables." },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error("Missing NEXT_PUBLIC_APP_URL");
      return NextResponse.json(
        { success: false, error: "App URL is not configured. Please set NEXT_PUBLIC_APP_URL environment variable." },
        { status: 500 }
      );
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/data-sources/sheets?action=callback`
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
      prompt: "consent",
    });

    console.log("Generated OAuth URL for user:", user.id);
    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error("Error in Google Sheets auth:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to initiate Google OAuth";
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

// POST /api/data-sources/sheets - Connect Google Sheet
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
    const { spreadsheetId, sheetName, name, selectedColumns, accessToken, refreshToken } = body;

    if (!spreadsheetId || !sheetName) {
      return NextResponse.json(
        { success: false, error: "Spreadsheet ID and sheet name are required" },
        { status: 400 }
      );
    }

    // Create OAuth client with stored tokens
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Fetch data from Google Sheets
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    
    // Add automatic token refresh
    oauth2Client.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        // Store new refresh token if provided
        console.log("Token refreshed");
      }
    });
    
    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z1000`, // Adjust range as needed
      });
    } catch (error) {
      // If token expired, try to refresh
      const errorObj = error as { code?: number };
      if (errorObj.code === 401 && refreshToken) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);
          response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:Z1000`,
          });
        } catch {
          throw new Error("Failed to refresh access token. Please reconnect your Google account.");
        }
      } else {
        throw error;
      }
    }

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Sheet is empty" },
        { status: 400 }
      );
    }

    // First row is headers
    const headers = rows[0] as string[];
    const dataRows = rows.slice(1);

    // Convert to object format
    const data = dataRows.map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });

    // Generate schema
    const schema: Record<string, string> = {};
    if (data.length > 0) {
      const sample = data[0];
      for (const [key, value] of Object.entries(sample)) {
        if (typeof value === "number") {
          schema[key] = Number.isInteger(value) ? "integer" : "decimal";
        } else if (typeof value === "boolean") {
          schema[key] = "boolean";
        } else if (typeof value === "string") {
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
    }

    // Parse selected columns
    let finalSelectedColumns: string[] = [];
    if (selectedColumns) {
      try {
        finalSelectedColumns = typeof selectedColumns === "string" 
          ? JSON.parse(selectedColumns) 
          : selectedColumns;
      } catch {
        // Auto-select important columns
        finalSelectedColumns = headers.filter((col) => {
          const type = schema[col];
          return type === "date" || type === "number" || type === "integer" || col.toLowerCase().includes("id");
        }).slice(0, 10);
      }
    } else {
      finalSelectedColumns = headers.filter((col) => {
        const type = schema[col];
        return type === "date" || type === "number" || type === "integer" || col.toLowerCase().includes("id");
      }).slice(0, 10);
    }

    // Generate fingerprint
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
        name || `Google Sheet: ${sheetName}`,
        "sheets",
        JSON.stringify({
          spreadsheet_id: spreadsheetId,
          sheet_name: sheetName,
          access_token: accessToken, // In production, encrypt this
          refresh_token: refreshToken, // In production, encrypt this
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
    console.error("Error connecting Google Sheet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to connect Google Sheet" },
      { status: 500 }
    );
  }
}



