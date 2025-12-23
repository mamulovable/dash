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
      <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Select a Data Source</DialogTitle>
          <DialogDescription>
            Choose a data source to start asking questions and generating insights.
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
                      "cursor-pointer transition-all hover:border-indigo-500 hover:shadow-md",
                      isSelected && "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/30"
                    )}
                    onClick={() => setSelectedId(source.id)}
                    onDoubleClick={() => handleCardDoubleClick(source.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "p-3 rounded-lg",
                            isSelected
                              ? "bg-indigo-100 dark:bg-indigo-900"
                              : "bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              isSelected
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base mb-1 truncate">
                                {source.name}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>{formatType(source.type)}</span>
                                <span>•</span>
                                <span>{(source.row_count || 0).toLocaleString()} rows</span>
                                {source.status && (
                                  <>
                                    <span>•</span>
                                    <span
                                      className={cn(
                                        "capitalize",
                                        source.status === "connected" && "text-green-600 dark:text-green-400",
                                        source.status === "syncing" && "text-yellow-600 dark:text-yellow-400",
                                        source.status === "error" && "text-red-600 dark:text-red-400"
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
                                <div className="h-6 w-6 rounded-full bg-indigo-600 dark:bg-indigo-400 flex items-center justify-center">
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
          <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t">
            <Link href="/data-sources">
              <Button variant="ghost" size="sm">
                + Connect New Source
              </Button>
            </Link>
            <Button
              onClick={handleConfirm}
              disabled={!selectedId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Continue with Selected Source
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

