"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { C1Chat } from "@thesysai/genui-sdk";
import "@crayonai/react-ui/styles/index.css";
import { Database, PanelLeftOpen, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { SamplePrompts } from "@/components/chat/SamplePrompts";
import { DataSourceSelectionModal } from "@/components/chat/DataSourceSelectionModal";
import { DataSource } from "@/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function FullScreenChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const threadId = params.threadId as string;
  const dataSourceIdFromUrl = searchParams.get("dataSourceId");
  
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string | null>(dataSourceIdFromUrl);
  const [selectedDataSourceName, setSelectedDataSourceName] = useState<string>("");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [samplePrompts, setSamplePrompts] = useState<string[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);

  const fetchDataSources = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/data-sources");
      const result = await response.json();

      if (result.success) {
        setDataSources(result.data || []);
        // If URL has dataSourceId, use it
        if (dataSourceIdFromUrl) {
          const source = result.data?.find((ds: DataSource) => ds.id === dataSourceIdFromUrl);
          if (source) {
            setSelectedDataSourceId(source.id);
            setSelectedDataSourceName(source.name);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data sources:", error);
    } finally {
      setLoading(false);
    }
  }, [dataSourceIdFromUrl]);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  useEffect(() => {
    // If no data source selected and we have data sources, show modal
    if (!loading && !selectedDataSourceId && dataSources.length > 0) {
      setShowSelectionModal(true);
    }
  }, [loading, selectedDataSourceId, dataSources.length]);

  useEffect(() => {
    // Update URL when data source changes
    if (selectedDataSourceId) {
      const newUrl = `/chat/${threadId}?dataSourceId=${selectedDataSourceId}`;
      router.replace(newUrl);
    }
  }, [selectedDataSourceId, threadId, router]);
  
  const handleDataSourceSelect = async (id: string, name: string) => {
    setSelectedDataSourceId(id);
    setSelectedDataSourceName(name);
    setShowSelectionModal(false);
    
    // Fetch sample prompts
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

  const handlePromptSelect = (prompt: string) => {
    setPromptsOpen(false);
    // Find C1Chat's input and send button, then simulate user interaction
    const findAndSend = () => {
      const chatInput = document.querySelector('textarea') as HTMLTextAreaElement;
      
      if (chatInput) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(chatInput, prompt);
        } else {
          chatInput.value = prompt;
        }
        
        const inputEvent = new Event('input', { bubbles: true });
        chatInput.dispatchEvent(inputEvent);
        
        const changeEvent = new Event('change', { bubbles: true });
        chatInput.dispatchEvent(changeEvent);
        
        chatInput.focus();
        
        setTimeout(() => {
          const sendButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
            return (
              text.includes('send') ||
              ariaLabel.includes('send') ||
              btn.type === 'submit' ||
              btn.querySelector('svg') !== null
            );
          });
          
          if (sendButtons.length > 0) {
            const sendButton = sendButtons[sendButtons.length - 1] as HTMLButtonElement;
            if (!sendButton.disabled) {
              sendButton.click();
              return;
            }
          }
          
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          });
          chatInput.dispatchEvent(enterEvent);
        }, 200);
      } else {
        setTimeout(findAndSend, 100);
      }
    };
    
    findAndSend();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Main Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header breadcrumbs={[{ label: "Chat" }]} />
        
        {/* Chat Container - Full Height */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Floating Sidebar Overlay */}
          {sidebarOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed left-0 top-0 bottom-0 w-[320px] bg-background border-r border-border z-50 shadow-2xl transform transition-transform">
                <div className="h-full overflow-y-auto p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Data Sources</h2>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-1 hover:bg-accent rounded-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <ChatSidebar 
                    onDataSourceSelect={(id, name) => {
                      handleDataSourceSelect(id, name);
                      setSidebarOpen(false);
                    }}
                    selectedDataSourceId={selectedDataSourceId}
                    dataSources={dataSources}
                    loading={loading}
                  />
                </div>
              </div>
            </>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top Bar with Controls */}
            {selectedDataSourceId ? (
              <div className="flex-shrink-0 px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 hover:bg-accent rounded-md transition-colors"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-800/50">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse"></div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Querying</span>
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      {selectedDataSourceName}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSelectionModal(true)}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-2 py-1 rounded-md hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30"
                  >
                    Change source
                  </button>
                </div>
                {samplePrompts.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setPromptsOpen(!promptsOpen)}
                      className="p-2 hover:bg-accent rounded-md transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </button>
                    {promptsOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setPromptsOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-xl z-50 p-4 max-h-[400px] overflow-y-auto">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold">Sample Prompts</h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPromptsOpen(false);
                              }}
                              className="p-1 hover:bg-accent rounded-md"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <SamplePrompts 
                            prompts={samplePrompts}
                            loading={promptsLoading}
                            onPromptSelect={handlePromptSelect}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-shrink-0 px-4 py-2 border-b border-border/50 flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-accent rounded-md transition-colors"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
                <p className="text-sm text-muted-foreground">
                  Select a data source to start querying
                </p>
              </div>
            )}

            {/* C1Chat Component - Full Remaining Space */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {selectedDataSourceId ? (
                <div className="flex-1 min-h-0 w-full">
                  <C1Chat 
                    apiUrl={`/api/chat?dataSourceId=${selectedDataSourceId}`}
                    theme={{ mode: "dark" }}
                  />
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Selection Modal */}
      <DataSourceSelectionModal
        open={showSelectionModal}
        dataSources={dataSources}
        loading={loading}
        onSelect={handleDataSourceSelect}
      />
    </div>
  );
}

