"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Download, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const queryPacks = [
  { price: "$19", queries: "100 queries", badge: null },
  { price: "$39", queries: "250 queries", badge: "Most Popular" },
  { price: "$69", queries: "500 queries", badge: "Best Value" },
];

const invoices = [
  {
    date: "Jan 15, 2024",
    description: "DataPulse Lifetime Deal",
    amount: "$59.00",
    status: "Paid",
  },
  {
    date: "Jan 10, 2024",
    description: "Query Pack - 100 queries",
    amount: "$19.00",
    status: "Paid",
  },
];

export default function UsagePage() {
  const [usageData, setUsageData] = useState<{
    user: { tier: string };
    usage: {
      queries_used: number;
      queries_limit: number;
      reset_date: string;
      data_sources: number;
      data_sources_limit: number;
      query_pack_balance: number;
    };
    stats: {
      cache_hit_rate: number;
      cached_queries: number;
      queries_this_month: number;
    };
    limits: {
      max_queries: number;
      max_data_sources: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
      const result = await response.json();
      if (result.success) {
        setUsageData(result.data);
      }
    } catch (error) {
      console.error("Error fetching usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Usage & Billing" }]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!usageData) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Usage & Billing" }]}>
        <div className="text-center py-24">
          <p className="text-muted-foreground">Failed to load usage data</p>
        </div>
      </DashboardLayout>
    );
  }

  const progress = usageData.usage.queries_limit > 0
    ? Math.round((usageData.usage.queries_used / usageData.usage.queries_limit) * 100)
    : 0;

  const resetDate = new Date(usageData.usage.reset_date);
  const daysUntilReset = Math.ceil(
    (resetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const tierName = usageData.user.tier.charAt(0).toUpperCase() + usageData.user.tier.slice(1);

  return (
    <DashboardLayout breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Usage & Billing" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usage & Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and monitor usage
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{tierName} Plan</CardTitle>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  Active
                </Badge>
              </div>
              <CardDescription>
                Your current subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {usageData.usage.queries_limit === Infinity ? "Unlimited" : `${usageData.usage.queries_limit} queries/month`}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {usageData.usage.data_sources_limit === Infinity ? "Unlimited" : `${usageData.usage.data_sources_limit} data sources`}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">1 user</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">All future updates</span>
                </li>
              </ul>
              <Button variant="gradient" className="w-full">
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>

          {/* Query Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Queries used this month</CardTitle>
              <CardDescription>
                Resets on {resetDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} (in {daysUntilReset} {daysUntilReset === 1 ? "day" : "days"})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="relative h-32 w-32">
                  <svg className="h-32 w-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                      className="text-indigo-600"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {usageData.usage.queries_used} / {usageData.usage.queries_limit === Infinity ? "∞" : usageData.usage.queries_limit}
                      </p>
                      <p className="text-sm text-muted-foreground">{progress}%</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly limit:</span>
                  <span className="font-medium">
                    {usageData.usage.queries_limit === Infinity ? "Unlimited" : `${usageData.usage.queries_limit} queries`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used:</span>
                  <span className="font-medium">{usageData.usage.queries_used} queries</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {usageData.usage.queries_limit === Infinity ? "Unlimited" : `${Math.max(0, usageData.usage.queries_limit - usageData.usage.queries_used)} queries`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cache Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Cache Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cache Hit Rate</span>
                <span className="text-2xl font-bold">{usageData.stats.cache_hit_rate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cached Queries</span>
                <span className="font-medium">{usageData.stats.cached_queries} queries</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Queries This Month</span>
                <span className="font-medium">{usageData.stats.queries_this_month} queries</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query Packs */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Additional Query Packs</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Need more queries? Purchase non-expiring packs
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {queryPacks.map((pack, idx) => (
              <Card key={idx} className="relative">
                {pack.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-indigo-500 text-white">
                      {pack.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-3xl">{pack.price}</CardTitle>
                  <CardDescription>{pack.queries}</CardDescription>
                  <CardDescription>Never expires</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant={pack.badge ? "gradient" : "outline"}
                    className="w-full"
                  >
                    Buy Pack
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Current Pack Balance */}
        {usageData.usage.query_pack_balance > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Extra Query Pack</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <p className="font-semibold">{usageData.usage.query_pack_balance} queries</p>
                  <p className="text-sm text-muted-foreground">
                    Available from query packs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice History */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell>{invoice.amount}</TableCell>
                    <TableCell>
                      <Badge variant="success">{invoice.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}




