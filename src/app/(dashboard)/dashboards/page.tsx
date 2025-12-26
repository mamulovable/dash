"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Layout, Loader2, Trash2, Eye } from "lucide-react";
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

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dashboardName, setDashboardName] = useState("");
  const [dashboardDescription, setDashboardDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboards");
      const result = await response.json();

      if (result.success) {
        setDashboards(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching dashboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDashboard = async () => {
    if (!dashboardName.trim()) {
      alert("Please enter a dashboard name");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dashboardName,
          description: dashboardDescription || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCreateDialogOpen(false);
        setDashboardName("");
        setDashboardDescription("");
        fetchDashboards();
      } else {
        alert(result.error || "Failed to create dashboard");
      }
    } catch (error) {
      console.error("Error creating dashboard:", error);
      alert("Failed to create dashboard");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDashboard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dashboard?")) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboards/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        fetchDashboards();
      } else {
        alert(result.error || "Failed to delete dashboard");
      }
    } catch (error) {
      console.error("Error deleting dashboard:", error);
      alert("Failed to delete dashboard");
    }
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Dashboards" }]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboards" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Collections</h1>
            <p className="text-muted-foreground">
              Create and manage your dashboard collections
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Create Dashboard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Dashboard</DialogTitle>
                <DialogDescription>
                  Create a new dashboard collection to organize your queries
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Dashboard Name</Label>
                  <Input
                    id="name"
                    value={dashboardName}
                    onChange={(e) => setDashboardName(e.target.value)}
                    placeholder="My Dashboard"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={dashboardDescription}
                    onChange={(e) => setDashboardDescription(e.target.value)}
                    placeholder="Dashboard description"
                    className="mt-2"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDashboard} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {dashboards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-24">
              <Layout className="h-24 w-24 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">No dashboards yet</h2>
              <p className="text-muted-foreground mb-6">
                Create your first dashboard collection to organize your queries
              </p>
              <Button variant="gradient" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((dashboard) => (
              <Card key={dashboard.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{dashboard.name}</CardTitle>
                      {dashboard.description && (
                        <CardDescription className="mt-1">
                          {dashboard.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteDashboard(dashboard.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Queries</span>
                      <span className="font-medium">
                        {Array.isArray(dashboard.queries) ? dashboard.queries.length : 0}
                      </span>
                    </div>
                    <Link href={`/dashboards/${dashboard.id}`}>
                      <Button variant="outline" className="w-full">
                        <Eye className="mr-2 h-4 w-4" />
                        View Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}





