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
    <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
          Try asking about your data:
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className={cn(
              "text-xs h-auto py-1.5 px-3",
              "hover:bg-indigo-100 dark:hover:bg-indigo-900",
              "hover:border-indigo-300 dark:hover:border-indigo-700",
              "transition-colors"
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


