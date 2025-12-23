import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Database,
  RefreshCw,
  Settings,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataSourceCardProps {
  name: string;
  type: "CSV" | "Google Sheets" | "PostgreSQL" | "MySQL" | "API";
  status: "connected" | "syncing" | "error";
  lastSynced: string;
  rows: string;
  columns: string;
  preview?: Array<Record<string, string>>;
  errorMessage?: string;
}

const typeIcons = {
  CSV: FileText,
  "Google Sheets": FileText,
  PostgreSQL: Database,
  MySQL: Database,
  API: Database,
};

export function DataSourceCard({
  name,
  type,
  status,
  lastSynced,
  rows,
  columns,
  preview,
  errorMessage,
}: DataSourceCardProps) {
  const Icon = typeIcons[type] || Database;

  return (
    <Card className="hover:shadow-md transition-all group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg",
                type === "CSV" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
                type === "Google Sheets" && "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
                type === "PostgreSQL" && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
                type === "MySQL" && "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400",
                type === "API" && "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400"
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">{name}</h3>
              <Badge variant="outline" className="mt-1">
                {type}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "h-2 w-2 rounded-full mr-2",
                status === "connected" && "bg-green-500",
                status === "syncing" && "bg-yellow-500",
                status === "error" && "bg-red-500"
              )}
            />
            <span
              className={cn(
                "text-sm",
                status === "connected" && "text-green-600 dark:text-green-400",
                status === "syncing" && "text-yellow-600 dark:text-yellow-400",
                status === "error" && "text-red-600 dark:text-red-400"
              )}
            >
              {status === "connected" && "Connected"}
              {status === "syncing" && "Syncing..."}
              {status === "error" && "Connection Error"}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-3">
            <p className="text-sm font-medium text-red-800 dark:text-red-400">
              Connection Issue
            </p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="space-y-2 mb-4 text-sm text-muted-foreground">
          <p>Last synced: {lastSynced}</p>
          <p>{rows} rows</p>
          <p>{columns} columns selected</p>
        </div>

        {preview && preview.length > 0 && (
          <div className="mb-4 rounded-lg border overflow-hidden">
            <Table>
              <TableBody>
                {preview.slice(0, 3).map((row, idx) => (
                  <TableRow key={idx}>
                    {Object.values(row).map((cell, cellIdx) => (
                      <TableCell key={cellIdx} className="text-xs py-2">
                        {String(cell).substring(0, 20)}
                        {String(cell).length > 20 && "..."}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}







