import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionSuggestion } from "./QuestionSuggestion";
import { FileText, User, Building2, Sparkles, HelpCircle } from "lucide-react";

interface Question {
  text: string;
  category?: string;
}

interface SuggestedQuestionsProps {
  questions: Question[];
  onSelectQuestion: (q: string) => void;
}

export const SuggestedQuestions = ({ 
  questions,
  onSelectQuestion 
}: SuggestedQuestionsProps) => {
  if (!questions.length) return null;
  
  // Group by category
  const groupedQuestions: Record<string, Question[]> = {};
  
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