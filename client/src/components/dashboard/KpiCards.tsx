import { useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics } from '@/lib/api';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Building2, 
  ClipboardCheck, 
  FileText, 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  HelpCircle,
  BarChart3
} from 'lucide-react';

const KpiCards: React.FC<{ timeRange?: string }> = ({ timeRange = "30d" }) => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/metrics', timeRange],
    queryFn: () => fetchDashboardMetrics(timeRange)
  });

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 flex items-center">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        <span>Error loading dashboard metrics. Please try again.</span>
      </div>
    );
  }

  // Helper function to determine trend color class
  const getTrendColorClass = (value: number, reversed: boolean = false) => {
    if (value === 0) return "text-slate-500";
    
    if (reversed) {
      // For metrics where down is good (like pending memos)
      return value > 0 ? "text-red-500" : "text-emerald-500";
    }
    
    // For metrics where up is good
    return value > 0 ? "text-emerald-500" : "text-red-500";
  };

  // Card data configuration
  const cardData = [
    {
      title: "Total Startups",
      icon: <Building2 className="h-6 w-6 text-blue-600" />,
      bgColor: "bg-blue-50",
      value: metrics?.totalStartups || 0,
      trend: metrics?.trendStartups || 0,
      reversed: false,
      tooltip: "Total number of startups in your portfolio",
      subtext: metrics?.avgValuation 
        ? `Avg. valuation: $${(metrics.avgValuation / 1000000).toFixed(1)}M` 
        : "Portfolio companies"
    },
    {
      title: "Active Due Diligence",
      icon: <ClipboardCheck className="h-6 w-6 text-indigo-600" />,
      bgColor: "bg-indigo-50",
      value: metrics?.activeDueDiligence || 0,
      trend: metrics?.trendDD || 0,
      reversed: false,
      tooltip: "Startups currently under active due diligence process",
      subtext: metrics?.avgDueDiligenceDays 
        ? `Avg. duration: ${metrics.avgDueDiligenceDays} days` 
        : "Companies in review"
    },
    {
      title: "Pending Memos",
      icon: <FileText className="h-6 w-6 text-amber-600" />,
      bgColor: "bg-amber-50",
      value: metrics?.pendingMemos || 0,
      trend: metrics?.trendMemos || 0,
      reversed: true, // Down is good for pending memos
      tooltip: "Investment memos pending review or approval",
      subtext: metrics?.oldestMemoDays 
        ? `Oldest memo: ${metrics.oldestMemoDays} days` 
        : "Awaiting review"
    },
    {
      title: "Docs Processed",
      icon: <Upload className="h-6 w-6 text-emerald-600" />,
      bgColor: "bg-emerald-50",
      value: metrics?.docsProcessed || 0,
      trend: metrics?.trendDocs || 0,
      reversed: false,
      tooltip: "Total documents processed by the AI in the selected time period",
      subtext: metrics?.docsPerStartup 
        ? `${metrics.docsPerStartup} docs/startup` 
        : "Documents analyzed"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cardData.map((card, index) => (
        <Card key={index} className="border-slate-200 overflow-hidden transition-all hover:shadow-md">
          <CardContent className="p-0">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${card.bgColor} rounded-lg p-3`}>
                  {card.icon}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <div className="flex items-center">
                    <h3 className="text-sm font-medium text-slate-700 truncate">
                      {card.title}
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="ml-1 cursor-help">
                            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">{card.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="flex items-baseline mt-1">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <>
                        <div className="text-2xl font-semibold text-slate-900">
                          {card.value}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${getTrendColorClass(card.trend, card.reversed)}`}>
                          {card.trend > 0 ? (
                            <TrendingUp className="h-4 w-4 self-center mr-0.5" />
                          ) : card.trend < 0 ? (
                            <TrendingDown className="h-4 w-4 self-center mr-0.5" />
                          ) : (
                            <BarChart3 className="h-4 w-4 self-center mr-0.5 text-slate-400" />
                          )}
                          <span>
                            {card.trend !== 0 ? Math.abs(card.trend) : "0"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-1 text-xs text-slate-500">
                    {isLoading ? <Skeleton className="h-3 w-24" /> : card.subtext}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mini sparkline chart could go here */}
            <div className="h-1 w-full bg-slate-100">
              {!isLoading && (
                <div 
                  className={`h-1 ${
                    card.title === "Pending Memos" 
                      ? (card.trend < 0 ? "bg-emerald-500" : "bg-amber-500")
                      : "bg-blue-500"
                  }`} 
                  style={{ 
                    width: `${Math.min(Math.max((card.value / (card.value + Math.abs(card.trend)) * 100), 20), 90)}%` 
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KpiCards;