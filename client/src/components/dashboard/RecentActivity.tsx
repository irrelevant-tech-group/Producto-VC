import { useQuery } from '@tanstack/react-query';
import { fetchRecentActivities } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { 
  Upload, FileText, MessageCircle, PlusCircle, ChevronRight,
  User, BadgeCheck
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const RecentActivity: React.FC = () => {
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/activities'],
    queryFn: () => fetchRecentActivities(5)
  });

  if (error) {
    return (
      <div className="p-4 border border-error-200 rounded-lg bg-error-50 text-error-700">
        Error loading recent activities. Please try again.
      </div>
    );
  }

  // Helper to get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document_uploaded':
      case 'document_processed':
        return <Upload className="h-5 w-5 text-primary-600" />;
      case 'memo_generated':
      case 'memo_updated':
        return <FileText className="h-5 w-5 text-accent-500" />;
      case 'ai_query':
        return <MessageCircle className="h-5 w-5 text-success-500" />;
      case 'startup_created':
        return <PlusCircle className="h-5 w-5 text-secondary-500" />;
      default:
        return <BadgeCheck className="h-5 w-5 text-secondary-500" />;
    }
  };

  const getActivityBg = (type: string) => {
    switch (type) {
      case 'document_uploaded':
      case 'document_processed':
        return 'bg-primary-100';
      case 'memo_generated':
      case 'memo_updated':
        return 'bg-accent-100';
      case 'ai_query':
        return 'bg-success-100';
      case 'startup_created':
        return 'bg-secondary-100';
      default:
        return 'bg-secondary-100';
    }
  };

  return (
    <Card>
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-secondary-200">
        <CardTitle className="text-lg font-medium leading-6 text-secondary-900">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flow-root">
          {isLoading ? (
            // Loading state
            <div className="space-y-6">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-full max-w-md" />
                    <Skeleton className="h-4 w-24 mt-1" />
                    <Skeleton className="h-16 w-full max-w-lg mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="text-center text-secondary-500 py-8">
              No recent activities found.
            </div>
          ) : (
            <ul role="list" className="-mb-8">
              {activities.map((activity, idx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {idx !== activities.length - 1 && (
                      <span 
                        className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-secondary-200" 
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        <div className={`h-10 w-10 rounded-full ${getActivityBg(activity.type)} flex items-center justify-center`}>
                          {getActivityIcon(activity.type)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm">
                            {activity.userName ? (
                              <span className="font-medium text-primary-600">{activity.userName}</span>
                            ) : (
                              <span className="font-medium text-primary-600">InvestFlow</span>
                            )}
                            
                            {' '}
                            
                            {activity.type === 'document_uploaded' && 'uploaded a document'}
                            {activity.type === 'document_processed' && 'processed a document'}
                            {activity.type === 'memo_generated' && 'generated a memo'}
                            {activity.type === 'memo_updated' && 'updated a memo'}
                            {activity.type === 'ai_query' && 'asked the AI'}
                            {activity.type === 'startup_created' && 'added a startup'}
                            
                            {activity.startupName && (
                              <>
                                {' for '}
                                <Link href={`/startups/${activity.startupId}`}>
                                  <a className="font-medium text-primary-600">
                                    {activity.startupName}
                                  </a>
                                </Link>
                              </>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-secondary-500">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        
                        {activity.content && (
                          <div className="mt-2 text-sm text-secondary-700">
                            {activity.type === 'ai_query' ? (
                              <div className="bg-secondary-50 p-3 rounded-lg">
                                <p className="text-secondary-600 font-medium">{activity.content}</p>
                              </div>
                            ) : (
                              <p>{activity.content}</p>
                            )}

                            {activity.documentName && (
                              <div className="mt-2 flex space-x-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                  {activity.documentName}
                                </span>
                              </div>
                            )}
                            
                            {activity.memoId && activity.type === 'memo_generated' && (
                              <div className="mt-2">
                                <Link href={`/memos/${activity.memoId}`}>
                                  <a className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                    View Memo
                                  </a>
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t border-secondary-200 px-4 py-4">
        <Button variant="outline" className="w-full">
          View all activity
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RecentActivity;
