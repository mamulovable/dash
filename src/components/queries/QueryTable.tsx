"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Star, Database, MoreVertical, Zap, Eye, Plus, Share2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Query } from "@/types";

interface QueryTableProps {
  queries: Query[];
  onRefresh: () => void;
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const queryDate = typeof date === "string" ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - queryDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? "week" : "weeks"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
}

export function QueryTable({ queries, onRefresh }: QueryTableProps) {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(queries.filter((q) => q.is_favorite).map((q) => q.id))
  );

  const toggleFavorite = async (id: string) => {
    try {
      const response = await fetch(`/api/queries/${id}/favorite`, {
        method: "PATCH",
      });
      if (response.ok) {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
        onRefresh();
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this query?")) {
      return;
    }
    try {
      const response = await fetch(`/api/queries/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error deleting query:", error);
    }
  };

  const handleRerun = async (id: string) => {
    try {
      const response = await fetch(`/api/queries/${id}/rerun`, {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.dataSourceId) {
          router.push(`/chat?dataSourceId=${result.dataSourceId}&prompt=${encodeURIComponent(result.prompt)}`);
        }
      }
    } catch (error) {
      console.error("Error re-running query:", error);
    }
  };

  if (queries.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center">
        <p className="text-muted-foreground">No queries found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Query</TableHead>
            <TableHead className="w-[150px]">Data Source</TableHead>
            <TableHead className="w-[120px]">Timestamp</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[80px]">Cost</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queries.map((query) => {
            const queryObj = query as Record<string, unknown>;
            const dataSourceName = (queryObj.data_source_name || queryObj.data_source_type || "Unknown") as string;
            const isFavorite = favorites.has(query.id) || query.is_favorite;
            
            return (
              <TableRow
                key={query.id}
                className={cn(
                  "cursor-pointer",
                  isFavorite && "bg-yellow-50/50 dark:bg-yellow-950/10"
                )}
              >
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(query.id);
                    }}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        isFavorite
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </Button>
                </TableCell>
                <TableCell>
                  <p className="max-w-md truncate" title={query.prompt}>
                    {query.prompt}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    <Database className="h-3 w-3 mr-1" />
                    {dataSourceName}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTimeAgo(query.created_at)}
                </TableCell>
                <TableCell>
                  {query.cached ? (
                    <Badge variant="success" className="gap-1">
                      <Zap className="h-3 w-3" />
                      Cached
                    </Badge>
                  ) : (
                    <Badge variant="outline">API Call</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {query.cached ? "FREE" : "1 query"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRerun(query.id)}>
                        <Zap className="mr-2 h-4 w-4" />
                        Re-run query
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Plus className="mr-2 h-4 w-4" />
                        Add to dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share with team
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(query.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}




