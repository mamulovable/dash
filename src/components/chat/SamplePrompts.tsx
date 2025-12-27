"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SamplePromptsProps {
  prompts: string[];
  loading?: boolean;
  onPromptSelect?: (prompt: string) => void;
}

export function SamplePrompts({ prompts, loading, onPromptSelect }: SamplePromptsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prompts || prompts.length === 0) {
    return null;
  }

  return (
    <div className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-pink-50/30 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/15 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
          <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 tracking-tight">
          Try asking about your data:
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {prompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className={cn(
              "text-xs h-auto py-2 px-4 rounded-lg",
              "bg-white/60 dark:bg-black/20 backdrop-blur-sm",
              "border-indigo-200/60 dark:border-indigo-800/60",
              "hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/50 dark:hover:to-purple-950/30",
              "hover:border-indigo-300 dark:hover:border-indigo-700",
              "hover:shadow-sm hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/20",
              "transition-all duration-200 hover:scale-[1.02]",
              "text-foreground/80 hover:text-foreground",
              "font-medium"
            )}
            onClick={() => onPromptSelect?.(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}



