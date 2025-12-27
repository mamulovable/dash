"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database, FileSpreadsheet, Globe, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DataSource } from "@/types";

interface DataSourceSelectionModalProps {
  open: boolean;
  dataSources: DataSource[];
  loading: boolean;
  onSelect: (id: string, name: string) => void;
}

function formatType(type: string): string {
  const typeMap: Record<string, string> = {
    csv: "CSV",
    sheets: "Google Sheets",
    postgres: "PostgreSQL",
    mysql: "MySQL",
    api: "REST API",
  };
  return typeMap[type.toLowerCase()] || type;
}

function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "csv":
      return FileSpreadsheet;
    case "api":
      return Globe;
    default:
      return Database;
  }
}

export function DataSourceSelectionModal({
  open,
  dataSources,
  loading,
  onSelect,
}: DataSourceSelectionModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedId) {
      const source = dataSources.find((ds) => ds.id === selectedId);
      if (source) {
        onSelect(source.id, source.name);
        setSelectedId(null);
      }
    }
  };

  const handleCardDoubleClick = (sourceId: string) => {
    const source = dataSources.find((ds) => ds.id === sourceId);
    if (source) {
      onSelect(source.id, source.name);
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Select a Data Source
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Choose a data source to start asking questions and generating insights from your data.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dataSources.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <Database className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium mb-2">No data sources available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your first data source to start analyzing your data
                </p>
                <Link href="/data-sources">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Connect Data Source
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {dataSources.map((source) => {
                const Icon = getTypeIcon(source.type);
                const isSelected = selectedId === source.id;

                return (
                  <Card
                    key={source.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      "hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/20",
                      "hover:scale-[1.01]",
                      isSelected && "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 dark:ring-indigo-400/20 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/30 shadow-md"
                    )}
                    onClick={() => setSelectedId(source.id)}
                    onDoubleClick={() => handleCardDoubleClick(source.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "p-3.5 rounded-xl transition-all duration-200",
                            isSelected
                              ? "bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 shadow-sm"
                              : "bg-muted/60"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 transition-colors",
                              isSelected
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className={cn(
                                "font-semibold text-base mb-2 truncate transition-colors",
                                isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-foreground"
                              )}>
                                {source.name}
                              </h3>
                              <div className="flex items-center gap-2.5 text-sm text-muted-foreground flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-muted/60 text-xs font-medium">{formatType(source.type)}</span>
                                <span className="text-muted-foreground/50">•</span>
                                <span className="font-medium">{(source.row_count || 0).toLocaleString()} rows</span>
                                {source.status && (
                                  <>
                                    <span className="text-muted-foreground/50">•</span>
                                    <span
                                      className={cn(
                                        "capitalize px-2 py-0.5 rounded-md text-xs font-medium",
                                        source.status === "connected" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                                        source.status === "syncing" && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
                                        source.status === "error" && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                      )}
                                    >
                                      {source.status}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 dark:shadow-indigo-900/50 animate-in zoom-in duration-200">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {!loading && dataSources.length > 0 && (
          <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-border/50">
            <Link href="/data-sources">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              >
                + Connect New Source
              </Button>
            </Link>
            <Button
              onClick={handleConfirm}
              disabled={!selectedId}
              className={cn(
                "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white",
                "shadow-lg shadow-indigo-500/25 dark:shadow-indigo-900/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200 hover:scale-105 hover:shadow-xl",
                "px-6 font-semibold"
              )}
            >
              Continue with Selected Source
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

