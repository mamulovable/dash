"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QueryActivityChart } from "@/components/dashboard/QueryActivityChart";
import { RecentQueries } from "@/components/dashboard/RecentQueries";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { BarChart, Zap, Database, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  queries: {
    used: number;
    limit: number;
    progress: number;
    trend: string;
  };
  cache: {
    hitRate: number;
    cachedQueries: number;
    savedCost: string;
  };
  dataSources: {
    count: number;
    limit: number;
  };
  activity: Array<{ date: string; cached: number; api: number }>;
  recentQueries: Array<{
    id: string;
    query: string;
    source: string;
    timestamp: Date;
  }>;
  user: {
    name: string;
    resetDate: Date;
    daysUntilReset: number;
  };
  dashboards?: {
    count: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard/stats");
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Dashboard" }]} showNewQuery>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Dashboard" }]} showNewQuery>
        <div className="text-center py-24">
          <p className="text-muted-foreground">Failed to load dashboard stats</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard" }]} showNewQuery>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {stats.user.name}</h1>
            <p className="text-muted-foreground">
              {currentDate} • {currentTime}
            </p>
          </div>
          <Link href="/chat">
            <Button variant="gradient">+ New Query</Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<BarChart className="h-5 w-5" />}
            value={stats.queries.used.toString()}
            label="Queries used"
            progress={stats.queries.progress}
            trend={stats.queries.trend}
          />
          <StatCard
            icon={<Zap className="h-5 w-5" />}
            value={`${stats.cache.hitRate}%`}
            label="Cache hit rate"
            subtitle={`${stats.cache.cachedQueries} queries from cache • Saved $${stats.cache.savedCost} in costs`}
          />
          <StatCard
            icon={<Database className="h-5 w-5" />}
            value={stats.dataSources.count.toString()}
            label="Connected sources"
            subtitle={`${stats.dataSources.limit === Infinity ? "Unlimited" : stats.dataSources.limit} available in your plan`}
            link={{ text: "Connect new source", href: "/data-sources" }}
          />
          <StatCard
            icon={<Layout className="h-5 w-5" />}
            value={stats.dashboards?.count?.toString() || "0"}
            label="Dashboard collections"
            link={{ text: "Create dashboard", href: "/dashboards" }}
          />
        </div>

        {/* Chart and Recent Queries */}
        <div className="grid gap-6 lg:grid-cols-2">
          <QueryActivityChart data={stats.activity} />
          <RecentQueries queries={stats.recentQueries} />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <QuickActions />
        </div>
      </div>
    </DashboardLayout>
  );
}




