"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataSourceCard } from "@/components/data-sources/DataSourceCard";
import { ConnectModal } from "@/components/data-sources/ConnectModal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database, Loader2 } from "lucide-react";
import Link from "next/link";

interface DataSourceDisplay {
  id: string;
  name: string;
  type: "CSV" | "Google Sheets" | "PostgreSQL" | "MySQL" | "API";
  status: "connected" | "syncing" | "error";
  lastSynced: string;
  rows: string;
  columns: string;
  preview?: Array<Record<string, string>>;
  errorMessage?: string;
}

function formatType(type: string): "CSV" | "Google Sheets" | "PostgreSQL" | "MySQL" | "API" {
  const typeMap: Record<string, "CSV" | "Google Sheets" | "PostgreSQL" | "MySQL" | "API"> = {
    csv: "CSV",
    sheets: "Google Sheets",
    postgres: "PostgreSQL",
    mysql: "MySQL",
    api: "API",
  };
  return typeMap[type.toLowerCase()] || "CSV";
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default function DataSourcesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dataSources, setDataSources] = useState<DataSourceDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ count: 0, limit: 5, can_add: true });

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/data-sources");
      const result = await response.json();

      if (result.success) {
        const formatted: DataSourceDisplay[] = result.data.map((ds: Record<string, unknown>) => {
          // Parse JSONB fields (they come as strings from database)
          let selectedCols: string[] = [];
          try {
            if (typeof ds.selected_columns === 'string') {
              selectedCols = JSON.parse(ds.selected_columns);
            } else if (Array.isArray(ds.selected_columns)) {
              selectedCols = ds.selected_columns;
            }
          } catch (e) {
            console.error("Error parsing selected_columns:", e);
          }
          
          return {
            id: ds.id,
            name: ds.name,
            type: formatType(ds.type),
            status: ds.status || "connected",
            lastSynced: formatTimeAgo(ds.last_synced_at),
            rows: `${(ds.row_count || 0).toLocaleString()} rows`,
            columns: `${selectedCols.length} columns selected`,
          };
        });
        setDataSources(formatted);
        setMeta(result.meta || { count: formatted.length, limit: 5, can_add: true });
      }
    } catch (error) {
      console.error("Error fetching data sources:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      // Refresh data sources when modal closes (after successful connection)
      fetchDataSources();
    }
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: "Data Sources" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Data Sources</h1>
            <p className="text-muted-foreground">
              Connect and manage your data
            </p>
          </div>
          <Button variant="gradient" onClick={() => setIsModalOpen(true)}>
            + Add Data Source
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Data Sources</span>
              <span className="text-sm text-muted-foreground">
                {meta.count} / {meta.limit}
              </span>
            </div>
            <Progress value={(meta.count / meta.limit) * 100} className="w-32 h-2" />
          </div>
          <div className="flex items-center gap-4">
            {!meta.can_add && (
              <Link
                href="/pricing"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Upgrade to Pro for 15 sources
              </Link>
            )}
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                All sources synced
              </span>
            </div>
          </div>
        </div>

        {/* Data Sources Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : dataSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Database className="h-24 w-24 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No data sources yet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your first data source to start analyzing
            </p>
            <Button variant="gradient" onClick={() => setIsModalOpen(true)}>
              Connect Data Source
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dataSources.map((source) => (
              <DataSourceCard key={source.id} {...source} />
            ))}
          </div>
        )}

        <ConnectModal 
          open={isModalOpen} 
          onOpenChange={handleModalClose}
          onSuccess={fetchDataSources}
        />
      </div>
    </DashboardLayout>
  );
}



