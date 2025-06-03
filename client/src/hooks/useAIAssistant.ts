import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { fetchStartups, askAI } from "@/lib/api";

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

export const useAIAssistant = () => {
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
  const inputRef = useRef<HTMLInputElement>(null);
  
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
        
        const specificQuestions = verticalQuestions[startup.vertical] || [];
        setSuggestedQuestions([...baseQuestions, ...specificQuestions]);
      } else {
        setSuggestedQuestions([
          { text: "What are the key metrics for this startup?", category: "Financial" },
          { text: "Who is the founding team?", category: "Team" },
          { text: "What is the target market?", category: "Market" }
        ]);
      }
    } else {
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
        [question, ...prev].slice(0, 5)
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
        newHistory.pop();
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
        newHistory.pop();
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
  
  return {
    // State
    selectedStartupId,
    selectedStartup,
    showSources,
    question,
    isSubmitting,
    frequentQuestions,
    chatHistory,
    suggestedQuestions,
    
    // Data
    startups,
    isLoadingStartups,
    
    // Refs
    inputRef,
    
    // Handlers
    setSelectedStartupId,
    setShowSources,
    setQuestion,
    handleSubmitQuestion,
    handleClearChat,
    handleClearRecent,
    handleSelectQuestion
  };
};