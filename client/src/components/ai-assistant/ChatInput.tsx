import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X, Loader2 } from "lucide-react";
import { SuggestedQuestions } from "./SuggestedQuestions";

interface Question {
  text: string;
  category?: string;
}

interface ChatInputProps {
  question: string;
  isSubmitting: boolean;
  selectedStartup: any;
  suggestedQuestions: Question[];
  onQuestionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSelectQuestion: (question: string) => void;
}

export const ChatInput = ({
  question,
  isSubmitting,
  selectedStartup,
  suggestedQuestions,
  onQuestionChange,
  onSubmit,
  onSelectQuestion
}: ChatInputProps) => {
  return (
    <div className="border-t border-slate-200 p-4 bg-white">
      <form onSubmit={onSubmit} className="flex space-x-2">
        <div className="relative flex-1">
          <Input
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            placeholder={selectedStartup 
              ? `Ask about ${selectedStartup.name}...` 
              : "Ask a question about your startup portfolio..."}
            disabled={isSubmitting}
            className="pr-10 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
          />
          {question && (
            <button 
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => onQuestionChange("")}
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
        onSelectQuestion={onSelectQuestion}
      />
    </div>
  );
};