import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

const examplePrompts = [
  "Show me monthly revenue trends",
  "Top 10 customers by LTV",
  "Compare Q3 vs Q4 performance",
  "Products with declining sales",
  "Customer acquisition cost",
  "Conversion rate by channel",
];

export function EmptyState({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center max-w-2xl">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Start a conversation with your data</h2>
        <p className="text-muted-foreground mb-8">
          Ask questions in plain English and get instant insights
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {examplePrompts.map((prompt) => (
            <Card
              key={prompt}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow hover:border-indigo-500"
              onClick={() => onSelectPrompt(prompt)}
            >
              <p className="text-sm">{prompt}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}






