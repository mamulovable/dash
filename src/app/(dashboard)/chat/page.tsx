"use client";

import { useState, useEffect } from "react";
import { C1Chat } from "@thesysai/genui-sdk";
import "@crayonai/react-ui/styles/index.css";
import { Database, ChevronUp, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { SamplePrompts } from "@/components/chat/SamplePrompts";
import { DataSourceSelectionModal } from "@/components/chat/DataSourceSelectionModal";
import { DataSource } from "@/types";

export default function ChatPage() {
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string | null>(null);
  const [selectedDataSourceName, setSelectedDataSourceName] = useState<string>("");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [samplePrompts, setSamplePrompts] = useState<string[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [promptsExpanded, setPromptsExpanded] = useState(false); // Default to collapsed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchDataSources();
  }, []);

  useEffect(() => {
    // Show modal if no data source is selected and we have data sources loaded
    if (!loading && !selectedDataSourceId && dataSources.length > 0) {
      setShowSelectionModal(true);
    }
  }, [loading, selectedDataSourceId, dataSources.length]);

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
  
  const handleDataSourceSelect = async (id: string, name: string) => {
    setSelectedDataSourceId(id);
    setSelectedDataSourceName(name);
    setShowSelectionModal(false); // Close modal when source is selected
    
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

  const handleChangeDataSource = () => {
    setShowSelectionModal(true);
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
      {/* Data Source Selection Modal */}
      <DataSourceSelectionModal
        open={showSelectionModal}
        dataSources={dataSources}
        loading={loading}
        onSelect={handleDataSourceSelect}
      />

      <div className="flex h-[calc(100vh-8rem)] -mx-6 -mb-6 bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden relative">
        {/* Chat Sidebar - Data Sources & Templates - Collapsible */}
        <div className={`flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[280px]'}`}>
          <ChatSidebar 
            onDataSourceSelect={handleDataSourceSelect}
            selectedDataSourceId={selectedDataSourceId}
            dataSources={dataSources}
            loading={loading}
          />
        </div>
        
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`absolute top-1/2 -translate-y-1/2 z-20 p-2 bg-background border border-border/50 rounded-r-lg shadow-lg hover:bg-accent transition-all duration-300 ${
            sidebarCollapsed ? 'left-0' : 'left-[280px]'
          }`}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-background/50 backdrop-blur-sm border-l border-border/50 min-w-0 shadow-sm overflow-hidden">
          {/* Data source header - Enhanced */}
          {selectedDataSourceId ? (
            <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-pink-50/30 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 backdrop-blur-sm flex items-center justify-between flex-shrink-0 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Querying</span>
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                      {selectedDataSourceName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleChangeDataSource}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-2 py-1 rounded-md hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30"
                >
                  Change source
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-4 border-b border-border/50 flex-shrink-0 bg-muted/30">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"></span>
                Select a data source to start querying your data
              </p>
            </div>
          )}
          
          {/* Sample Prompts - Collapsible and Compact */}
          {selectedDataSourceId && samplePrompts.length > 0 && (
            <div className="flex-shrink-0 border-b border-border/50 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-pink-50/30 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/15 max-h-[120px] overflow-hidden flex flex-col">
              <button
                onClick={() => setPromptsExpanded(!promptsExpanded)}
                className="w-full px-6 py-1.5 flex items-center justify-between hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition-colors flex-shrink-0"
              >
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sample Prompts ({samplePrompts.length})
                </span>
                {promptsExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {promptsExpanded && (
                <div className="px-6 pb-2 overflow-y-auto flex-1 min-h-0">
                  <SamplePrompts 
                    prompts={samplePrompts}
                    loading={promptsLoading}
                    onPromptSelect={(prompt) => {
                      setPromptsExpanded(false); // Collapse after selection
                // Find C1Chat's input and send button, then simulate user interaction
                const findAndSend = () => {
                  // Find the textarea input
                  const chatInput = document.querySelector('textarea') as HTMLTextAreaElement;
                  
                  if (chatInput) {
                    // Set the value
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                      window.HTMLTextAreaElement.prototype,
                      'value'
                    )?.set;
                    
                    if (nativeInputValueSetter) {
                      nativeInputValueSetter.call(chatInput, prompt);
                    } else {
                      chatInput.value = prompt;
                    }
                    
                    // Trigger React's onChange event
                    const inputEvent = new Event('input', { bubbles: true });
                    chatInput.dispatchEvent(inputEvent);
                    
                    // Also trigger change event
                    const changeEvent = new Event('change', { bubbles: true });
                    chatInput.dispatchEvent(changeEvent);
                    
                    chatInput.focus();
                    
                    // Wait a bit then try to submit
                    setTimeout(() => {
                      // Try to find and click send button
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
                      
                      // Try clicking the most likely send button
                      if (sendButtons.length > 0) {
                        const sendButton = sendButtons[sendButtons.length - 1] as HTMLButtonElement;
                        if (!sendButton.disabled) {
                          sendButton.click();
                          return;
                        }
                      }
                      
                      // Fallback: simulate Enter key press
                      const enterEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true,
                      });
                      chatInput.dispatchEvent(enterEvent);
                      
                      // Also try keyup
                      const enterUpEvent = new KeyboardEvent('keyup', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true,
                      });
                      chatInput.dispatchEvent(enterUpEvent);
                    }, 200);
                  } else {
                    // Retry after a short delay if input not found yet
                    setTimeout(findAndSend, 100);
                  }
                };
                
                // Start the process
                findAndSend();
                    }}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* C1 Chat Component - Must take remaining space */}
          <div className="flex-1 min-h-0 relative overflow-hidden w-full" style={{ height: '100%' }}>
            {selectedDataSourceId ? (
              <div className="absolute inset-0 w-full h-full" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', width: '100%' }}>
                  <C1Chat 
                    apiUrl={`/api/chat?dataSourceId=${selectedDataSourceId}`}
                    theme={{ mode: "dark" }}
                  />
                </div>
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
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
