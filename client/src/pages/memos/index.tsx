import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { fetchStartups, fetchStartupMemos } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  X,
  Plus,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Pencil,
  Edit3,
  ChevronRight,
  User2,
  Bookmark,
  Eye,
  FileEdit,
  FileArchive,
  Loader2
} from "lucide-react";

export default function MemosList() {
  // Get current location for navigation
  const [location, setLocation] = useLocation();
  
  // Extract startup ID from URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedStartupId = searchParams.get('startupId');
  
  // State
  const [selectedStartupId, setSelectedStartupId] = useState(preselectedStartupId || "");
  const [filterStatus, setFilterStatus] = useState("all");

  // Update URL when startup selection changes
  useEffect(() => {
    if (selectedStartupId) {
      const newParams = new URLSearchParams();
      newParams.set('startupId', selectedStartupId);
      setLocation(`/memos?${newParams.toString()}`, { replace: true });
    } else if (preselectedStartupId) {
      setLocation('/memos', { replace: true });
    }
  }, [selectedStartupId, setLocation]);

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

  // Find selected startup details
  const selectedStartup = selectedStartupId && startups 
    ? startups.find(s => s.id === selectedStartupId) 
    : null;

  // Get initials from startup name
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Filter memos by status
  const filteredMemos = memos && filterStatus !== "all"
    ? memos.filter(memo => memo.status === filterStatus)
    : memos;

  // Status icon mapping
  const statusConfig = {
    draft: { 
      icon: Edit3, 
      color: "text-slate-600", 
      bg: "bg-slate-100", 
      border: "border-slate-200",
      label: "Draft"
    },
    review: { 
      icon: Eye, 
      color: "text-amber-600", 
      bg: "bg-amber-100", 
      border: "border-amber-200",
      label: "In Review" 
    },
    approved: { 
      icon: CheckCircle, 
      color: "text-green-600", 
      bg: "bg-green-100", 
      border: "border-green-200",
      label: "Approved" 
    },
    rejected: { 
      icon: AlertCircle, 
      color: "text-red-600", 
      bg: "bg-red-100", 
      border: "border-red-200",
      label: "Rejected" 
    },
    archived: { 
      icon: FileArchive, 
      color: "text-blue-600", 
      bg: "bg-blue-100", 
      border: "border-blue-200",
      label: "Archived" 
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Investment Memos</h1>
            {filteredMemos && (
              <Badge variant="outline" className="font-normal text-slate-600">
                {filteredMemos.length} {filteredMemos.length === 1 ? "memo" : "memos"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage detailed investment analyses for startups
          </p>
        </div>
        
        {selectedStartupId && (
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => window.location.href = `/memos/new?startupId=${selectedStartupId}`}
          >
            <FileEdit className="h-4 w-4 mr-2" />
            Create New Memo
          </Button>
        )}
      </div>

      {/* Startup Selection */}
      <Card className="mb-6 border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center">
            <Bookmark className="h-4 w-4 text-blue-500 mr-2" />
            <CardTitle className="text-sm font-medium text-slate-700">Startup Selection</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="startup-select" className="mb-1.5 block text-sm font-medium text-slate-700">
                Select a startup to view its investment memos
              </Label>
              <Select 
                value={selectedStartupId} 
                onValueChange={setSelectedStartupId}
              >
                <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select a startup..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingStartups ? (
                    <div className="p-2 flex items-center text-slate-600">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading startups...
                    </div>
                  ) : startups && startups.length > 0 ? (
                    startups.map((startup) => (
                      <SelectItem key={startup.id} value={startup.id}>
                        <div className="flex items-center">
                          <span>{startup.name}</span>
                          {startup.status && (
                            <Badge variant="outline" className="ml-2 capitalize">
                              {startup.status}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-slate-500">No startups found</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedStartupId && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStartupId("")}
                  className="text-slate-500 border-slate-200 hover:text-slate-700"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Clear
                </Button>
                
                <Link href={`/startups/${selectedStartupId}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4 mr-1.5" />
                    View Startup Details
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Startup Info */}
      {selectedStartup && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-blue-600 text-white">{getInitials(selectedStartup.name)}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <h2 className="text-lg font-medium text-slate-800">{selectedStartup.name}</h2>
              <p className="text-sm text-slate-600">
                {selectedStartup.vertical && `${selectedStartup.vertical.charAt(0).toUpperCase() + selectedStartup.vertical.slice(1)}`} 
                {selectedStartup.stage && ` • ${selectedStartup.stage}`}
              </p>
            </div>
          </div>
          
          <Badge className={`
            ${selectedStartup.status === 'active' ? 'bg-blue-100 text-blue-800' : 
              selectedStartup.status === 'invested' ? 'bg-green-100 text-green-800' : 
              selectedStartup.status === 'declined' ? 'bg-red-100 text-red-800' : 
              'bg-slate-100 text-slate-800'}
            px-2.5 py-1 text-xs font-medium capitalize`}
          >
            {selectedStartup.status}
          </Badge>
        </div>
      )}

      {/* Status Filter Tabs */}
      {selectedStartupId && memos && memos.length > 0 && (
        <Tabs 
          defaultValue="all" 
          value={filterStatus}
          onValueChange={setFilterStatus}
          className="mb-6"
        >
          <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm rounded-md"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="draft"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm rounded-md"
            >
              Drafts
            </TabsTrigger>
            <TabsTrigger 
              value="review"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm rounded-md"
            >
              In Review
            </TabsTrigger>
            <TabsTrigger 
              value="approved"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm rounded-md"
            >
              Approved
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Memos List */}
      {selectedStartupId ? (
        isLoadingMemos ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden border-slate-200">
                <CardContent className="p-0">
                  <div className="p-5 border-b border-slate-100">
                    <div className="flex items-start">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <div className="ml-4 space-y-2 flex-1">
                        <Skeleton className="h-5 w-48" />
                        <div className="flex">
                          <Skeleton className="h-4 w-20 mr-2" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                      <Skeleton className="h-8 w-28 rounded-md" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMemos && filteredMemos.length > 0 ? (
          <div className="space-y-4">
            {filteredMemos.map((memo) => {
              const StatusIcon = statusConfig[memo.status]?.icon || FileText;
              
              return (
                <Link key={memo.id} href={`/memos/${memo.id}`}>
                  <Card className="overflow-hidden border-slate-200 hover:border-blue-300 transition-all hover:shadow-md cursor-pointer group">
                    <CardContent className="p-0">
                      <div className="p-5 border-b border-slate-100">
                        <div className="flex items-start">
                          <div className={`p-2 rounded-lg ${statusConfig[memo.status]?.bg || 'bg-blue-100'} ${statusConfig[memo.status]?.border || 'border-blue-200'} border`}>
                            <StatusIcon className={`h-5 w-5 ${statusConfig[memo.status]?.color || 'text-blue-600'}`} />
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="text-lg font-medium text-slate-800 group-hover:text-blue-700 transition-colors">
                              Investment Memo v{memo.version}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-2 items-center">
                              <Badge 
                                className={`capitalize ${statusConfig[memo.status]?.bg || 'bg-blue-100'} ${statusConfig[memo.status]?.color || 'text-blue-600'} border-0`}
                              >
                                {statusConfig[memo.status]?.label || memo.status}
                              </Badge>
                              
                              {memo.createdBy && (
                                <span className="text-sm text-slate-500 flex items-center">
                                  <User2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                  {memo.createdBy}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 bg-slate-50">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-500">
                              <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                              Created {new Date(memo.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            
                            {memo.updatedAt && (
                              <div className="flex items-center text-sm text-slate-500">
                                <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                Updated {new Date(memo.updatedAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 flex items-center">
                              <Layers className="h-4 w-4 mr-1.5 text-slate-400" />
                              {memo.sections?.length || 0} sections
                            </span>
                            
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-sm text-slate-500 hover:text-blue-600 p-0 h-auto group-hover:translate-x-0.5 transition-transform"
                            >
                              View Memo
                              <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-70" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-800">No memos found</h3>
              <p className="mt-1 text-slate-500 max-w-md mx-auto">
                This startup doesn't have any investment memos yet. Create your first memo to get started.
              </p>
              <Button 
                className="mt-6 bg-blue-600 hover:bg-blue-700"
                onClick={() => window.location.href = `/memos/new?startupId=${selectedStartupId}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Memo
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800">Select a Startup</h3>
            <p className="mt-1 text-slate-500 max-w-md mx-auto">
              Choose a startup from the dropdown above to view and manage its investment memos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}