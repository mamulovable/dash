// User types
export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  tier: "starter" | "pro" | "agency";
  queries_used: number;
  queries_limit: number;
  reset_date: Date;
  created_at: Date;
  updated_at: Date;
}

// Data Source types
export type DataSourceType = "csv" | "sheets" | "postgres" | "mysql" | "api";
export type DataSourceStatus = "connected" | "syncing" | "error";

export interface DataSource {
  id: string;
  user_id: string;
  name: string;
  type: DataSourceType;
  config: DataSourceConfig;
  selected_columns: string[];
  schema_info: Record<string, string>;
  fingerprint: string | null;
  status: DataSourceStatus;
  row_count: number;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DataSourceConfig {
  // CSV
  file_url?: string;
  file_name?: string;
  
  // Google Sheets
  spreadsheet_id?: string;
  sheet_name?: string;
  range?: string;
  
  // Database
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string; // Encrypted
  ssl?: boolean;
  table?: string;
  
  // REST API
  endpoint?: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  auth_type?: "none" | "bearer" | "api_key" | "basic";
  auth_config?: Record<string, string>;
}

// Query types
export interface Query {
  id: string;
  user_id: string;
  data_source_id: string | null;
  thread_id: string | null;
  prompt: string;
  response: QueryResponse | null;
  cached: boolean;
  cost: number;
  tokens_input: number;
  tokens_output: number;
  is_favorite: boolean;
  created_at: Date;
}

export interface QueryResponse {
  data: Record<string, unknown>[];
  visualization: string;
  insights: string[];
  summary: string;
}

// Query Pack types
export interface QueryPack {
  id: string;
  user_id: string;
  queries_purchased: number;
  queries_remaining: number;
  purchased_at: Date;
}

// Team types
export interface Team {
  id: string;
  name: string;
  tier: string;
  owner_id: string;
  created_at: Date;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "admin" | "member";
  created_at: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  cached?: boolean;
  cache_time?: string;
}

export interface ChatContext {
  data_source_id: string;
  data_source_name: string;
  schema: Record<string, string>;
  sample_data: Record<string, unknown>[];
}








