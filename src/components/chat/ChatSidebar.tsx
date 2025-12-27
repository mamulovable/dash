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
    <div className="flex h-full w-[280px] flex-shrink-0 flex-col border-r border-border/50 bg-gradient-to-b from-background to-muted/10 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      {/* Data Source Selector */}
      <div>
        <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Data Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
              </div>
            ) : selectedSourceData ? (
              <>
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50/50 dark:from-indigo-950/50 dark:to-purple-950/30 p-4 border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0">
                      <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-indigo-900 dark:text-indigo-100">{selectedSourceData.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(selectedSourceData.row_count || 0).toLocaleString()} rows
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Connected Sources ({dataSources.length})
                  </p>
                  {dataSources.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground rounded-lg bg-muted/30 border border-dashed">
                      <p className="mb-2">No data sources</p>
                      <Link href="/data-sources">
                        <Button variant="ghost" size="sm" className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50">
                          Connect one →
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {dataSources.map((source) => {
                        const isSelected = selectedDataSourceId === source.id;
                        return (
                          <button
                            key={source.id}
                            onClick={() => handleSourceSelect(source)}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-lg p-3 text-left transition-all duration-200",
                              "hover:bg-accent/80 hover:shadow-sm",
                              isSelected 
                                ? "bg-gradient-to-r from-indigo-50 to-purple-50/50 dark:from-indigo-950/50 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 shadow-sm" 
                                : "border border-transparent hover:border-border/50"
                            )}
                          >
                            <div className="relative flex-shrink-0">
                              <div
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full flex-shrink-0",
                                  source.status === "connected" && "bg-green-500 shadow-sm shadow-green-500/50",
                                  source.status === "syncing" && "bg-yellow-500 shadow-sm shadow-yellow-500/50 animate-pulse",
                                  source.status === "error" && "bg-red-500 shadow-sm shadow-red-500/50"
                                )}
                              />
                              {source.status === "connected" && (
                                <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 animate-ping opacity-75"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium truncate transition-colors",
                                isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-foreground"
                              )}>
                                {source.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatType(source.type)} • {(source.row_count || 0).toLocaleString()} rows
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground rounded-lg bg-muted/30 border border-dashed">
                <p className="mb-1 font-medium">No data source selected</p>
                <p className="text-xs">Select a source to start querying</p>
              </div>
            )}
            <Link href="/data-sources">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-all duration-200"
              >
                + Connect new source
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Query Templates */}
      <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold tracking-tight">Query Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {Object.entries(templates).map(([category, items]) => {
            const isExpanded = expandedCategories.includes(category);
            return (
              <div key={category} className="mb-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between rounded-lg p-2.5 hover:bg-accent/80 transition-all duration-200 group"
                >
                  <span className="text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {category}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 space-y-1 mt-1.5 animate-in slide-in-from-top-2 duration-200">
                    {items.map((template) => (
                      <button
                        key={template}
                        className="w-full text-left text-sm text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 hover:bg-accent/60 transition-all duration-150 hover:translate-x-1"
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

