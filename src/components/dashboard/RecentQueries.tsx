"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Code } from "lucide-react";
import Link from "next/link";

interface RecentQuery {
  id: string;
  query: string;
  source: string;
  timestamp: Date | string;
}

interface RecentQueriesProps {
  queries?: RecentQuery[];
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

export function RecentQueries({ queries = [] }: RecentQueriesProps) {
  if (queries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No recent queries
          </div>
          <Link
            href="/queries"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-4 inline-block"
          >
            View all queries →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Queries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {queries.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg p-3 hover:bg-accent transition-colors group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                <Code className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.query}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    <Database className="h-3 w-3 mr-1" />
                    {item.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/queries"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-4 inline-block"
        >
          View all queries →
        </Link>
      </CardContent>
    </Card>
  );
}




