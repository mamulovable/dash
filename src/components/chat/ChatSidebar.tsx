"use client";

import { useState } from "react";
import {
  Database,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DataSource } from "@/types";

function formatType(type: string): string {
  const typeMap: Record<string, string> = {
    csv: "CSV",
    sheets: "Google Sheets",
    postgres: "PostgreSQL",
    mysql: "MySQL",
    api: "API",
  };
  return typeMap[type.toLowerCase()] || type;
}


const templates = {
  Sales: [
    "Show revenue by month",
    "Top 10 customers",
    "Sales by region",
  ],
  Marketing: [
    "Conversion funnel",
    "Campaign performance",
    "Customer acquisition cost",
  ],
  Finance: [
    "Monthly recurring revenue",
    "Churn rate analysis",
    "Revenue trends",
  ],
  Operations: [
    "Inventory levels",
    "Order fulfillment",
    "Supply chain metrics",
  ],
};

interface ChatSidebarProps {
  onDataSourceSelect?: (id: string, name: string) => void;
  selectedDataSourceId?: string | null;
  dataSources?: DataSource[];
  loading?: boolean;
}

export function ChatSidebar({ 
  onDataSourceSelect, 
  selectedDataSourceId,
  dataSources = [],
  loading = false,
}: ChatSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const handleSourceSelect = (source: DataSource) => {
    onDataSourceSelect?.(source.id, source.name);
  };

  const selectedSourceData = dataSources.find(s => s.id === selectedDataSourceId);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="flex h-full w-[280px] flex-shrink-0 flex-col border-r bg-background p-4 space-y-4 overflow-y-auto">
      {/* Data Source Selector */}
      <div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Data Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : selectedSourceData ? (
              <>
                <div className="flex items-center justify-between rounded-lg bg-indigo-50 dark:bg-indigo-950 p-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedSourceData.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedSourceData.row_count || 0).toLocaleString()} rows
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Connected Sources ({dataSources.length})
                  </p>
                  {dataSources.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      <p className="mb-2">No data sources</p>
                      <Link href="/data-sources">
                        <Button variant="ghost" size="sm" className="text-indigo-600 dark:text-indigo-400">
                          Connect one →
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    dataSources.map((source) => {
                      return (
                        <button
                          key={source.id}
                          onClick={() => handleSourceSelect(source)}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-lg p-2 text-left hover:bg-accent transition-colors",
                            selectedDataSourceId === source.id && "bg-indigo-50 dark:bg-indigo-950"
                          )}
                        >
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full flex-shrink-0",
                              source.status === "connected" && "bg-green-500",
                              source.status === "syncing" && "bg-yellow-500",
                              source.status === "error" && "bg-red-500"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{source.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatType(source.type)} • {(source.row_count || 0).toLocaleString()} rows
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <p className="mb-2">No data source selected</p>
                <p className="text-xs mb-3">Select a source to start querying</p>
              </div>
            )}
            <Link href="/data-sources">
              <Button variant="ghost" size="sm" className="w-full text-indigo-600 dark:text-indigo-400">
                + Connect new source
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Query Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Query Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
          {Object.entries(templates).map(([category, items]) => {
            const isExpanded = expandedCategories.includes(category);
            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between rounded-lg p-2 hover:bg-accent transition-colors"
                >
                  <span className="text-sm font-medium">{category}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 space-y-1 mt-1">
                    {items.map((template) => (
                      <button
                        key={template}
                        className="w-full text-left text-sm text-muted-foreground hover:text-foreground rounded px-2 py-1 hover:bg-accent"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

