import { Button } from "@/components/ui/button";
import { Clock, MessageCircle, X } from "lucide-react";

interface RecentQuestionsProps {
  questions: string[];
  onSelectQuestion: (q: string) => void;
  onClearHistory: () => void;
}

export const RecentQuestions = ({ 
  questions, 
  onSelectQuestion,
  onClearHistory 
}: RecentQuestionsProps) => {
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