import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { fetchStartups, fetchStartupMemos } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText,
  Layers,
  Filter,
  ArrowLeft,
  X
} from "lucide-react";

export default function MemosList() {
  // Extract startup ID from URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedStartupId = searchParams.get('startupId');
  
  // State
  const [selectedStartupId, setSelectedStartupId] = useState(preselectedStartupId || "");

  // Fetch all startups
  const { data: startups, isLoading: isLoadingStartups } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: fetchStartups
  });

  // Fetch memos for selected startup
  const {
    data: memos,
    isLoading: isLoadingMemos,
  } = useQuery({
    queryKey: ['/api/startups', selectedStartupId, 'memos'],
    queryFn: () => fetchStartupMemos(selectedStartupId),
    enabled: !!selectedStartupId,
  });

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Investment Memos</h1>
          <p className="mt-1 text-sm text-secondary-500">
            View and manage investment memos for your startups
          </p>
        </div>
      </div>

      {/* Startup Selection */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="startup-select" className="mb-1 block">
                Select Startup
              </Label>
              <Select 
                value={selectedStartupId} 
                onValueChange={setSelectedStartupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a startup..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingStartups ? (
                    <div className="p-2">Loading startups...</div>
                  ) : startups && startups.length > 0 ? (
                    startups.map((startup) => (
                      <SelectItem key={startup.id} value={startup.id}>
                        {startup.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-secondary-500">No startups found</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedStartupId && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStartupId("")}
                  className="text-secondary-500"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Memos List */}
      {selectedStartupId ? (
        isLoadingMemos ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start py-2">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="ml-4 space-y-2 flex-1">
                      <Skeleton className="h-5 w-60" />
                      <div className="flex">
                        <Skeleton className="h-4 w-20 mr-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : memos && memos.length > 0 ? (
          <div className="space-y-4">
            {memos.map((memo) => (
              <Link key={memo.id} href={`/memos/${memo.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start py-2">
                      <div className={`p-2 rounded-md bg-accent-100 text-accent-600`}>
                        <Layers className="h-6 w-6" />
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-medium">Investment Memo v{memo.version}</h3>
                        <div className="mt-1 flex flex-wrap gap-2 items-center">
                          <Badge 
                            variant={memo.status === 'draft' ? 'outline' : 
                                  memo.status === 'review' ? 'secondary' : 'success'} 
                            className="capitalize"
                          >
                            {memo.status}
                          </Badge>
                          <span className="text-sm text-secondary-500">
                            Created {new Date(memo.createdAt).toLocaleDateString()}
                          </span>
                          {memo.updatedAt && (
                            <span className="text-sm text-secondary-500">
                              Updated {new Date(memo.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-secondary-600">
                          {memo.sections?.length || 0} sections
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto text-secondary-400" />
              <h3 className="mt-2 text-lg font-medium">No memos found</h3>
              <p className="mt-1 text-secondary-500">
                This startup doesn't have any investment memos yet.
              </p>
              <Button 
                className="mt-4"
                onClick={() => window.location.href = `/startups/${selectedStartupId}`}
              >
                <FileText className="h-5 w-5 mr-2" />
                View Startup
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Filter className="h-12 w-12 mx-auto text-secondary-400" />
            <h3 className="mt-2 text-lg font-medium">Select a Startup</h3>
            <p className="mt-1 text-secondary-500">
              Choose a startup from the dropdown above to view its investment memos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}