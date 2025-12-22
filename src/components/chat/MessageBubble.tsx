import { Zap, RefreshCw, Download, Maximize, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  isUser: boolean;
  message: string;
  timestamp: string;
  isCached?: boolean;
  cacheTime?: string;
}

export function MessageBubble({
  isUser,
  message,
  timestamp,
  isCached,
  cacheTime,
}: MessageBubbleProps) {
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%]">
          <div className="rounded-2xl rounded-br-sm bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
            <p>{message}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">{timestamp}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%]">
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Maximize className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-[200px] rounded-lg border bg-muted p-4 mb-2">
            <p className="text-sm text-muted-foreground">Interactive Dashboard Component</p>
            <p className="text-xs text-muted-foreground mt-2">
              C1Component placeholder - will render charts/tables here
            </p>
          </div>
          {isCached && (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                From cache {cacheTime && `(${cacheTime})`}
              </Badge>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{timestamp}</p>
        </Card>
      </div>
    </div>
  );
}






