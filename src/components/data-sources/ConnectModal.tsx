"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Check, X, Loader2, Database, FileSpreadsheet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ColumnInfo {
  name: string;
  type: string;
}

interface PreviewData {
  file_name: string;
  row_count: number;
  columns: ColumnInfo[];
  schema: Record<string, string>;
  preview: Record<string, unknown>[];
}

export function ConnectModal({ open, onOpenChange, onSuccess }: ConnectModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [dataSourceName, setDataSourceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Sheets state
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [googleTokens, setGoogleTokens] = useState<{ accessToken?: string; refreshToken?: string } | null>(null);

  // Database state
  const [dbType, setDbType] = useState<"postgres" | "mysql">("postgres");
  const [dbHost, setDbHost] = useState("");
  const [dbPort, setDbPort] = useState("");
  const [dbDatabase, setDbDatabase] = useState("");
  const [dbUsername, setDbUsername] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbSchema, setDbSchema] = useState("public");
  const [dbTableName, setDbTableName] = useState("");
  const [dbPreview, setDbPreview] = useState<PreviewData | null>(null);

  // REST API state
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiAuthType, setApiAuthType] = useState("none");
  const [apiAuthConfig, setApiAuthConfig] = useState<Record<string, string>>({});
  const [apiPreview, setApiPreview] = useState<PreviewData | null>(null);

  // Check for OAuth callback on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const sheetsConnected = urlParams.get("sheets_connected");
      const accessToken = urlParams.get("access_token");
      const refreshToken = urlParams.get("refresh_token");
      
      if (sheetsConnected === "true" && accessToken && refreshToken) {
        setSheetsConnected(true);
        setGoogleTokens({ accessToken, refreshToken });
        // Clean up URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("sheets_connected");
        newUrl.searchParams.delete("access_token");
        newUrl.searchParams.delete("refresh_token");
        window.history.replaceState({}, "", newUrl.toString());
      }
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setDataSourceName(file.name.replace(".csv", ""));
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/data-sources/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to parse CSV");
      }

      if (result.preview) {
        setPreviewData(result.data);
        // Auto-select important columns
        const importantCols = result.data.columns
          .filter((col: ColumnInfo) => {
            const type = col.type.toLowerCase();
            return (
              type === "date" ||
              type === "number" ||
              type === "integer" ||
              type === "decimal" ||
              col.name.toLowerCase().includes("id")
            );
          })
          .slice(0, 10)
          .map((col: ColumnInfo) => col.name);
        setSelectedColumns(new Set(importantCols));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setCsvFile(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (columnName: string) => {
    const maxColumns = 10; // TODO: Get from user tier
    if (selectedColumns.size >= maxColumns && !selectedColumns.has(columnName)) {
      setError(`You can only select up to ${maxColumns} columns on your plan`);
      return;
    }
    setError(null);
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnName)) {
        next.delete(columnName);
      } else {
        next.add(columnName);
      }
      return next;
    });
  };

  const handleConnectCSV = async () => {
    if (!csvFile || !previewData || selectedColumns.size === 0) {
      setError("Please select at least one column");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("name", dataSourceName || csvFile.name.replace(".csv", ""));
      formData.append("selectedColumns", JSON.stringify(Array.from(selectedColumns)));

      const response = await fetch("/api/data-sources/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create data source");
      }

      // Success - close modal and refresh
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect data source");
    } finally {
      setUploading(false);
    }
  };

  const handleConnectGoogleSheets = async () => {
    if (!sheetsConnected) {
      // Initiate OAuth flow
      try {
        setLoading(true);
        setError(null);
        
        console.log("Initiating Google OAuth...");
        const response = await fetch("/api/data-sources/sheets?action=auth");
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log("OAuth response:", result);
        
        if (!result.success) {
          throw new Error(result.error || "Failed to initiate Google OAuth");
        }
        
        if (!result.authUrl) {
          throw new Error("No auth URL received from server");
        }
        
        // Redirect to Google OAuth
        console.log("Redirecting to:", result.authUrl);
        window.location.href = result.authUrl;
      } catch (err) {
        console.error("Google OAuth error:", err);
        setError(err instanceof Error ? err.message : "Failed to connect Google");
        setLoading(false);
      }
    } else {
      // Connect the selected sheet
      if (!spreadsheetId || !sheetName) {
        setError("Please provide spreadsheet ID and sheet name");
        return;
      }

      setUploading(true);
      setError(null);

      try {
        if (!googleTokens?.accessToken || !googleTokens?.refreshToken) {
          setError("Please connect your Google account first");
          return;
        }

        const response = await fetch("/api/data-sources/sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spreadsheetId,
            sheetName,
            name: dataSourceName || `Google Sheet: ${sheetName}`,
            selectedColumns: Array.from(selectedColumns),
            accessToken: googleTokens.accessToken,
            refreshToken: googleTokens.refreshToken,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to connect Google Sheet");
        }

        // Success - close modal and refresh
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect Google Sheet");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleConnectDatabase = async () => {
    if (!dbHost || !dbPort || !dbDatabase || !dbUsername || !dbPassword || !dbTableName) {
      setError("Please fill in all database connection fields");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const endpoint = dbType === "postgres" ? "/api/data-sources/postgres" : "/api/data-sources/mysql";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: dbHost,
          port: dbPort,
          database: dbDatabase,
          username: dbUsername,
          password: dbPassword,
          schema: dbSchema,
          tableName: dbTableName,
          name: dataSourceName || `${dbType === "postgres" ? "PostgreSQL" : "MySQL"}: ${dbDatabase}.${dbTableName}`,
          selectedColumns: Array.from(selectedColumns),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to connect database");
      }

      // Success - close modal and refresh
      onOpenChange(false);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect database");
    } finally {
      setUploading(false);
    }
  };

  const handleTestDatabase = async () => {
    if (!dbHost || !dbPort || !dbDatabase || !dbUsername || !dbPassword || !dbTableName) {
      setError("Please fill in all database connection fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = dbType === "postgres" ? "/api/data-sources/postgres" : "/api/data-sources/mysql";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: dbHost,
          port: dbPort,
          database: dbDatabase,
          username: dbUsername,
          password: dbPassword,
          schema: dbSchema,
          tableName: dbTableName,
          name: dataSourceName || `${dbType === "postgres" ? "PostgreSQL" : "MySQL"}: ${dbDatabase}.${dbTableName}`,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to test database connection");
      }

      // Show preview
      if (result.preview) {
        const schemaInfo = typeof result.data.schema_info === 'string' 
          ? JSON.parse(result.data.schema_info) 
          : result.data.schema_info || {};
        const columns = Object.keys(schemaInfo).map((name) => ({
          name,
          type: schemaInfo[name] || "text",
        }));
        setDbPreview({
          file_name: dbTableName,
          row_count: result.data.row_count || 0,
          columns,
          schema: schemaInfo,
          preview: result.preview || [],
        });
        // Auto-select important columns
        const importantCols = columns
          .filter((col) => {
            const type = col.type.toLowerCase();
            return type === "date" || type === "number" || type === "integer" || col.name.toLowerCase().includes("id");
          })
          .slice(0, 10)
          .map((col) => col.name);
        setSelectedColumns(new Set(importantCols));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test database connection");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAPI = async () => {
    if (!apiUrl) {
      setError("Please provide API URL");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/data-sources/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: apiUrl,
          method: apiMethod,
          authType: apiAuthType,
          authConfig: apiAuthConfig,
          name: dataSourceName || `REST API: ${new URL(apiUrl).hostname}`,
          selectedColumns: Array.from(selectedColumns),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to connect API");
      }

      // Success - close modal and refresh
      onOpenChange(false);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect API");
    } finally {
      setUploading(false);
    }
  };

  const handleTestAPI = async () => {
    if (!apiUrl) {
      setError("Please provide API URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/data-sources/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: apiUrl,
          method: apiMethod,
          authType: apiAuthType,
          authConfig: apiAuthConfig,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to test API connection");
      }

      // Show preview
      if (result.preview) {
        const schemaInfo = typeof result.data.schema_info === 'string' 
          ? JSON.parse(result.data.schema_info) 
          : result.data.schema_info || {};
        const columns = Object.keys(schemaInfo).map((name) => ({
          name,
          type: schemaInfo[name] || "text",
        }));
        setApiPreview({
          file_name: "API Response",
          row_count: result.data.row_count || 0,
          columns,
          schema: schemaInfo,
          preview: result.preview || [],
        });
        // Auto-select important columns
        const importantCols = columns
          .filter((col) => {
            const type = col.type.toLowerCase();
            return type === "date" || type === "number" || type === "integer" || col.name.toLowerCase().includes("id");
          })
          .slice(0, 10)
          .map((col) => col.name);
        setSelectedColumns(new Set(importantCols));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test API connection");
    } finally {
      setLoading(false);
    }
  };

  const resetCSV = () => {
    setCsvFile(null);
    setPreviewData(null);
    setSelectedColumns(new Set());
    setDataSourceName("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect Data Source</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="csv">CSV Upload</TabsTrigger>
            <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="api">REST API</TabsTrigger>
          </TabsList>

          {/* CSV Tab */}
          <TabsContent value="csv" className="space-y-6 mt-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <Label>Data Source Name</Label>
              <Input
                value={dataSourceName}
                onChange={(e) => setDataSourceName(e.target.value)}
                placeholder="My Data Source"
                className="mt-2"
                disabled={!csvFile}
              />
            </div>

            <div>
              <Label>Upload CSV File</Label>
              <div className="mt-2">
                {!csvFile ? (
                  <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-indigo-500 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                      disabled={loading}
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      {loading ? (
                        <Loader2 className="h-12 w-12 mx-auto mb-4 text-indigo-500 animate-spin" />
                      ) : (
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      )}
                      <p className="font-medium">
                        {loading ? "Processing..." : "Drop CSV file here or click to browse"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Maximum file size: 10MB
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{csvFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(csvFile.size / 1024).toFixed(2)} KB • {previewData?.row_count || 0} rows
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetCSV}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {previewData && (
              <>
                <div>
                  <h3 className="font-medium mb-3">Preview (first 10 rows)</h3>
                  <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.columns.map((col) => (
                            <TableHead key={col.name} className="text-xs sticky top-0 bg-background">
                              {col.name}
                              <Badge variant="outline" className="ml-2 text-xs">
                                {col.type}
                              </Badge>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.preview.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            {previewData.columns.map((col) => (
                              <TableCell key={col.name} className="text-xs">
                                {String(row[col.name] ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Select Columns to Analyze</h3>
                    <p className="text-sm text-muted-foreground">
                      Selected {selectedColumns.size} / 10
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can select up to 10 columns (Starter plan). Upgrade for more columns.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {previewData.columns.map((col) => {
                      const isSelected = selectedColumns.has(col.name);
                      const isDisabled = !isSelected && selectedColumns.size >= 10;
                      return (
                        <div
                          key={col.name}
                          className={cn(
                            "flex items-center space-x-2 rounded-lg border p-3",
                            isDisabled && "opacity-50 cursor-not-allowed",
                            isSelected && "border-indigo-500 bg-indigo-50"
                          )}
                        >
                          <Checkbox
                            id={col.name}
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={() => toggleColumn(col.name)}
                          />
                          <label
                            htmlFor={col.name}
                            className={cn(
                              "text-sm font-medium cursor-pointer flex-1",
                              isDisabled && "cursor-not-allowed"
                            )}
                          >
                            {col.name}
                          </label>
                          <Badge variant="outline" className="text-xs">
                            {col.type}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Google Sheets Tab */}
          <TabsContent value="sheets" className="space-y-6 mt-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {!sheetsConnected ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <Button
                  size="lg"
                  variant="outline"
                  className="mb-4"
                  onClick={handleConnectGoogleSheets}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Google Account"
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  After connecting, you'll be able to select spreadsheets and sheets
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Spreadsheet URL or ID</Label>
                  <Input
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Sheet Name</Label>
                  <Input
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Sheet1"
                    className="mt-2"
                  />
                </div>
                <Button onClick={handleConnectGoogleSheets} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Sheet"
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-6 mt-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <Label>Data Source Name</Label>
              <Input
                value={dataSourceName}
                onChange={(e) => setDataSourceName(e.target.value)}
                placeholder="My Database"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Database Type</Label>
              <Select value={dbType} onValueChange={(v: "postgres" | "mysql") => setDbType(v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Host</Label>
                <Input
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  placeholder="localhost"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Port</Label>
                <Input
                  value={dbPort}
                  onChange={(e) => setDbPort(e.target.value)}
                  placeholder={dbType === "postgres" ? "5432" : "3306"}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Database</Label>
                <Input
                  value={dbDatabase}
                  onChange={(e) => setDbDatabase(e.target.value)}
                  placeholder="mydb"
                  className="mt-2"
                />
              </div>
              {dbType === "postgres" && (
                <div>
                  <Label>Schema</Label>
                  <Input
                    value={dbSchema}
                    onChange={(e) => setDbSchema(e.target.value)}
                    placeholder="public"
                    className="mt-2"
                  />
                </div>
              )}
              <div>
                <Label>Username</Label>
                <Input
                  value={dbUsername}
                  onChange={(e) => setDbUsername(e.target.value)}
                  placeholder="user"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="mt-2"
                />
              </div>
              <div className={dbType === "postgres" ? "col-span-2" : ""}>
                <Label>Table Name</Label>
                <Input
                  value={dbTableName}
                  onChange={(e) => setDbTableName(e.target.value)}
                  placeholder="users"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTestDatabase} disabled={loading} variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>

            {dbPreview && (
              <>
                <div>
                  <h3 className="font-medium mb-3">Preview (first 10 rows)</h3>
                  <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {dbPreview.columns.map((col) => (
                            <TableHead key={col.name} className="text-xs sticky top-0 bg-background">
                              {col.name}
                              <Badge variant="outline" className="ml-2 text-xs">
                                {col.type}
                              </Badge>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dbPreview.preview.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            {dbPreview.columns.map((col) => (
                              <TableCell key={col.name} className="text-xs">
                                {String(row[col.name] ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Select Columns to Analyze</h3>
                    <p className="text-sm text-muted-foreground">
                      Selected {selectedColumns.size} / 10
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {dbPreview.columns.map((col) => {
                      const isSelected = selectedColumns.has(col.name);
                      const isDisabled = !isSelected && selectedColumns.size >= 10;
                      return (
                        <div
                          key={col.name}
                          className={cn(
                            "flex items-center space-x-2 rounded-lg border p-3",
                            isDisabled && "opacity-50 cursor-not-allowed",
                            isSelected && "border-indigo-500 bg-indigo-50"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked && !isDisabled) {
                                setSelectedColumns(new Set([...selectedColumns, col.name]));
                              } else if (!checked) {
                                const newSet = new Set(selectedColumns);
                                newSet.delete(col.name);
                                setSelectedColumns(newSet);
                              }
                            }}
                            disabled={isDisabled}
                          />
                          <Label className="flex-1 cursor-pointer">
                            {col.name}
                            <Badge variant="outline" className="ml-2 text-xs">
                              {col.type}
                            </Badge>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* REST API Tab */}
          <TabsContent value="api" className="space-y-6 mt-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <Label>Data Source Name</Label>
              <Input
                value={dataSourceName}
                onChange={(e) => setDataSourceName(e.target.value)}
                placeholder="My API"
                className="mt-2"
              />
            </div>

            <div>
              <Label>API Endpoint URL</Label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.example.com/data"
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>HTTP Method</Label>
                <Select value={apiMethod} onValueChange={setApiMethod}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Authentication</Label>
                <Select value={apiAuthType} onValueChange={setApiAuthType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {apiAuthType === "bearer" && (
              <div>
                <Label>Bearer Token</Label>
                <Input
                  type="password"
                  value={apiAuthConfig.token || ""}
                  onChange={(e) => setApiAuthConfig({ ...apiAuthConfig, token: e.target.value })}
                  placeholder="Enter bearer token"
                  className="mt-2"
                />
              </div>
            )}

            {apiAuthType === "api_key" && (
              <div className="space-y-4">
                <div>
                  <Label>API Key Name</Label>
                  <Input
                    value={apiAuthConfig.key || ""}
                    onChange={(e) => setApiAuthConfig({ ...apiAuthConfig, key: e.target.value })}
                    placeholder="X-API-Key"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>API Key Value</Label>
                  <Input
                    type="password"
                    value={apiAuthConfig.value || ""}
                    onChange={(e) => setApiAuthConfig({ ...apiAuthConfig, value: e.target.value })}
                    placeholder="Enter API key"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Select
                    value={apiAuthConfig.location || "header"}
                    onValueChange={(v) => setApiAuthConfig({ ...apiAuthConfig, location: v })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="query">Query Parameter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {apiAuthType === "basic" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username</Label>
                  <Input
                    value={apiAuthConfig.username || ""}
                    onChange={(e) => setApiAuthConfig({ ...apiAuthConfig, username: e.target.value })}
                    placeholder="username"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={apiAuthConfig.password || ""}
                    onChange={(e) => setApiAuthConfig({ ...apiAuthConfig, password: e.target.value })}
                    placeholder="password"
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleTestAPI} disabled={loading} variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Request"
                )}
              </Button>
            </div>

            {apiPreview && (
              <>
                <div>
                  <h3 className="font-medium mb-3">Preview (first 10 rows)</h3>
                  <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {apiPreview.columns.map((col) => (
                            <TableHead key={col.name} className="text-xs sticky top-0 bg-background">
                              {col.name}
                              <Badge variant="outline" className="ml-2 text-xs">
                                {col.type}
                              </Badge>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apiPreview.preview.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            {apiPreview.columns.map((col) => (
                              <TableCell key={col.name} className="text-xs">
                                {String(row[col.name] ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Select Columns to Analyze</h3>
                    <p className="text-sm text-muted-foreground">
                      Selected {selectedColumns.size} / 10
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {apiPreview.columns.map((col) => {
                      const isSelected = selectedColumns.has(col.name);
                      const isDisabled = !isSelected && selectedColumns.size >= 10;
                      return (
                        <div
                          key={col.name}
                          className={cn(
                            "flex items-center space-x-2 rounded-lg border p-3",
                            isDisabled && "opacity-50 cursor-not-allowed",
                            isSelected && "border-indigo-500 bg-indigo-50"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked && !isDisabled) {
                                setSelectedColumns(new Set([...selectedColumns, col.name]));
                              } else if (!checked) {
                                const newSet = new Set(selectedColumns);
                                newSet.delete(col.name);
                                setSelectedColumns(newSet);
                              }
                            }}
                            disabled={isDisabled}
                          />
                          <Label className="flex-1 cursor-pointer">
                            {col.name}
                            <Badge variant="outline" className="ml-2 text-xs">
                              {col.type}
                            </Badge>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          {activeTab === "csv" && (
            <Button
              onClick={handleConnectCSV}
              disabled={!csvFile || !previewData || selectedColumns.size === 0 || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}
          {activeTab === "sheets" && sheetsConnected && (
            <Button onClick={handleConnectGoogleSheets} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}
          {activeTab === "database" && dbPreview && (
            <Button
              onClick={handleConnectDatabase}
              disabled={selectedColumns.size === 0 || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}
          {activeTab === "api" && apiPreview && (
            <Button
              onClick={handleConnectAPI}
              disabled={selectedColumns.size === 0 || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
