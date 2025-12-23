"use client";

import { useState, useEffect } from "react";
import { C1Chat } from "@thesysai/genui-sdk";
import "@crayonai/react-ui/styles/index.css";
import { Database } from "lucide-react";
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Querying: </span>
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {selectedDataSourceName}
                  </span>
                </div>
                <button
                  onClick={handleChangeDataSource}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Change source
                </button>
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
              <div className="flex items-center justify-center h-full bg-muted/30">
                <div className="text-center max-w-md px-6">
                  <div className="mb-6">
                    <Database className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Data Source Selected</h3>
                    <p className="text-muted-foreground mb-6">
                      Select a data source to start asking questions and generating insights from your data.
                    </p>
                    {dataSources.length === 0 && !loading ? (
                      <a href="/data-sources">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                          Connect Your First Data Source
                        </Button>
                      </a>
                    ) : (
                      <Button
                        onClick={() => setShowSelectionModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Select Data Source
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
