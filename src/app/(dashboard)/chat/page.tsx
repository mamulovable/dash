"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataSourceSelectionModal } from "@/components/chat/DataSourceSelectionModal";
import { DataSource } from "@/types";
import { v4 as uuidv4 } from "uuid";

export default function ChatPage() {
  const router = useRouter();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  useEffect(() => {
    fetchDataSources();
  }, []);

  useEffect(() => {
    // Show modal if we have data sources loaded
    if (!loading && dataSources.length > 0) {
      setShowSelectionModal(true);
    }
  }, [loading, dataSources.length]);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/data-sources");
      const result = await response.json();

      if (result.success) {
        setDataSources(result.data || []);
        // Don't auto-select - let user choose explicitly
      }
    } catch (error) {
      console.error("Error fetching data sources:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDataSourceSelect = async (id: string) => {
    setShowSelectionModal(false);
    
    // Generate a threadId and redirect to full-screen chat
    const threadId = uuidv4();
    router.push(`/chat/${threadId}?dataSourceId=${id}`);
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: "Chat" }]}>
      {/* Data Source Selection Modal */}
      <DataSourceSelectionModal
        open={showSelectionModal}
        dataSources={dataSources}
        loading={loading}
        onSelect={handleDataSourceSelect}
      />

      <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/20 via-background to-muted/10">
        <div className="text-center max-w-lg px-8 py-12">
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 rounded-full bg-indigo-100/50 dark:bg-indigo-900/30 blur-2xl animate-pulse"></div>
            </div>
            <div className="relative">
              <Database className="h-20 w-20 mx-auto text-indigo-500/60 dark:text-indigo-400/60 mb-6 drop-shadow-lg" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Ready to explore your data?
          </h3>
          <p className="text-muted-foreground mb-8 leading-relaxed text-base">
            Select a data source to start asking questions and generating insights. 
            Our AI will help you understand your data better.
          </p>
          {dataSources.length === 0 && !loading ? (
            <a href="/data-sources">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 dark:shadow-indigo-900/50 px-8 py-6 text-base font-semibold transition-all duration-200 hover:scale-105 hover:shadow-xl"
              >
                Connect Your First Data Source
              </Button>
            </a>
          ) : (
            <Button
              onClick={() => setShowSelectionModal(true)}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 dark:shadow-indigo-900/50 px-8 py-6 text-base font-semibold transition-all duration-200 hover:scale-105 hover:shadow-xl"
            >
              Select Data Source
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
