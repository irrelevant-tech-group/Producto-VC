import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, X } from "lucide-react";

// Hooks
import { useAIAssistant } from "@/hooks/useAIAssistant";

// Components
import { StartupSelector } from "@/components/ai-assistant/StartupSelector";
import { ChatArea } from "@/components/ai-assistant/ChatArea";
import { ChatInput } from "@/components/ai-assistant/ChatInput";
import { SettingsPanel } from "@/components/ai-assistant/SettingsPanel";

export default function AiAssistant() {
  const {
    selectedStartupId,
    selectedStartup,
    showSources,
    question,
    isSubmitting,
    frequentQuestions,
    chatHistory,
    suggestedQuestions,
    startups,
    isLoadingStartups,
    inputRef,
    setSelectedStartupId,
    setShowSources,
    setQuestion,
    handleSubmitQuestion,
    handleClearChat,
    handleClearRecent,
    handleSelectQuestion
  } = useAIAssistant();

  // Format answer with citations
  const formatAnswer = (answer: string) => {
    const formattedText = answer.replace(
      /\[(\d+)\]/g, 
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">[$1]</span>'
    );
    
    return (
      <div 
        className="whitespace-pre-wrap" 
        dangerouslySetInnerHTML={{ __html: formattedText }}
      />
    );
  };
  
  // Format timestamp
  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get startup initials
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Bot className="h-6 w-6 text-blue-500 mr-2" />
            AI Assistant
            {chatHistory.length > 1 && (
              <Badge variant="outline" className="ml-3 font-normal text-slate-600">
                {chatHistory.length - 1} {chatHistory.length === 2 ? 'message' : 'messages'}
              </Badge>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Get insights and analysis from your startup documents and data
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 text-slate-600"
            disabled={chatHistory.length <= 1}
          >
            <X className="h-4 w-4" />
            Clear Chat
          </Button>
          
          <StartupSelector
            selectedStartupId={selectedStartupId}
            selectedStartup={selectedStartup}
            startups={startups}
            isLoadingStartups={isLoadingStartups}
            onStartupChange={setSelectedStartupId}
            getInitials={getInitials}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chat Area */}
        <Card className="lg:col-span-3 border-slate-200 shadow-sm overflow-hidden">
          {/* Selected Startup Info - if applicable */}
          {selectedStartup && (
            <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3 text-sm font-medium">
                  {getInitials(selectedStartup.name)}
                </div>
                <div>
                  <h2 className="text-sm font-medium text-slate-800 flex items-center">
                    {selectedStartup.name}
                    <Badge className="ml-2 text-xs capitalize bg-blue-100 text-blue-800 border-0">
                      {selectedStartup.status}
                    </Badge>
                  </h2>
                  <p className="text-xs text-slate-600">
                    {selectedStartup.vertical && `${selectedStartup.vertical.charAt(0).toUpperCase() + selectedStartup.vertical.slice(1)}`} 
                    {selectedStartup.stage && ` • ${selectedStartup.stage}`}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-7"
                onClick={() => window.location.href = `/startups/${selectedStartup.id}`}
              >
                View Details
                <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Button>
            </div>
          )}
          
          {/* Chat Messages */}
          <ChatArea
            chatHistory={chatHistory}
            showSources={showSources}
            formatAnswer={formatAnswer}
            formatTime={formatTime}
          />
          
          {/* Input Area */}
          <ChatInput
            question={question}
            isSubmitting={isSubmitting}
            selectedStartup={selectedStartup}
            suggestedQuestions={suggestedQuestions}
            onQuestionChange={setQuestion}
            onSubmit={handleSubmitQuestion}
            onSelectQuestion={handleSelectQuestion}
          />
        </Card>

        {/* Settings Panel */}
        <SettingsPanel
          selectedStartupId={selectedStartupId}
          selectedStartup={selectedStartup}
          showSources={showSources}
          frequentQuestions={frequentQuestions}
          onShowSourcesChange={setShowSources}
          onSelectQuestion={handleSelectQuestion}
          onClearRecent={handleClearRecent}
        />
      </div>
    </div>
  );
}