import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Clock, 
  HelpCircle, 
  Building2, 
  FileText 
} from "lucide-react";
import { RecentQuestions } from "./RecentQuestions";

interface SettingsPanelProps {
  selectedStartupId: string;
  selectedStartup: any;
  showSources: boolean;
  frequentQuestions: string[];
  onShowSourcesChange: (value: boolean) => void;
  onSelectQuestion: (question: string) => void;
  onClearRecent: () => void;
}

export const SettingsPanel = ({
  selectedStartupId,
  selectedStartup,
  showSources,
  frequentQuestions,
  onShowSourcesChange,
  onSelectQuestion,
  onClearRecent
}: SettingsPanelProps) => {
  return (
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
            onCheckedChange={onShowSourcesChange}
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
            onSelectQuestion={onSelectQuestion}
            onClearHistory={onClearRecent}
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
  );
};