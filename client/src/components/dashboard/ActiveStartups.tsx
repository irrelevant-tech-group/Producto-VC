import { useQuery } from '@tanstack/react-query';
import { fetchStartups } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, FileText } from 'lucide-react';

const ActiveStartups: React.FC = () => {
  const { data: startups, isLoading, error } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: fetchStartups
  });

  if (error) {
    return (
      <div className="p-4 border border-error-200 rounded-lg bg-error-50 text-error-700">
        Error loading startups. Please try again.
      </div>
    );
  }

  // Filter to show only active startups
  const activeStartups = startups?.filter(s => s.status === 'active') || [];

  return (
    <div className="mt-8">
      <h2 className="text-lg font-medium text-secondary-900">Active Due Diligence</h2>
      <Card className="mt-4">
        <CardContent className="p-0">
          {isLoading ? (
            // Loading state
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="border-b border-secondary-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="h-10 w-10 rounded-md" />
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
          ) : activeStartups.length === 0 ? (
            <div className="p-6 text-center text-secondary-500">
              No active startups found. Add a new startup to get started.
            </div>
          ) : (
            <ul role="list" className="divide-y divide-secondary-200">
              {activeStartups.slice(0, 3).map((startup) => {
                // Calculate initials for the avatar
                const initials = startup.name
                  .split(' ')
                  .map(word => word[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                // Determine badge color based on alignment score
                let alignmentBadge = { color: 'warning', text: 'Medium Alignment' };
                if (startup.alignmentScore && startup.alignmentScore >= 0.7) {
                  alignmentBadge = { color: 'success', text: 'High Alignment' };
                } else if (startup.alignmentScore && startup.alignmentScore < 0.4) {
                  alignmentBadge = { color: 'destructive', text: 'Low Alignment' };
                }

                return (
                  <li key={startup.id}>
                    <Link href={`/startups/${startup.id}`}>
                      <a className="block hover:bg-secondary-50">
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-10 w-10 bg-primary-100 text-primary-800 rounded-md flex items-center justify-center font-bold`}>
                                {initials}
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-primary-700">{startup.name}</p>
                                <p className="text-sm text-secondary-500">
                                  {startup.vertical.charAt(0).toUpperCase() + startup.vertical.slice(1)} • {startup.stage} • 
                                  {startup.amountSought ? ` $${startup.amountSought.toLocaleString()}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="ml-2 flex-shrink-0 flex">
                              <Badge variant={alignmentBadge.color as any} className="text-xs">
                                {alignmentBadge.text}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-secondary-500">
                                  <MapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-secondary-400" />
                                  {startup.location}
                                </p>
                                <p className="mt-2 flex items-center text-sm text-secondary-500 sm:mt-0 sm:ml-6">
                                  <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-secondary-400" />
                                  Updated {new Date(startup.lastUpdated).toLocaleDateString()}
                                </p>
                                <p className="mt-2 flex items-center text-sm text-secondary-500 sm:mt-0 sm:ml-6">
                                  <FileText className="flex-shrink-0 mr-1.5 h-5 w-5 text-secondary-400" />
                                  {startup.documentsCount} documents
                                </p>
                              </div>
                              <div className="mt-4 sm:mt-0">
                                <div className="bg-secondary-100 rounded-full h-2.5 w-44">
                                  <div 
                                    className={`h-2.5 rounded-full ${
                                      startup.completionPercentage >= 75 ? 'bg-success-500' : 
                                      startup.completionPercentage >= 40 ? 'bg-warning-500' : 
                                      'bg-primary-500'
                                    }`}
                                    style={{ width: `${startup.completionPercentage}%` }}
                                  ></div>
                                </div>
                                <p className="mt-1 text-xs text-secondary-500">{startup.completionPercentage}% complete</p>
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
      </Card>
    </div>
  );
};

export default ActiveStartups;
