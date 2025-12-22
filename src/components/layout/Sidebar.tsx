"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  MessageSquare,
  Database,
  Code,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Data Sources", href: "/data-sources", icon: Database },
  { name: "Queries", href: "/queries", icon: Code },
  { name: "Team", href: "/team", icon: Users, badge: "Pro" },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [usage, setUsage] = useState<{
    queries_used: number;
    queries_limit: number;
    reset_date: string;
  } | null>(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/users");
      const result = await response.json();
      if (result.success && result.data.usage) {
        setUsage({
          queries_used: result.data.usage.queries_used,
          queries_limit: result.data.usage.queries_limit,
          reset_date: result.data.usage.reset_date,
        });
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    }
  };

  const progress = usage && usage.queries_limit > 0
    ? Math.round((usage.queries_used / usage.queries_limit) * 100)
    : 0;

  const daysUntilReset = usage?.reset_date
    ? Math.ceil(
        (new Date(usage.reset_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const userName = user?.fullName || user?.firstName || "User";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userInitials = user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || "U";
  const userAvatar = user?.imageUrl || "";

  return (
    <div className="flex h-screen w-60 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
            D
          </div>
          <span className="text-xl font-bold">DashMind</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Query Usage */}
      {usage && (
        <div className="border-t p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Query Usage</span>
              <span className="font-medium">
                {usage.queries_used} / {usage.queries_limit === Infinity ? "∞" : usage.queries_limit}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {daysUntilReset !== null && (
              <p className="text-xs text-muted-foreground">
                Resets in {daysUntilReset} {daysUntilReset === 1 ? "day" : "days"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* User Profile */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback>{userInitials.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <Link href="/settings">
              <DropdownMenuItem>Profile</DropdownMenuItem>
            </Link>
            <Link href="/settings">
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <SignOutButton>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}




