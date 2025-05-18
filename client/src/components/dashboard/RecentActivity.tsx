import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRecentActivities } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  MessageCircle, 
  PlusCircle, 
  ChevronRight,
  User, 
  AlertCircle,
  Bot,
  Clock,
  Filter,
  ChevronDown,
  ExternalLink,
  Check,
  History
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: string;
  userName?: string;
  userAvatar?: string;
  timestamp: string;
  content?: string;
  startupName?: string;
  startupId?: string;
  documentName?: string;
  documentId?: string;
  memoId?: string;
  memoName?: string;
}

const RecentActivity: React.FC = () => {
  const [filter, setFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  // Fetch more activities if expanded
  const limit = expanded ? 10 : 5;
  
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard/activities', limit, filter],
    queryFn: () => fetchRecentActivities(limit, filter)
  });

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 flex items-center">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        <span>Error loading recent activities. Please try again.</span>
      </div>
    );
  }
  
  // Activity type labels for the filter dropdown
  const activityTypes = [
    { value: 'document_uploaded', label: 'Documents Uploaded', icon: <Upload className="h-4 w-4 mr-2" /> },
    { value: 'document_processed', label: 'Documents Processed', icon: <Check className="h-4 w-4 mr-2" /> },
    { value: 'memo_generated', label: 'Memos Generated', icon: <FileText className="h-4 w-4 mr-2" /> },
    { value: 'memo_updated', label: 'Memos Updated', icon: <FileText className="h-4 w-4 mr-2" /> },
    { value: 'ai_query', label: 'AI Queries', icon: <Bot className="h-4 w-4 mr-2" /> },
    { value: 'startup_created', label: 'Startups Added', icon: <PlusCircle className="h-4 w-4 mr-2" /> }
  ];

  // Helper to get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document_uploaded':
        return <Upload className="h-5 w-5 text-blue-600" />;
      case 'document_processed':
        return <Check className="h-5 w-5 text-emerald-600" />;
      case 'memo_generated':
        return <FileText className="h-5 w-5 text-amber-600" />;
      case 'memo_updated':
        return <FileText className="h-5 w-5 text-indigo-600" />;
      case 'ai_query':
        return <Bot className="h-5 w-5 text-blue-600" />;
      case 'startup_created':
        return <PlusCircle className="h-5 w-5 text-indigo-600" />;
      default:
        return <History className="h-5 w-5 text-slate-600" />;
    }
  };

  const getActivityBg = (type: string) => {
    switch (type) {
      case 'document_uploaded':
        return 'bg-blue-50';
      case 'document_processed':
        return 'bg-emerald-50';
      case 'memo_generated':
        return 'bg-amber-50';
      case 'memo_updated':
        return 'bg-indigo-50';
      case 'ai_query':
        return 'bg-blue-50';
      case 'startup_created':
        return 'bg-indigo-50';
      default:
        return 'bg-slate-100';
    }
  };
  
  // Get human-readable activity text
  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'document_uploaded':
        return 'uploaded a document';
      case 'document_processed':
        return 'processed a document';
      case 'memo_generated':
        return 'generated a memo';
      case 'memo_updated':
        return 'updated a memo';
      case 'ai_query':
        return 'asked the AI assistant';
      case 'startup_created':
        return 'added a startup';
      default:
        return 'performed an action';
    }
  };
  
  // Format timestamp into readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // For activities less than 24 hours old, show "X hours ago" or "just now"
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (diffInHours < 48) {
      // For activities 24-48 hours old, show "yesterday at HH:MM AM/PM"
      return `yesterday at ${format(date, 'h:mm a')}`;
    } else {
      // For older activities, show "MMM d, yyyy at HH:MM AM/PM"
      return format(date, 'MMM d, yyyy') + ' at ' + format(date, 'h:mm a');
    }
  };
  
  // Get the number of types of each activity to show in the filter dropdown
  const getActivityTypeCounts = () => {
    if (!activities) return {};
    
    return activities.reduce((acc: Record<string, number>, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {});
  };
  
  const activityTypeCounts = getActivityTypeCounts();

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="px-4 py-5 sm:px-6 border-b border-slate-200 flex flex-row items-center justify-between">
        <div className="flex items-center">
          <History className="h-5 w-5 text-blue-500 mr-2" />
          <CardTitle className="text-lg font-medium leading-6 text-slate-800">
            Recent Activity
          </CardTitle>
          {!isLoading && activities && activities.length > 0 && (
            <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">
              {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
            </Badge>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              {filter ? 'Filtered' : 'All Activity'}
              <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">Filter Activities</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs cursor-pointer flex items-center justify-between"
              onClick={() => setFilter(null)}
            >
              <div className="flex items-center">
                <History className="h-4 w-4 mr-2" />
                <span>All Activity</span>
              </div>
              {filter === null && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {activityTypes.map(type => (
              <DropdownMenuItem
                key={type.value}
                className="text-xs cursor-pointer flex items-center justify-between"
                onClick={() => setFilter(type.value)}
              >
                <div className="flex items-center">
                  {type.icon}
                  <span>{type.label}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {activityTypeCounts[type.value] && (
                    <span className="text-slate-400 text-[10px]">
                      {activityTypeCounts[type.value]}
                    </span>
                  )}
                  {filter === type.value && (
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="px-4 py-5 sm:p-6 max-h-[550px] overflow-y-auto">
        <div className="flow-root">
          {isLoading ? (
            // Loading state
            <div className="space-y-6">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-24 mt-1" />
                    <Skeleton className="h-16 w-full max-w-lg mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
                <History className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-medium text-slate-800 mb-1">No activity yet</h3>
              <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
                {filter 
                  ? `No ${activityTypes.find(t => t.value === filter)?.label.toLowerCase() || 'activities'} found. Try changing the filter or check back later.`
                  : 'Start interacting with the system to see your activity timeline here.'}
              </p>
              {filter && (
                <Button size="sm" variant="outline" onClick={() => setFilter(null)}>
                  Clear Filter
                </Button>
              )}
            </div>
          ) : (
            <ul role="list" className="-mb-8">
              {activities.map((activity, idx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {idx !== activities.length - 1 && (
                      <span 
                        className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-slate-200" 
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        <div className={`h-10 w-10 rounded-full ${getActivityBg(activity.type)} flex items-center justify-center ring-4 ring-white`}>
                          {getActivityIcon(activity.type)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm">
                            {activity.userName ? (
                              <span className="font-medium text-blue-600">{activity.userName}</span>
                            ) : (
                              <span className="font-medium text-blue-600">InvestFlow</span>
                            )}
                            
                            {' '}
                            <span className="text-slate-600">{getActivityText(activity)}</span>
                            
                            {activity.startupName && (
                              <>
                                {' for '}
                                <Link href={`/startups/${activity.startupId}`}>
                                  <a className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                                    {activity.startupName}
                                  </a>
                                </Link>
                              </>
                            )}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="mt-0.5 text-xs text-slate-500 flex items-center cursor-help">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTimestamp(activity.timestamp)}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p className="text-xs">
                                  {format(new Date(activity.timestamp), 'PPpp')}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        {activity.content && (
                          <div className="mt-2 text-sm text-slate-700">
                            {activity.type === 'ai_query' ? (
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <p className="text-slate-800 font-medium italic">"{activity.content}"</p>
                              </div>
                            ) : (
                              <p>{activity.content}</p>
                            )}

                            {activity.documentName && (
                              <div className="mt-2 flex space-x-2">
                                <Badge variant="outline" className="text-xs py-0 px-2 border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100">
                                  <FileText className="h-3 w-3 mr-1.5 text-blue-500" />
                                  {activity.documentName}
                                </Badge>
                              </div>
                            )}
                            
                            {activity.memoId && activity.type.includes('memo') && (
                              <div className="mt-2">
                                <Link href={`/memos/${activity.memoId}`}>
                                  <a className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
                                    View Memo
                                    <ExternalLink className="h-3 w-3 ml-1.5" />
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
      
      <CardFooter className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex justify-between items-center">
        {!isLoading && activities && activities.length > 0 ? (
          expanded ? (
            <div className="flex w-full">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-slate-600 hover:text-slate-800 flex-1"
                onClick={() => setExpanded(false)}
              >
                Show less
              </Button>
              <Link href="/activity">
                <a className="ml-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                  >
                    View full history
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Button>
                </a>
              </Link>
            </div>
          ) : (
            <div className="flex w-full">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-slate-600 hover:text-slate-800 flex-1"
                onClick={() => setExpanded(true)}
              >
                Show more
              </Button>
              <Link href="/activity">
                <a className="ml-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                  >
                    View full history
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Button>
                </a>
              </Link>
            </div>
          )
        ) : (
          <Link href="/activity">
            <a className="w-full">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
              >
                View all activity
              </Button>
            </a>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
};

export default RecentActivity;