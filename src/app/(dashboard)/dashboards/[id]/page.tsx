"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  queries: string[];
  layout: Record<string, unknown>;
  is_public: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export default function DashboardDetailPage() {
  const params = useParams();
  const dashboardId = params.id as string;
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dashboardId) {
      fetchDashboard();
    }
  }, [dashboardId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboards/${dashboardId}`);
      const result = await response.json();

      if (result.success) {
        setDashboard(result.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Dashboards", href: "/dashboards" }, { label: "Loading..." }]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboard) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Dashboards", href: "/dashboards" }, { label: "Not Found" }]}>
        <div className="text-center py-24">
          <p className="text-muted-foreground">Dashboard not found</p>
          <Link href="/dashboards">
            <Button variant="outline" className="mt-4">
              Back to Dashboards
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboards", href: "/dashboards" }, { label: dashboard.name }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="text-muted-foreground mt-1">{dashboard.description}</p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard Content</CardTitle>
            <CardDescription>
              {Array.isArray(dashboard.queries) && dashboard.queries.length > 0
                ? `${dashboard.queries.length} query${dashboard.queries.length !== 1 ? "ies" : ""} in this dashboard`
                : "No queries added yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Array.isArray(dashboard.queries) && dashboard.queries.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Dashboard visualization coming soon. You can add queries to this dashboard from the queries page.
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">This dashboard is empty</p>
                <Link href="/queries">
                  <Button variant="outline">Go to Queries</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}



