import { useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics } from '@/lib/api';
import { CardTitle, Card, CardContent } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ClipboardCheck, FileText, Upload, TrendingUp, TrendingDown } from 'lucide-react';

const KpiCards: React.FC = () => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    queryFn: fetchDashboardMetrics
  });

  if (error) {
    return (
      <div className="p-4 border border-error-200 rounded-lg bg-error-50 text-error-700">
        Error loading dashboard metrics. Please try again.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Startups */}
      <Card>
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
              <Building2 className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <CardTitle className="text-sm font-medium text-secondary-500 truncate">
                Total Startups
              </CardTitle>
              <div className="flex items-baseline">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-semibold text-secondary-900">
                      {metrics?.totalStartups || 0}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-success-500">
                      <TrendingUp className="h-5 w-5 self-center" />
                      <span className="sr-only">Increased by</span>
                      {metrics?.trendStartups || 0}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Active Due Diligence */}
      <Card>
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-accent-100 rounded-md p-3">
              <ClipboardCheck className="h-6 w-6 text-accent-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <CardTitle className="text-sm font-medium text-secondary-500 truncate">
                Active Due Diligence
              </CardTitle>
              <div className="flex items-baseline">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-semibold text-secondary-900">
                      {metrics?.activeDueDiligence || 0}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-success-500">
                      <TrendingUp className="h-5 w-5 self-center" />
                      <span className="sr-only">Increased by</span>
                      {metrics?.trendDD || 0}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Pending Memos */}
      <Card>
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-warning-100 rounded-md p-3">
              <FileText className="h-6 w-6 text-warning-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <CardTitle className="text-sm font-medium text-secondary-500 truncate">
                Pending Memos
              </CardTitle>
              <div className="flex items-baseline">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-semibold text-secondary-900">
                      {metrics?.pendingMemos || 0}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-error-500">
                      <TrendingDown className="h-5 w-5 self-center" />
                      <span className="sr-only">Decreased by</span>
                      {Math.abs(metrics?.trendMemos || 0)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Docs Processed */}
      <Card>
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-success-100 rounded-md p-3">
              <Upload className="h-6 w-6 text-success-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <CardTitle className="text-sm font-medium text-secondary-500 truncate">
                Docs Processed
              </CardTitle>
              <div className="flex items-baseline">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-semibold text-secondary-900">
                      {metrics?.docsProcessed || 0}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-success-500">
                      <TrendingUp className="h-5 w-5 self-center" />
                      <span className="sr-only">Increased by</span>
                      {metrics?.trendDocs || 0}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KpiCards;
