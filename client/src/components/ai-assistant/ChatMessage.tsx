import { Bot, User, FileText } from "lucide-react";
import { SourceDetail } from "./SourceDetail";

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

interface ChatMessageProps {
  message: ChatMessage;
  showSources: boolean;
  formatAnswer: (answer: string) => JSX.Element;
  formatTime: (date?: Date) => string;
}

export const ChatMessage = ({ 
  message, 
  showSources, 
  formatAnswer, 
  formatTime 
}: ChatMessageProps) => {
  // Skip rendering the typing indicator if a real message follows
  if (message.content === '...') {
    return (
      <div className="flex justify-start group">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex items-center justify-center w-24">
          <div className="flex space-x-1 items-center justify-center">
            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[80%] ${message.role === 'user' 
        ? 'bg-blue-500 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg shadow-sm' 
        : 'bg-white border border-slate-200 rounded-tl-lg rounded-tr-lg rounded-br-lg shadow-sm'} p-3`}
      >
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
      </div>
    </div>
  );
};