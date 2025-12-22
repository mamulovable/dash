import { Card, CardContent } from "@/components/ui/card";
import { Plus, Upload, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const actions = [
  {
    title: "New Query",
    description: "Start analyzing",
    icon: Plus,
    href: "/chat",
    gradient: true,
  },
  {
    title: "Upload Data",
    description: "Add CSV or connect source",
    icon: Upload,
    href: "/data-sources",
  },
  {
    title: "View Templates",
    description: "50+ query templates",
    icon: Sparkles,
    href: "/chat?templates=true",
  },
];

export function QuickActions() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.title} href={action.href}>
            <Card
              className={`hover:shadow-md transition-all cursor-pointer ${
                action.gradient
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0"
                  : ""
              }`}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[120px]">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg mb-4 ${
                    action.gradient
                      ? "bg-white/20"
                      : "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">{action.title}</h3>
                <p
                  className={`text-sm ${
                    action.gradient
                      ? "text-white/90"
                      : "text-muted-foreground"
                  }`}
                >
                  {action.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}






