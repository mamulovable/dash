"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  queryCount: number;
  queryLimit: number;
}

const promptChips = ["Top customers", "Revenue trends", "Last 30 days"];

export function ChatInput({ onSend, queryCount, queryLimit }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "48px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && queryCount < queryLimit) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const remaining = queryLimit - queryCount;
  const isLow = remaining <= 10;
  const isWarning = remaining <= 20;

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your data... (e.g., 'Show me revenue by month')"
            className="min-h-[48px] max-h-[120px] resize-none pr-12"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || queryCount >= queryLimit}
            size="icon"
            variant="gradient"
            className="absolute right-2 bottom-2 h-8 w-8"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium",
              isLow && "text-red-600 dark:text-red-400",
              isWarning && !isLow && "text-yellow-600 dark:text-yellow-400",
              !isWarning && "text-green-600 dark:text-green-400"
            )}
          >
            {remaining} / {queryLimit} queries remaining
          </span>
        </div>
        <div className="flex items-center gap-2">
          {promptChips.map((chip) => (
            <Badge
              key={chip}
              variant="outline"
              className="cursor-pointer hover:bg-accent text-xs"
              onClick={() => setMessage(chip)}
            >
              {chip}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}






