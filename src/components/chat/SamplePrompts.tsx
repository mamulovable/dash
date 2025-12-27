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
    <div className="py-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50">
          <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 tracking-tight">
          Try asking:
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {prompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className={cn(
              "text-xs h-auto py-1 px-2.5 rounded-md",
              "bg-white/60 dark:bg-black/20 backdrop-blur-sm",
              "border-indigo-200/60 dark:border-indigo-800/60",
              "hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/50 dark:hover:to-purple-950/30",
              "hover:border-indigo-300 dark:hover:border-indigo-700",
              "hover:shadow-sm hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/20",
              "transition-all duration-200 hover:scale-[1.02]",
              "text-foreground/80 hover:text-foreground",
              "font-medium",
              "line-clamp-1"
            )}
            onClick={() => onPromptSelect?.(prompt)}
            title={prompt}
          >
            {prompt.length > 45 ? `${prompt.substring(0, 45)}...` : prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}



