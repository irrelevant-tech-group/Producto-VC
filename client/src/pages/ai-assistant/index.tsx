import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchStartups, askAI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MessageCircle,
  Send,
  Filter,
  X,
  Bot,
  User
} from "lucide-react";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    documentId: string;
    documentName: string;
    content: string;
  }>;
}

export default function AiAssistant() {
  // Extract startup ID from URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedStartupId = searchParams.get('startupId');
  
  // State
  const [selectedStartupId, setSelectedStartupId] = useState(preselectedStartupId || "");
  const [showSources, setShowSources] = useState(true);
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your investment analysis assistant. I can help you analyze startups and answer questions based on their documents. How can I help you today?'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Fetch all startups
  const { data: startups, isLoading: isLoadingStartups } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: fetchStartups
  });

  // Handle question submission
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    // Add user question to chat
    setChatHistory(prev => [...prev, { role: 'user', content: question }]);
    
    // Clear input
    const currentQuestion = question;
    setQuestion("");
    setIsSubmitting(true);
    
    try {
      // Call AI API
      const response = await askAI({
        startupId: selectedStartupId || undefined,
        question: currentQuestion,
        includeSourceDocuments: showSources
      });
      
      // Add AI response to chat
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: response.answer,
          sources: response.sources
        }
      ]);
    } catch (error) {
      // Add error message to chat
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `I'm sorry, I encountered an error: ${error.message}`
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">AI Assistant</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Ask questions about your startups and documents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure your AI assistant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1 block">Startup Context</Label>
              <Select 
                value={selectedStartupId} 
                onValueChange={setSelectedStartupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All startups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All startups</SelectItem>
                  {isLoadingStartups ? (
                    <div className="p-2">Loading startups...</div>
                  ) : startups && startups.length > 0 ? (
                    startups.map((startup: any) => (
                      <SelectItem key={startup.id} value={startup.id}>
                        {startup.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-secondary-500">No startups found</div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-secondary-500 mt-1">
                {selectedStartupId ? "Questions will be answered in the context of the selected startup" : 
                "Questions will be answered using information from all startups"}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Sources</Label>
                <p className="text-xs text-secondary-500">
                  Include document sources in AI responses
                </p>
              </div>
              <Switch 
                checked={showSources}
                onCheckedChange={setShowSources}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            {/* Chat Messages */}
            <div className="h-[60vh] overflow-y-auto p-4 space-y-4">
              {chatHistory.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.role === 'user' 
                    ? 'bg-primary-100 text-primary-900 rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                    : 'bg-secondary-100 text-secondary-900 rounded-tl-lg rounded-tr-lg rounded-br-lg'} p-3`}
                  >
                    <div className="flex items-center mb-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 
                        ${message.role === 'user' ? 'bg-primary-200' : 'bg-accent-200'}`}>
                        {message.role === 'user' 
                          ? <User className="h-4 w-4 text-primary-600" /> 
                          : <Bot className="h-4 w-4 text-accent-600" />}
                      </div>
                      <span className="text-xs font-medium">
                        {message.role === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {message.sources && message.sources.length > 0 && showSources && (
                      <div className="mt-2 pt-2 border-t border-secondary-200">
                        <p className="text-xs font-semibold mb-1">Sources:</p>
                        <div className="space-y-2">
                          {message.sources.map((source, sIdx) => (
                            <div key={sIdx} className="text-xs p-2 bg-white rounded border border-secondary-200">
                              <p className="font-medium mb-1">{source.documentName}</p>
                              <p className="text-secondary-600 line-clamp-3">{source.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="border-t border-secondary-200 p-4">
              <form onSubmit={handleSubmitQuestion} className="flex space-x-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={isSubmitting}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!question.trim() || isSubmitting}
                >
                  {isSubmitting ? "Thinking..." : <Send className="h-4 w-4" />}
                </Button>
              </form>
              <p className="text-xs text-secondary-500 mt-1">
                Try asking about startup metrics, financials, team, or market analysis
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}