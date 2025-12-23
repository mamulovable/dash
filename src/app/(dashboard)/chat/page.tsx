"use client";

import { useState, useEffect } from "react";
import { C1Chat } from "@thesysai/genui-sdk";
import "@crayonai/react-ui/styles/index.css";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { SamplePrompts } from "@/components/chat/SamplePrompts";
import { DataSource } from "@/types";

export default function ChatPage() {
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string | null>(null);
  const [selectedDataSourceName, setSelectedDataSourceName] = useState<string>("");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [samplePrompts, setSamplePrompts] = useState<string[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/data-sources");
      const result = await response.json();

      if (result.success) {
        setDataSources(result.data || []);
        // Auto-select first data source if available
        if (result.data && result.data.length > 0) {
          const first = result.data[0];
          setSelectedDataSourceId(first.id);
          setSelectedDataSourceName(first.name);
        }
      }
    } catch (error) {
      console.error("Error fetching data sources:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDataSourceSelect = async (id: string, name: string) => {
    setSelectedDataSourceId(id);
    setSelectedDataSourceName(name);
    
    // Fetch sample prompts for this data source
    if (id) {
      setPromptsLoading(true);
      try {
        const response = await fetch(`/api/data-sources/${id}/prompts`);
        const result = await response.json();
        
        if (result.success && result.prompts) {
          setSamplePrompts(result.prompts);
        } else {
          setSamplePrompts([]);
        }
      } catch (error) {
        console.error("Error fetching sample prompts:", error);
        setSamplePrompts([]);
      } finally {
        setPromptsLoading(false);
      }
    } else {
      setSamplePrompts([]);
    }
  };
  
  useEffect(() => {
    // Fetch prompts when data source changes
    if (selectedDataSourceId && selectedDataSourceName) {
      // Fetch sample prompts for this data source
      setPromptsLoading(true);
      fetch(`/api/data-sources/${selectedDataSourceId}/prompts`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.prompts) {
            setSamplePrompts(result.prompts);
          } else {
            setSamplePrompts([]);
          }
        })
        .catch(error => {
          console.error("Error fetching sample prompts:", error);
          setSamplePrompts([]);
        })
        .finally(() => {
          setPromptsLoading(false);
        });
    } else {
      setSamplePrompts([]);
    }
  }, [selectedDataSourceId, selectedDataSourceName]);

  return (
    <DashboardLayout breadcrumbs={[{ label: "Chat" }]}>
      <div className="flex h-[calc(100vh-8rem)] -mx-6 -mb-6">
        {/* Chat Sidebar - Data Sources & Templates */}
        <ChatSidebar 
          onDataSourceSelect={handleDataSourceSelect}
          selectedDataSourceId={selectedDataSourceId}
          dataSources={dataSources}
          loading={loading}
        />
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-background border-l min-w-0">
          {/* Data source header */}
          {selectedDataSourceId ? (
            <div className="px-6 py-3 border-b bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Querying: </span>
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {selectedDataSourceName}
                </span>
              </div>
            </div>
          ) : (
            <div className="px-6 py-3 border-b flex-shrink-0">
              <p className="text-sm text-muted-foreground">Select a data source to start</p>
            </div>
          )}
          
          {/* Sample Prompts */}
          {selectedDataSourceId && (
            <SamplePrompts 
              prompts={samplePrompts}
              loading={promptsLoading}
              onPromptSelect={(prompt) => {
                // C1Chat will handle the message through its input
                // We'll use a ref or direct DOM manipulation if needed
                // For now, we'll show the prompt in the input field
                const chatInput = document.querySelector('textarea[placeholder*="message"], input[placeholder*="message"]') as HTMLTextAreaElement | HTMLInputElement;
                if (chatInput) {
                  chatInput.value = prompt;
                  chatInput.focus();
                  // Trigger input event to update C1Chat state
                  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
            />
          )}
          
          {/* C1 Chat Component */}
          <div className="flex-1 min-h-0 relative">
            {selectedDataSourceId ? (
              <div className="absolute inset-0">
                <C1Chat 
                  apiUrl={`/api/chat?dataSourceId=${selectedDataSourceId}`}
                  theme={{ mode: "dark" }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <p className="text-muted-foreground mb-4">Select a data source from the sidebar to start chatting</p>
                  {dataSources.length === 0 && !loading && (
                    <a
                      href="/data-sources"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                    >
                      Connect your first data source →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
