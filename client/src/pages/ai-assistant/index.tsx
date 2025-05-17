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
    documentType?: string;
    content: string;
    relevanceScore?: number;
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
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

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

  // Actualizar sugerencias cuando cambia el startup seleccionado
  useEffect(() => {
    if (selectedStartupId && selectedStartupId !== "all") {
      // Sugerencias específicas según vertical y etapa del startup
      const startup = startups?.find(s => s.id === selectedStartupId);
      
      if (startup) {
        const baseQuestions = [
          "¿Cuáles son las principales métricas financieras?",
          "¿Quiénes conforman el equipo fundador y cuál es su experiencia?",
          "¿Cuál es el modelo de negocio y cómo generan ingresos?"
        ];
        
        // Preguntas específicas según vertical
        const verticalQuestions: Record<string, string[]> = {
          'fintech': [
            "¿Cuáles son los indicadores de unit economics?",
            "¿Qué regulaciones afectan a este startup?",
            "¿Cuál es su estrategia de adquisición de usuarios?"
          ],
          'saas': [
            "¿Cuál es el MRR y CAC actual?",
            "¿Cómo es su pipeline de ventas?",
            "¿Cuál es su tasa de retención de clientes?"
          ],
          'ai': [
            "¿Cuál es la tecnología AI que utilizan?",
            "¿Qué datos usan para entrenar sus modelos?",
            "¿Cuál es su ventaja competitiva frente a otras soluciones AI?"
          ],
          // Otras verticales...
        };
        
        // Combinar preguntas base con específicas de vertical
        const specificQuestions = verticalQuestions[startup.vertical] || [];
        setSuggestedQuestions([...baseQuestions, ...specificQuestions]);
      } else {
        // Preguntas genéricas
        setSuggestedQuestions([
          "¿Cuáles son las métricas clave de este startup?",
          "¿Cuál es el equipo fundador?",
          "¿Cuál es el mercado objetivo?"
        ]);
      }
    } else {
      // Preguntas cuando no hay startup seleccionado o es "all"
      setSuggestedQuestions([
        "¿Cuáles son los startups con mejor alineación a la tesis de inversión?",
        "¿Qué startups tienen documentos financieros completos?",
        "¿Cuáles son las startups en etapa seed?"
      ]);
    }
  }, [selectedStartupId, startups]);

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
        startupId: selectedStartupId === "all" ? undefined : selectedStartupId,
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
                  <SelectItem value="all">All startups</SelectItem>
                  {isLoadingStartups ? (
                    <div className="p-2">Loading startups...</div>
                  ) : startups && startups.length > 0 ? (
                    startups.map((startup: any) => (
                      <SelectItem key={startup.id} value={startup.id}>
                        {startup.name} ({startup.id})
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
                        <p className="text-xs font-semibold mb-1">Fuentes:</p>
                        <div className="space-y-2">
                          {message.sources.map((source, sIdx) => (
                            <div 
                              key={sIdx} 
                              className="text-xs p-2 bg-white rounded border border-secondary-200 hover:border-primary-300 transition-colors"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <p className="font-medium">{source.documentName}</p>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs capitalize"
                                >
                                  {source.documentType?.replace('-', ' ')}
                                </Badge>
                              </div>
                              <p className="text-secondary-600 whitespace-pre-line">
                                {source.content.length > 300 
                                  ? `${source.content.substring(0, 300)}...` 
                                  : source.content
                                }
                              </p>
                              {source.relevanceScore !== undefined && (
                                <div className="mt-1 flex items-center">
                                  <span className="text-xs text-secondary-500 mr-1">Relevancia:</span>
                                  <div className="w-24 bg-secondary-100 h-1.5 rounded-full">
                                    <div 
                                      className="h-1.5 bg-primary-500 rounded-full" 
                                      style={{ width: `${Math.round(source.relevanceScore * 100)}%` }}
                                    />
                                  </div>
                                  <span className="ml-1 text-xs text-secondary-500">
                                    {Math.round(source.relevanceScore * 100)}%
                                  </span>
                                </div>
                              )}
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
              
              {/* Preguntas sugeridas */}
              {suggestedQuestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-secondary-500 mb-1">Preguntas sugeridas:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setQuestion(q)}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-xs text-secondary-500 mt-2">
                Try asking about startup metrics, financials, team, or market analysis
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}