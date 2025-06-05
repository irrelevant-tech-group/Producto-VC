import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";

interface QuestionSuggestionProps {
  question: string;
  icon?: React.ReactNode;
  category?: string;
  onClick: () => void;
}

export const QuestionSuggestion = ({ 
  question, 
  icon, 
  category,
  onClick
}: QuestionSuggestionProps) => {
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