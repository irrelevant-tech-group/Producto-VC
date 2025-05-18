import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStartups } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MapPin, 
  Calendar, 
  FileText, 
  ChevronRight, 
  AlertCircle,
  Users,
  TrendingUp,
  Tag,
  Clock,
  ExternalLink,
  Filter,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from 'date-fns';

interface Startup {
  id: string;
  name: string;
  vertical: string;
  stage: string;
  status: string;
  location: string;
  lastUpdated: string;
  documentsCount: number;
  completionPercentage: number;
  alignmentScore?: number;
  amountSought?: number;
  founderCount?: number;
  fundingRound?: string;
}

const ActiveStartups: React.FC = () => {
  const [sortBy, setSortBy] = useState<string>('lastUpdated');

  const { data: startups, isLoading, error } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: fetchStartups
  });

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700 flex items-center">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        <span>Error loading startups. Please try again.</span>
      </div>
    );
  }

  // Filter to show only active startups
  const activeStartups = startups?.filter(s => s.status === 'active') || [];
  
  // Sort startups based on selected criteria
  const sortedStartups = [...activeStartups].sort((a, b) => {
    switch(sortBy) {
      case 'alignmentScore':
        return (b.alignmentScore || 0) - (a.alignmentScore || 0);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'completionPercentage':
        return b.completionPercentage - a.completionPercentage;
      case 'lastUpdated':
      default:
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    }
  });

  // Get badge styles based on alignment score
  const getAlignmentBadge = (score?: number) => {
    if (!score) return { color: 'secondary', text: 'Pending Analysis' };
    
    if (score >= 0.7) {
      return { color: 'success', text: 'High Alignment' };
    } else if (score >= 0.4) {
      return { color: 'warning', text: 'Medium Alignment' };
    } else {
      return { color: 'destructive', text: 'Low Alignment' };
    }
  };
  
  // Get avatar background based on vertical
  const getAvatarStyles = (vertical: string) => {
    switch(vertical.toLowerCase()) {
      case 'fintech':
        return 'bg-emerald-100 text-emerald-800';
      case 'ai':
      case 'saas':
        return 'bg-indigo-100 text-indigo-800';
      case 'health':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If it's today or yesterday, show relative time
    if (formatDistanceToNow(date, { addSuffix: true }).includes('day')) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // Otherwise show formatted date
    return format(date, 'MMM d, yyyy');
  };

  // Format amount with appropriate suffix (K, M, B)
  const formatAmount = (amount?: number) => {
    if (!amount) return '';
    
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    
    return `$${amount}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-blue-500 mr-2" />
          <h2 className="text-lg font-medium text-slate-800">Active Due Diligence</h2>
          <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">
            {activeStartups.length} startups
          </Badge>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Sort by
              <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Sort Startups</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-xs cursor-pointer"
              onClick={() => setSortBy('lastUpdated')}
            >
              <Clock className="h-3.5 w-3.5 mr-2" />
              <span>Recently Updated</span>
              {sortBy === 'lastUpdated' && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-xs cursor-pointer"
              onClick={() => setSortBy('alignmentScore')}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-2" />
              <span>Highest Alignment</span>
              {sortBy === 'alignmentScore' && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-xs cursor-pointer"
              onClick={() => setSortBy('completionPercentage')}
            >
              <FileText className="h-3.5 w-3.5 mr-2" />
              <span>Most Complete</span>
              {sortBy === 'completionPercentage' && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-xs cursor-pointer"
              onClick={() => setSortBy('name')}
            >
              <Tag className="h-3.5 w-3.5 mr-2" />
              <span>Alphabetical</span>
              {sortBy === 'name' && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            // Loading state
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="border-b border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="ml-4">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-40 mt-1" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="mt-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <div className="sm:flex">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-32 mt-2 sm:mt-0 sm:ml-6" />
                      <Skeleton className="h-5 w-28 mt-2 sm:mt-0 sm:ml-6" />
                    </div>
                    <Skeleton className="h-8 w-44 mt-4 sm:mt-0" />
                  </div>
                </div>
              </div>
            ))
          ) : sortedStartups.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-medium text-slate-800 mb-1">No active startups</h3>
              <p className="text-sm text-slate-500 mb-4">
                Add a new startup to your portfolio to begin due diligence
              </p>
              <Link href="/startups/new">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Add Startup
                </Button>
              </Link>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-slate-200">
              {sortedStartups.slice(0, 5).map((startup) => {
                // Calculate initials for the avatar
                const initials = startup.name
                  .split(' ')
                  .map(word => word[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                // Get badge configuration
                const alignmentBadge = getAlignmentBadge(startup.alignmentScore);
                // Get avatar style based on vertical
                const avatarStyle = getAvatarStyles(startup.vertical);

                return (
                  <li key={startup.id} className="group">
                    <Link href={`/startups/${startup.id}`}>
                      <a className="block hover:bg-slate-50 transition-colors">
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className={`${avatarStyle} text-sm font-medium`}>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="ml-4 min-w-0">
                                <div className="flex items-center">
                                  <p className="text-sm font-medium text-blue-600 truncate">{startup.name}</p>
                                  {startup.fundingRound && (
                                    <Badge variant="outline" className="ml-2 text-xs py-0 border-slate-200 text-slate-600">
                                      {startup.fundingRound}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center mt-1 text-xs text-slate-500 gap-x-2">
                                  <span className="capitalize">{startup.vertical}</span>
                                  <span className="inline-block h-1 w-1 rounded-full bg-slate-300"></span>
                                  <span>{startup.stage}</span>
                                  {startup.amountSought && (
                                    <>
                                      <span className="inline-block h-1 w-1 rounded-full bg-slate-300"></span>
                                      <span className="font-medium text-slate-700">{formatAmount(startup.amountSought)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="ml-2 flex-shrink-0 flex items-center">
                              <Badge 
                                variant={alignmentBadge.color as any} 
                                className="text-xs font-medium mr-1 hidden sm:inline-flex"
                              >
                                {alignmentBadge.text}
                              </Badge>
                              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="sm:flex sm:justify-between">
                              <div className="sm:flex flex-wrap gap-y-2">
                                <p className="flex items-center text-xs text-slate-500">
                                  <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                                  {startup.location}
                                </p>
                                <span className="hidden sm:inline-block mx-2 text-slate-300">|</span>
                                <p className="mt-2 flex items-center text-xs text-slate-500 sm:mt-0">
                                  <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                                  Updated {formatDate(startup.lastUpdated)}
                                </p>
                                <span className="hidden sm:inline-block mx-2 text-slate-300">|</span>
                                <p className="mt-2 flex items-center text-xs text-slate-500 sm:mt-0">
                                  <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                                  {startup.documentsCount} document{startup.documentsCount !== 1 ? 's' : ''}
                                </p>
                                {startup.founderCount && (
                                  <>
                                    <span className="hidden sm:inline-block mx-2 text-slate-300">|</span>
                                    <p className="mt-2 flex items-center text-xs text-slate-500 sm:mt-0">
                                      <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                                      {startup.founderCount} founder{startup.founderCount !== 1 ? 's' : ''}
                                    </p>
                                  </>
                                )}
                              </div>
                              <div className="mt-3 sm:mt-0">
                                <div className="flex items-center mb-1">
                                  <p className="text-xs text-slate-500 mr-2">
                                    Due diligence
                                  </p>
                                  <p className="text-xs font-medium text-slate-700">
                                    {startup.completionPercentage}%
                                  </p>
                                </div>
                                <div className="bg-slate-100 rounded-full h-1.5 w-44 overflow-hidden">
                                  <div 
                                    className={`h-1.5 rounded-full ${
                                      startup.completionPercentage >= 75 ? 'bg-emerald-500' : 
                                      startup.completionPercentage >= 40 ? 'bg-amber-500' : 
                                      'bg-blue-500'
                                    }`}
                                    style={{ width: `${startup.completionPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
        
        {sortedStartups.length > 5 && (
          <CardFooter className="border-t border-slate-200 bg-slate-50 p-2 flex justify-center">
            <Link href="/startups?status=active">
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                View all {sortedStartups.length} active startups
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default ActiveStartups;