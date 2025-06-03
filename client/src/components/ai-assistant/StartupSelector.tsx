import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ExternalLink, Loader2 } from "lucide-react";

interface StartupSelectorProps {
  selectedStartupId: string;
  selectedStartup: any;
  startups: any[];
  isLoadingStartups: boolean;
  onStartupChange: (startupId: string) => void;
  getInitials: (name?: string) => string;
}

export const StartupSelector = ({
  selectedStartupId,
  selectedStartup,
  startups,
  isLoadingStartups,
  onStartupChange,
  getInitials
}: StartupSelectorProps) => {
  return (
    <>
      <Select 
        value={selectedStartupId} 
        onValueChange={onStartupChange}
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

      {selectedStartup && (
        <div className="bg-blue-50 border border-blue-200 p-3 flex items-center justify-between">
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
    </>
  );
};