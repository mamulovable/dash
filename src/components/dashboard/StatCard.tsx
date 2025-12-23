import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend?: string;
  progress?: number;
  subtitle?: string;
  link?: { text: string; href: string };
  className?: string;
}

export function StatCard({
  icon,
  value,
  label,
  trend,
  progress,
  subtitle,
  link,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                {icon}
              </div>
              <div>
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
            )}
            {progress !== undefined && (
              <div className="mt-4">
                <Progress
                  value={progress}
                  className={cn(
                    "h-2",
                    progress > 80 && "bg-yellow-500",
                    progress > 90 && "bg-red-500"
                  )}
                />
              </div>
            )}
            {trend && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                {trend}
              </p>
            )}
            {link && (
              <a
                href={link.href}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block"
              >
                {link.text} →
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}







