import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  Link2, 
  ExternalLink 
} from "lucide-react";

interface Source {
  documentId: string;
  documentName: string;
  documentType?: string;
  content: string;
  relevanceScore?: number;
  sourceIndex?: number;
  metadata?: Record<string, any>;
}

interface SourceDetailProps {
  source: Source;
  index: number;
}

export const SourceDetail = ({ source, index }: SourceDetailProps) => {
  const [expanded, setExpanded] = useState(false);
  
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