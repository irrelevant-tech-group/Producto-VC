import { useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";

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

interface ChatAreaProps {
  chatHistory: ChatMessage[];
  showSources: boolean;
  formatAnswer: (answer: string) => JSX.Element;
  formatTime: (date?: Date) => string;
}

export const ChatArea = ({ 
  chatHistory, 
  showSources, 
  formatAnswer, 
  formatTime 
}: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  return (
    <div className="h-[calc(65vh-80px)] overflow-y-auto p-4 space-y-4 bg-slate-50">
      {chatHistory.map((message, index) => {
        // Skip rendering the typing indicator if a real message follows
        if (message.content === '...' && index < chatHistory.length - 1) {
          return null;
        }
        
        return (
          <ChatMessage
            key={index}
            message={message}
            showSources={showSources}
            formatAnswer={formatAnswer}
            formatTime={formatTime}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};