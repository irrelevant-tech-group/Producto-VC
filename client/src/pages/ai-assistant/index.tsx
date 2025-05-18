import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchStartups, askAI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  MessageCircle,
  Send,
  Filter,
  X,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  Search,
  Clock,
  Sparkles,
  Building2,
  FileText,
  Settings,
  PlusCircle,
  Bookmark,
  Link2,
  ExternalLink,
  HelpCircle,
  Loader2
} from "lucide-react";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  sources?: Array<{
    documentId: string;
    documentName: string;
    documentType?: string;
    content: string;
    relevanceScore?: number;
    sourceIndex?: number;
    metadata?: Record<string, any>;
  }>;
}

interface SourceDetailProps {
  source: ChatMessage['sources'][0];
  index: number;
}

const SourceDetail = ({ source, index }: SourceDetailProps) => {
  const [expanded, setExpanded] = useState(false);
  
  // Determine badge color based on document type
  const getBadgeStyles = (type?: string) => {
    switch(type?.toLowerCase()) {
      case 'financial':
      case 'finance':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pitch-deck':
      case 'pitch':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'legal':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'technical':
      case 'tech':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'market':
      case 'research':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };
  
  return (
    <div 
      className={`text-xs rounded-lg border ${expanded ? 'border-blue-200 shadow-sm' : 'border-slate-200'} 
                transition-all duration-200 overflow-hidden`}
    >
      <div 
        className={`p-2 ${expanded ? 'bg-blue-50' : 'bg-white'} flex justify-between items-center cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-slate-600 mr-2 text-xs font-medium">
            {index + 1}
          </span>
          <span className="font-medium truncate max-w-[150px]">{source.documentName}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Badge 
            variant="outline" 
            className={`text-xs py-0 px-1.5 capitalize ${getBadgeStyles(source.documentType)}`}
          >
            {source.documentType?.replace('-', ' ') || 'Document'}
          </Badge>
          {expanded ? 
            <ChevronUp className="h-3 w-3 text-slate-500" /> : 
            <ChevronDown className="h-3 w-3 text-slate-500" />
          }
        </div>
      </div>
      
      {expanded && (
        <div className="p-2 border-t border-slate-100 bg-white">
          <div className="text-slate-800 whitespace-pre-line text-xs">
            {source.content}
          </div>
          
          {source.relevanceScore !== undefined && (
            <div className="mt-2 flex items-center">
              <span className="text-xs text-slate-500 mr-1">Relevance:</span>
              <div className="w-24 bg-slate-100 h-1.5 rounded-full">
                <div 
                  className={`h-1.5 rounded-full ${
                    source.relevanceScore > 0.7 ? 'bg-green-500' : 
                    source.relevanceScore > 0.4 ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                  style={{ width: `${Math.round(source.relevanceScore * 100)}%` }}
                />
              </div>
              <span className="ml-1 text-xs text-slate-500">
                {Math.round(source.relevanceScore * 100)}%
              </span>
            </div>
          )}
          
          {source.metadata && Object.keys(source.metadata).length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                <Link2 className="h-3 w-3" />
                <span>Metadata</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                {Object.entries(source.metadata).map(([key, value]) => (
                  <div key={key} className="flex items-start">
                    <span className="font-medium mr-1">{key}:</span>
                    <span className="truncate">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {source.documentId && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2 gap-1"
              >
                View Document
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatAnswer = (answer: string) => {
  // Replace citations with highlighted spans
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

const QuestionSuggestion = ({ 
  question, 
  icon, 
  category,
  onClick
}: { 
  question: string; 
  icon?: React.ReactNode;
  category?: string;
  onClick: () => void;
}) => {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs justify-start h-auto py-1.5 px-2 border-slate-200 hover:bg-slate-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
      onClick={onClick}
    >
      {icon || <HelpCircle className="h-3 w-3 mr-1.5 text-slate-400" />}
      <span className="truncate">{question}</span>
      {category && (
        <Badge variant="outline" className="ml-1.5 text-[10px] py-0 h-4 px-1 border-slate-200 text-slate-500">
          {category}
        </Badge>
      )}
    </Button>
  );
};

const SuggestedQuestions = ({ 
  questions,
  onSelectQuestion 
}: { 
  questions: Array<{text: string; category?: string}>;
  onSelectQuestion: (q: string) => void;
}) => {
  if (!questions.length) return null;
  
  // Group by category
  const groupedQuestions: Record<string, Array<{text: string; category?: string}>> = {};
  
  questions.forEach(q => {
    const category = q.category || 'General';
    if (!groupedQuestions[category]) {
      groupedQuestions[category] = [];
    }
    groupedQuestions[category].push(q);
  });
  
  // Icon mapping by category
  const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'financial': 
      case 'finance': 
        return <FileText className="h-3 w-3 mr-1.5 text-emerald-500" />;
      case 'team': 
        return <User className="h-3 w-3 mr-1.5 text-purple-500" />;
      case 'market': 
        return <Building2 className="h-3 w-3 mr-1.5 text-amber-500" />;
      case 'product': 
        return <Sparkles className="h-3 w-3 mr-1.5 text-blue-500" />;
      default: 
        return <HelpCircle className="h-3 w-3 mr-1.5 text-slate-400" />;
    }
  };

  return (
    <div className="border-t border-slate-200 pt-3 mt-3">
      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-slate-700">Suggested Questions</h3>
          <TabsList className="h-7 p-0.5 bg-slate-100">
            <TabsTrigger value="all" className="text-xs h-6 px-2">All</TabsTrigger>
            {Object.keys(groupedQuestions).map(category => (
              <TabsTrigger key={category} value={category} className="text-xs h-6 px-2">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        <TabsContent value="all" className="m-0 mt-2">
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => (
              <QuestionSuggestion
                key={idx}
                question={q.text}
                icon={getCategoryIcon(q.category || 'General')}
                onClick={() => onSelectQuestion(q.text)}
              />
            ))}
          </div>
        </TabsContent>
        
        {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
          <TabsContent key={category} value={category} className="m-0 mt-2">
            <div className="flex flex-wrap gap-2">
              {categoryQuestions.map((q, idx) => (
                <QuestionSuggestion
                  key={idx}
                  question={q.text}
                  icon={getCategoryIcon(category)}
                  onClick={() => onSelectQuestion(q.text)}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const RecentQuestions = ({ 
  questions, 
  onSelectQuestion,
  onClearHistory 
}: { 
  questions: string[]; 
  onSelectQuestion: (q: string) => void;
  onClearHistory: () => void;
}) => {
  if (!questions.length) return null;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-700 flex items-center">
          <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
          Recent Questions
        </h3>
        {questions.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearHistory} 
            className="h-6 text-xs text-slate-500 hover:text-slate-700"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
      
      <div className="space-y-1">
        {questions.map((q, idx) => (
          <Button
            key={idx}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-auto py-1.5 text-slate-600 hover:text-blue-700"
            onClick={() => onSelectQuestion(q)}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-2 flex-shrink-0 text-slate-400" />
            <span className="truncate">{q}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default function AiAssistant() {
  // Get query params
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedStartupId = searchParams.get('startupId');
  
  // Location
  const [location, setLocation] = useLocation();
  
  // State
  const [selectedStartupId, setSelectedStartupId] = useState(preselectedStartupId || "all");
  const [showSources, setShowSources] = useState(true);
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frequentQuestions, setFrequentQuestions] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your investment analysis assistant. I can help you analyze startups and answer questions based on their documents. Select a startup or ask about your entire portfolio.',
      timestamp: new Date()
    }
  ]);
  
  // Suggested questions by category
  const [suggestedQuestions, setSuggestedQuestions] = useState<Array<{text: string; category?: string}>>([]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Update URL when startup selection changes
  useEffect(() => {
    if (selectedStartupId && selectedStartupId !== "all") {
      const newParams = new URLSearchParams();
      newParams.set('startupId', selectedStartupId);
      setLocation(`/ai-assistant?${newParams.toString()}`, { replace: true });
    } else if (preselectedStartupId) {
      setLocation('/ai-assistant', { replace: true });
    }
  }, [selectedStartupId, setLocation]);

  // Fetch all startups
  const { data: startups, isLoading: isLoadingStartups } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: fetchStartups
  });

  // Selected startup details
  const selectedStartup = selectedStartupId && selectedStartupId !== "all" && startups 
    ? startups.find(s => s.id === selectedStartupId) 
    : null;

  // Update suggestions when selected startup changes
  useEffect(() => {
    if (selectedStartupId && selectedStartupId !== "all") {
      // Startup-specific questions
      const startup = startups?.find(s => s.id === selectedStartupId);
      
      if (startup) {
        // Base questions
        const baseQuestions = [
          { text: "What are the main financial metrics?", category: "Financial" },
          { text: "Who is on the founding team and what's their experience?", category: "Team" },
          { text: "What's the business model and revenue streams?", category: "Business" }
        ];
        
        // Questions by vertical
        const verticalQuestions: Record<string, Array<{text: string; category: string}>> = {
          'fintech': [
            { text: "What are the unit economics indicators?", category: "Financial" },
            { text: "What regulations affect this startup?", category: "Legal" },
            { text: "What is their user acquisition strategy?", category: "Market" }
          ],
          'saas': [
            { text: "What's the current MRR and CAC?", category: "Financial" },
            { text: "How is their sales pipeline?", category: "Business" },
            { text: "What's their customer retention rate?", category: "Market" }
          ],
          'ai': [
            { text: "What AI technology do they use?", category: "Product" },
            { text: "What data do they use to train their models?", category: "Technical" },
            { text: "What's their competitive advantage vs other AI solutions?", category: "Market" }
          ],
          'health': [
            { text: "What clinical validation do they have?", category: "Product" },
            { text: "What's their regulatory pathway?", category: "Legal" },
            { text: "What's their go-to-market strategy?", category: "Market" }
          ]
        };
        
        // Combine base questions with vertical-specific
        const specificQuestions = verticalQuestions[startup.vertical] || [];
        setSuggestedQuestions([...baseQuestions, ...specificQuestions]);
      } else {
        // Generic startup questions
        setSuggestedQuestions([
          { text: "What are the key metrics for this startup?", category: "Financial" },
          { text: "Who is the founding team?", category: "Team" },
          { text: "What is the target market?", category: "Market" }
        ]);
      }
    } else {
      // Portfolio-wide questions when no startup selected
      setSuggestedQuestions([
        { text: "Which startups best align with our investment thesis?", category: "Strategy" },
        { text: "Which startups have complete financial documents?", category: "Financial" },
        { text: "Which startups are in the seed stage?", category: "Stage" },
        { text: "Compare revenue growth across all portfolio companies", category: "Financial" },
        { text: "Which startups have the strongest founding teams?", category: "Team" }
      ]);
    }
  }, [selectedStartupId, startups]);

  // Handle question submission
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    // Add to recent questions if not already there
    if (!frequentQuestions.includes(question)) {
      setFrequentQuestions(prev => 
        [question, ...prev].slice(0, 5) // Keep only 5 most recent
      );
    }
    
    // Add user question to chat
    setChatHistory(prev => [
      ...prev, 
      { 
        role: 'user', 
        content: question,
        timestamp: new Date()
      }
    ]);
    
    // Store current question and clear input
    const currentQuestion = question;
    setQuestion("");
    setIsSubmitting(true);
    
    try {
      // Show typing indicator
      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '...',
          timestamp: new Date()
        }
      ]);
      
      // Call AI API
      const response = await askAI({
        startupId: selectedStartupId === "all" ? undefined : selectedStartupId,
        question: currentQuestion,
        includeSourceDocuments: showSources
      });
      
      // Remove typing indicator and add real response
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory.pop(); // Remove typing indicator
        return [
          ...newHistory, 
          { 
            role: 'assistant', 
            content: response.answer,
            sources: response.sources,
            timestamp: new Date()
          }
        ];
      });
      
      // Focus input for next question
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
    } catch (error) {
      // Remove typing indicator and add error message
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory.pop(); // Remove typing indicator
        return [
          ...newHistory,
          { 
            role: 'assistant', 
            content: `I'm sorry, I encountered an error while processing your request. Please try again or rephrase your question.`,
            timestamp: new Date()
          }
        ];
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Clear chat history
  const handleClearChat = () => {
    setChatHistory([{
      role: 'assistant',
      content: 'Chat history cleared. How can I help you today?',
      timestamp: new Date()
    }]);
  };
  
  // Clear recent questions
  const handleClearRecent = () => {
    setFrequentQuestions([]);
  };
  
  // Handle selecting a suggested question
  const handleSelectQuestion = (q: string) => {
    setQuestion(q);
    inputRef.current?.focus();
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
          
          <Select 
            value={selectedStartupId} 
            onValueChange={setSelectedStartupId}
          >
            <SelectTrigger className="w-[180px] h-9 text-sm border-slate-200">
              <SelectValue placeholder="All startups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All startups</SelectItem>
              {isLoadingStartups ? (
                <div className="p-2 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400 mr-2" />
                  Loading...
                </div>
              ) : startups && startups.length > 0 ? (
                startups.map((startup: any) => (
                  <SelectItem key={startup.id} value={startup.id}>
                    {startup.name}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-center text-slate-500">No startups found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chat Area */}
        <Card className="lg:col-span-3 border-slate-200 shadow-sm overflow-hidden">
          {/* Selected Startup Info - if applicable */}
          {selectedStartup && (
            <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarFallback className={`
                    ${selectedStartup.vertical === 'ai' ? 'bg-indigo-100 text-indigo-700' : 
                      selectedStartup.vertical === 'fintech' ? 'bg-emerald-100 text-emerald-700' : 
                      selectedStartup.vertical === 'health' ? 'bg-rose-100 text-rose-700' : 
                      'bg-blue-100 text-blue-700'}
                  `}>
                    {getInitials(selectedStartup.name)}
                  </AvatarFallback>
                </Avatar>
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
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
          
          {/* Chat Messages */}
          <div className="h-[calc(65vh-80px)] overflow-y-auto p-4 space-y-4 bg-slate-50">
            {chatHistory.map((message, index) => {
              // Skip rendering the typing indicator if a real message follows
              if (message.content === '...' && index < chatHistory.length - 1) {
                return null;
              }
              
              return (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className={`max-w-[80%] ${message.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg shadow-sm' 
                    : message.content === '...' 
                      ? 'bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex items-center justify-center w-24'
                      : 'bg-white border border-slate-200 rounded-tl-lg rounded-tr-lg rounded-br-lg shadow-sm'} 
                    ${message.content === '...' ? 'p-2' : 'p-3'}`}
                  >
                    {message.content === '...' ? (
                      <div className="flex space-x-1 items-center justify-center">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 
                              ${message.role === 'user' ? 'bg-blue-400' : 'bg-blue-100 text-blue-600'}`}
                            >
                              {message.role === 'user' 
                                ? <User className="h-3 w-3 text-white" /> 
                                : <Bot className="h-3 w-3" />}
                            </div>
                            <span className="text-xs font-medium">
                              {message.role === 'user' ? 'You' : 'AI Assistant'}
                            </span>
                          </div>
                          {message.timestamp && (
                            <span className="text-[10px] opacity-70 ml-1">
                              {formatTime(message.timestamp)}
                            </span>
                          )}
                        </div>
                        
                        {/* Message content */}
                        <div className={`${message.role === 'user' ? 'text-white' : 'text-slate-800'}`}>
                          {message.role === 'assistant' 
                            ? formatAnswer(message.content)
                            : <div className="whitespace-pre-wrap">{message.content}</div>
                          }
                        </div>
                        
                        {/* Sources - only show for assistant messages with sources */}
                        {message.role === 'assistant' && message.sources && message.sources.length > 0 && showSources && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                              <div className="flex items-center">
                                <FileText className="h-3 w-3 mr-1" />
                                <span>Sources ({message.sources.length})</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {message.sources.map((source, sIdx) => (
                                <SourceDetail key={sIdx} source={source} index={sIdx} />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="border-t border-slate-200 p-4 bg-white">
            <form onSubmit={handleSubmitQuestion} className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={selectedStartup 
                    ? `Ask about ${selectedStartup.name}...` 
                    : "Ask a question about your startup portfolio..."}
                  disabled={isSubmitting}
                  className="pr-10 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
                  ref={inputRef}
                />
                {question && (
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setQuestion("")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button 
                type="submit" 
                disabled={!question.trim() || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </Button>
            </form>
            
            {/* Suggested questions */}
            <SuggestedQuestions 
              questions={suggestedQuestions}
              onSelectQuestion={handleSelectQuestion}
            />
          </div>
        </Card>

        {/* Settings Panel */}
        <Card className="lg:col-span-1 border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <CardTitle className="text-sm font-medium text-slate-800 flex items-center">
              <Settings className="h-4 w-4 text-slate-500 mr-2" />
              Settings & History
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 space-y-4">
            {/* Context Selection */}
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                Conversation Context
              </Label>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {selectedStartupId === "all" 
                      ? "All Portfolio Companies" 
                      : selectedStartup?.name || "Loading..."}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedStartupId === "all" 
                      ? "AI will analyze all startups" 
                      : selectedStartup 
                        ? `${selectedStartup.vertical?.charAt(0).toUpperCase() + selectedStartup.vertical?.slice(1)} • ${selectedStartup.stage}` 
                        : "Select a startup"}
                  </p>
                </div>
                
                <Select 
                  value={selectedStartupId} 
                  onValueChange={setSelectedStartupId}
                >
                  <SelectTrigger className="w-auto h-8 text-xs border-blue-200 bg-white">
                    <span className="truncate max-w-[80px] hidden sm:inline">
                      {selectedStartupId === "all" ? "Change" : "Switch"}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-0.5 opacity-50" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All startups</SelectItem>
                    {isLoadingStartups ? (
                      <div className="p-2 flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin text-slate-400" />
                        Loading startups...
                      </div>
                    ) : startups && startups.length > 0 ? (
                      startups.map((startup: any) => (
                        <SelectItem key={startup.id} value={startup.id} className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className={`text-[10px] 
                              ${startup.vertical === 'ai' ? 'bg-indigo-100 text-indigo-700' : 
                                startup.vertical === 'fintech' ? 'bg-emerald-100 text-emerald-700' : 
                                startup.vertical === 'health' ? 'bg-rose-100 text-rose-700' : 
                                'bg-blue-100 text-blue-700'}
                            `}>
                              {getInitials(startup.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{startup.name}</span>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-slate-500">No startups found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Show Sources Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-slate-700">Show Sources</Label>
                <p className="text-xs text-slate-500">
                  Display document sources in AI responses
                </p>
              </div>
              <Switch 
                checked={showSources}
                onCheckedChange={setShowSources}
              />
            </div>
            
            {/* Document Coverage */}
            {selectedStartupId !== "all" && selectedStartup && (
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-sm font-medium text-slate-700">Document Coverage</Label>
                  <Badge className="font-normal text-xs bg-slate-100 text-slate-600 hover:bg-slate-200">
                    {selectedStartup.documentsCount || 0} docs
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">Completeness</span>
                    <span className={`font-medium ${
                      (selectedStartup.completionPercentage || 0) >= 75 ? "text-green-600" :
                      (selectedStartup.completionPercentage || 0) >= 40 ? "text-amber-600" :
                      "text-slate-600"
                    }`}>
                      {selectedStartup.completionPercentage || 0}%
                    </span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        (selectedStartup.completionPercentage || 0) >= 75
                          ? "bg-green-500"
                          : (selectedStartup.completionPercentage || 0) >= 40
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${selectedStartup.completionPercentage || 0}%` }}
                    ></div>
                  </div>
                  
                  <p className="text-xs text-slate-500 mt-1">
                    {(selectedStartup.completionPercentage || 0) < 40 ? 
                      "Limited document coverage may affect AI responses" :
                      (selectedStartup.completionPercentage || 0) < 75 ?
                      "Moderate document coverage available" :
                      "Good document coverage for in-depth analysis"
                    }
                  </p>
                </div>
              </div>
            )}
            
            {/* Recent Questions */}
            <div className="pt-3 border-t border-slate-100">
              <RecentQuestions 
                questions={frequentQuestions}
                onSelectQuestion={handleSelectQuestion}
                onClearHistory={handleClearRecent}
              />
              
              {frequentQuestions.length === 0 && (
                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    Recent questions will appear here
                  </p>
                </div>
              )}
            </div>
            
            {/* Help section */}
            <div className="pt-3 border-t border-slate-100">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <h3 className="text-xs font-medium text-indigo-800 flex items-center mb-1">
                  <HelpCircle className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                  Pro Tips
                </h3>
                <ul className="text-xs text-indigo-700 space-y-1 ml-5 list-disc">
                  <li>Ask about specific metrics or KPIs</li>
                  <li>Compare data across multiple quarters</li>
                  <li>Request summaries of key documents</li>
                  <li>Ask for competitive analysis within verticals</li>
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs h-8 text-slate-600 border-slate-200"
              onClick={() => window.location.href = "/startups"}
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              All Startups
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              className="text-xs h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => window.location.href = `/memos${selectedStartupId !== "all" ? `?startupId=${selectedStartupId}` : ''}`}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              View Memos
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}