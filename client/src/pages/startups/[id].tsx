import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchStartup, fetchDueDiligenceProgress, fetchStartupDocuments, fetchStartupMemos, generateMemo, regenerateStartupAlignment } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  FileText,
  Upload,
  DollarSign,
  BarChart2,
  AlignLeft,
  FileUp,
  MessageCircle,
  Layers,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Check,
  X,
  Clock,
  Users,
  Briefcase,
  Mail,
  User,
  Contact,
  RefreshCcw,
  Loader2
} from "lucide-react";

export default function StartupDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch startup details
  const {
    data: startup,
    isLoading: isLoadingStartup,
    error: startupError,
  } = useQuery({
    queryKey: ['/api/startups', id],
    queryFn: () => fetchStartup(id as string),
    enabled: !!id,
  });

  // Fetch due diligence progress
  const {
    data: dueDiligence,
    isLoading: isLoadingDueDiligence,
  } = useQuery({
    queryKey: ['/api/startups', id, 'due-diligence'],
    queryFn: () => fetchDueDiligenceProgress(id as string),
    enabled: !!id,
  });

  // Fetch documents
  const {
    data: documents,
    isLoading: isLoadingDocuments,
  } = useQuery({
    queryKey: ['/api/startups', id, 'documents'],
    queryFn: () => fetchStartupDocuments(id as string),
    enabled: !!id,
  });

  // Fetch memos
  const {
    data: memos,
    isLoading: isLoadingMemos,
  } = useQuery({
    queryKey: ['/api/startups', id, 'memos'],
    queryFn: () => fetchStartupMemos(id as string),
    enabled: !!id,
  });

  // Generate memo mutation
  const generateMemoMutation = useMutation({
    mutationFn: () => generateMemo(id as string),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/startups', id, 'memos'] });
      toast({
        title: "Memo Generated",
        description: "New investment memo has been created successfully.",
      });
      navigate(`/memos/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate memo: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Regenerate alignment score mutation
  const regenerateAlignmentMutation = useMutation({
    mutationFn: () => regenerateStartupAlignment(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/startups', id] });
      toast({
        title: "Analysis Updated",
        description: "The alignment score has been recalculated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recalculate alignment",
        variant: "destructive",
      });
    },
  });

  // Handle memo generation
  const handleGenerateMemo = () => {
    generateMemoMutation.mutate();
  };

  if (startupError) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center flex-col p-8 bg-white rounded-lg border border-destructive-200 shadow-sm">
          <div className="rounded-full bg-destructive-100 p-3 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive-600" />
          </div>
          <h1 className="text-2xl font-bold text-destructive-600 mb-2">Startup Not Found</h1>
          <p className="text-secondary-600 max-w-md text-center mb-6">
            We couldn't find the startup you're looking for. It may have been removed or the ID is invalid.
          </p>
          <Button
            onClick={() => navigate("/startups")}
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Back to Startups
          </Button>
        </div>
      </div>
    );
  }

  // Get status badge variant
  const getStatusBadge = (status?: string) => {
    if (!status) return "secondary";
    
    const variants: Record<string, string> = {
      active: "primary",
      invested: "success",
      declined: "destructive",
      archived: "secondary",
    };
    return variants[status.toLowerCase()] || "secondary";
  };
  
  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };
  
  // Get icon color based on vertical
  const getVerticalColor = (vertical?: string) => {
    if (!vertical) return "bg-blue-100 text-blue-700";
    
    switch(vertical.toLowerCase()) {
      case 'ai':
        return "bg-indigo-100 text-indigo-700";
      case 'fintech':
        return "bg-emerald-100 text-emerald-700";
      case 'health':
        return "bg-rose-100 text-rose-700";
      case 'saas':
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format amount with currency
  const formatAmount = (amount?: number, currency?: string) => {
    if (!amount) return "Not specified";
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

    return formattedAmount;
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/startups">
          <a className="inline-flex items-center text-sm text-secondary-600 hover:text-primary-600 mb-4 group">
            <ArrowLeft className="h-4 w-4 mr-1.5 group-hover:translate-x-[-2px] transition-transform" />
            Back to startups
          </a>
        </Link>

        {isLoadingStartup ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="flex items-center">
              <Avatar className="h-12 w-12 mr-4">
                <AvatarFallback className={getVerticalColor(startup?.vertical)}>
                  {getInitials(startup?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">{startup?.name}</h1>
                <p className="mt-1 text-sm text-secondary-500 flex items-center flex-wrap gap-2">
                  {startup?.vertical && (
                    <span className="inline-flex items-center">
                      <Briefcase className="h-3.5 w-3.5 mr-1.5 text-secondary-400" />
                      {startup.vertical.charAt(0).toUpperCase() + startup.vertical.slice(1)}
                    </span>
                  )}
                  {startup?.stage && (
                    <span className="inline-flex items-center">
                      <Sparkles className="h-3.5 w-3.5 mr-1.5 text-secondary-400" />
                      {startup.stage}
                    </span>
                  )}
                  {startup?.firstContactDate && (
                    <span className="inline-flex items-center">
                      <Contact className="h-3.5 w-3.5 mr-1.5 text-secondary-400" />
                      First contact {formatDate(startup.firstContactDate)}
                    </span>
                  )}
                  {startup?.createdAt && (
                    <span className="inline-flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-secondary-400" />
                      Added on {formatDate(startup.createdAt)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-3">
              {startup?.status && (
                <Badge variant={getStatusBadge(startup.status) as any} className="text-sm capitalize py-1 px-3">
                  {startup.status.charAt(0).toUpperCase() + startup.status.slice(1)}
                </Badge>
              )}
              {dueDiligence?.percentage !== undefined && (
                <div className="flex items-center bg-white border border-slate-200 rounded-full py-1 px-3 shadow-sm">
                  <span className="text-xs font-medium mr-2">Due Diligence</span>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                    <div 
                      className={`h-1.5 rounded-full ${
                        dueDiligence.percentage >= 75 ? "bg-green-500" :
                        dueDiligence.percentage >= 40 ? "bg-amber-500" :
                        "bg-blue-500"
                      }`}
                      style={{ width: `${dueDiligence.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium ml-2">{dueDiligence.percentage}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Startup Overview Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Location */}
        <Card className="shadow-sm border-slate-200 hover:border-primary-200 hover:shadow transition-all">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-primary-100 p-2.5 rounded-lg mr-3">
                <MapPin className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <CardDescription className="text-xs font-medium text-secondary-500">Location</CardDescription>
                {isLoadingStartup ? (
                  <Skeleton className="h-5 w-32 mt-1" />
                ) : (
                  <CardTitle className="text-base font-medium">{startup?.location || "Not specified"}</CardTitle>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funding */}
        <Card className="shadow-sm border-slate-200 hover:border-success-200 hover:shadow transition-all">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-success-100 p-2.5 rounded-lg mr-3">
                <DollarSign className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <CardDescription className="text-xs font-medium text-secondary-500">Funding Sought</CardDescription>
                {isLoadingStartup ? (
                  <Skeleton className="h-5 w-32 mt-1" />
                ) : (
                  <CardTitle className="text-base font-medium">
                    {startup?.amountSought ? formatAmount(startup.amountSought, startup.currency) : "Not specified"}
                  </CardTitle>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="shadow-sm border-slate-200 hover:border-warning-200 hover:shadow transition-all">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-warning-100 p-2.5 rounded-lg mr-3">
                <FileText className="h-5 w-5 text-warning-600" />
              </div>
              <div>
                <CardDescription className="text-xs font-medium text-secondary-500">Documents</CardDescription>
                {isLoadingDocuments ? (
                  <Skeleton className="h-5 w-32 mt-1" />
                ) : (
                  <CardTitle className="text-base font-medium flex items-center">
                    <span className="mr-1.5">{documents?.length || 0}</span>
                    <Badge variant="outline" className="text-xs font-normal border-slate-200">
                      {documents?.length === 1 ? "document" : "documents"}
                    </Badge>
                  </CardTitle>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alignment Score */}
        <Card className="shadow-sm border-slate-200 hover:border-accent-200 hover:shadow transition-all">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-accent-100 p-2.5 rounded-lg mr-3">
                <BarChart2 className="h-5 w-5 text-accent-600" />
              </div>
              <div>
                <CardDescription className="text-xs font-medium text-secondary-500">Alignment Score</CardDescription>
                {isLoadingStartup ? (
                  <Skeleton className="h-5 w-32 mt-1" />
                ) : (
                  <div>
                    <CardTitle className="text-base font-medium flex items-center">
                      {startup?.alignmentScore !== undefined
                        ? (
                            <div className="flex items-center">
                              <span>{Math.round(startup.alignmentScore * 100)}%</span>
                              <div className={`ml-2 w-2 h-2 rounded-full ${
                                startup.alignmentScore >= 0.7 ? "bg-green-500" :
                                startup.alignmentScore >= 0.4 ? "bg-amber-500" :
                                "bg-red-500"
                              }`}></div>
                            </div>
                          )
                        : "Not analyzed"}
                        
                      <Button 
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => regenerateAlignmentMutation.mutate()}
                        disabled={regenerateAlignmentMutation.isPending}
                      >
                        {regenerateAlignmentMutation.isPending ? (
                          <div className="flex items-center">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            <span>Recalculating...</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <RefreshCcw className="h-3 w-3 mr-1" />
                            <span>Recalculate</span>
                          </div>
                        )}
                      </Button>
                    </CardTitle>
                    
                    {startup?.analysisMetadata && (
                      <div className="mt-4 border rounded p-4">
                        <h3 className="font-medium mb-2">Analysis Details</h3>
                        
                        {/* Mostrar resumen */}
                        {startup.analysisMetadata.summary && (
                          <p className="text-sm mb-4">{startup.analysisMetadata.summary}</p>
                        )}
                        
                        {/* Mostrar criterios */}
                        {startup.analysisMetadata.criteria && Object.entries(startup.analysisMetadata.criteria).map(([key, value]) => (
                          <div key={key} className="mb-3">
                            <div className="flex justify-between">
                              <h4 className="text-sm font-medium">{key}</h4>
                              <span className="text-sm">{value.score}%</span>
                            </div>
                            <p className="text-xs text-gray-600">{value.justification}</p>
                          </div>
                        ))}
                        
                        {/* Mostrar recomendaciones */}
                        {startup.analysisMetadata.recommendations && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                            <ul className="text-sm list-disc pl-5">
                              {startup.analysisMetadata.recommendations.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 shadow-sm rounded-lg">
          <TabsTrigger value="overview" className="rounded-md data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-md data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="memos" className="rounded-md data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:shadow-sm">
            <Layers className="h-4 w-4 mr-2" />
            Memos
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-md data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:shadow-sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Ask AI
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Due Diligence Progress */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium flex items-center">
                    <Check className="h-5 w-5 mr-2 text-primary-500" />
                    Due Diligence Progress
                  </CardTitle>
                  <CardDescription>Track your due diligence completion by document category</CardDescription>
                </div>
                {dueDiligence && (
                  <Badge 
                    className={`px-3 py-1 ${
                      dueDiligence.percentage >= 75 ? "bg-green-100 text-green-800 hover:bg-green-200" :
                      dueDiligence.percentage >= 40 ? "bg-amber-100 text-amber-800 hover:bg-amber-200" :
                      "bg-blue-100 text-blue-800 hover:bg-blue-200"
                    }`}
                  >
                    {dueDiligence.percentage}% Complete
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingDueDiligence ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-base font-medium">Overall Progress</Label>
                      <span className="text-sm font-medium">{dueDiligence?.percentage || 0}%</span>
                    </div>
                    <Progress 
                      value={dueDiligence?.percentage || 0} 
                      className="h-2.5"
                      color={dueDiligence?.percentage >= 75 ? "bg-green-500" :
                             dueDiligence?.percentage >= 40 ? "bg-amber-500" :
                             "bg-blue-500"}
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{dueDiligence?.completedItems || 0} of {dueDiligence?.totalItems || 0} items completed</span>
                      <span>Last updated: {dueDiligence ? formatDate(dueDiligence.lastUpdated) : "—"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dueDiligence && dueDiligence.categories && Object.entries(dueDiligence.categories).map(([key, category]) => (
                      <div key={key} className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <Label className="capitalize flex items-center">
                              {getCategoryIcon(key)}
                              {key.replace('-', ' ')}
                              <Badge 
                                variant="outline" 
                                className={`ml-2 text-xs px-1.5 py-0.5 ${
                                  category.importance === 'high' ? 'border-red-200 text-red-700' :
                                  category.importance === 'medium' ? 'border-amber-200 text-amber-700' :
                                  'border-slate-200 text-slate-600'
                                }`}
                              >
                                {category.importance}
                              </Badge>
                            </Label>
                            <p className="text-xs text-slate-500 mt-1">{category.description}</p>
                          </div>
                          <span className="text-xs font-medium px-2 py-0.5 bg-white rounded-full border border-slate-200">
                            {category.uploaded}/{category.required}
                          </span>
                        </div>
                        <Progress 
                          value={category.completion} 
                          className="h-1.5" 
                          color={
                            category.completion >= 100 ? "bg-green-500" :
                            category.completion >= 50 ? "bg-amber-500" :
                            "bg-blue-500"
                          }
                        />
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">
                            {category.completion === 100 ? "Complete" : 
                             category.missingDocs > 0 ? `${category.missingDocs} missing` : 
                             "In progress"}
                          </span>
                          <span className="font-medium text-slate-700">{category.completion}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
              <CardTitle className="text-lg font-medium flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-primary-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200 hover:border-primary-200 transition-all">
                  <CardContent className="p-0">
                    <Button
                      variant="ghost"
                      className="w-full h-full py-6 flex flex-col items-center justify-center rounded-lg text-slate-700 hover:text-primary-700 hover:bg-primary-50"
                      onClick={() => navigate(`/documents?startupId=${id}`)}
                    >
                      <div className="bg-primary-100 p-3 rounded-full mb-3">
                        <Upload className="h-5 w-5 text-primary-600" />
                      </div>
                      <span className="font-medium">Upload Documents</span>
                      <span className="text-xs text-slate-500 mt-1">Add files to this startup</span>
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="border-slate-200 hover:border-accent-200 transition-all">
                  <CardContent className="p-0">
                    <Button
                      variant="ghost"
                      className="w-full h-full py-6 flex flex-col items-center justify-center rounded-lg text-slate-700 hover:text-accent-700 hover:bg-accent-50"
                      onClick={handleGenerateMemo}
                      disabled={generateMemoMutation.isPending}
                    >
                      <div className="bg-accent-100 p-3 rounded-full mb-3">
                        <FileText className="h-5 w-5 text-accent-600" />
                      </div>
                      <span className="font-medium">
                        {generateMemoMutation.isPending ? "Generating..." : "Generate Memo"}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">Create investment analysis</span>
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="border-slate-200 hover:border-indigo-200 transition-all">
                  <CardContent className="p-0">
                    <Button
                      variant="ghost"
                      className="w-full h-full py-6 flex flex-col items-center justify-center rounded-lg text-slate-700 hover:text-indigo-700 hover:bg-indigo-50"
                      onClick={() => navigate(`/ai-assistant?startupId=${id}`)}
                    >
                      <div className="bg-indigo-100 p-3 rounded-full mb-3">
                        <MessageCircle className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="font-medium">Ask AI Assistant</span>
                      <span className="text-xs text-slate-500 mt-1">Get insights from documents</span>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          
          {/* Startup Summary */}
          {!isLoadingStartup && startup && (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-primary-500" />
                  About {startup.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="col-span-2">
                    <h3 className="text-base font-medium mb-2">Overview</h3>
                    <p className="text-slate-600 mb-4">
                      {startup.description || 'No description provided for this startup.'}
                    </p>
                    
                    {/* Primary Contact Information */}
                    {startup.primaryContact && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                          <Contact className="h-4 w-4 mr-2" />
                          Primary Contact
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <User className="h-4 w-4 mr-2 text-blue-600" />
                            <span className="text-slate-700">
                            <strong>{startup.primaryContact.name}</strong> - {startup.primaryContact.position}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Mail className="h-4 w-4 mr-2 text-blue-600" />
                            <a 
                              href={`mailto:${startup.primaryContact.email}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {startup.primaryContact.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {startup.website && (
                      <div className="flex items-center space-x-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => window.open(startup.website, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Website
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h3 className="text-base font-medium mb-3">Key Details</h3>
                    <div className="space-y-3">
                      {startup.foundingDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Founded
                          </span>
                          <span className="font-medium">{formatDate(startup.foundingDate)}</span>
                        </div>
                      )}
                      
                      {startup.firstContactDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 flex items-center">
                            <Contact className="h-4 w-4 mr-2" />
                            First Contact
                          </span>
                          <span className="font-medium">{formatDate(startup.firstContactDate)}</span>
                        </div>
                      )}
                      
                      {startup.teamSize && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Team Size
                          </span>
                          <span className="font-medium">{startup.teamSize}</span>
                        </div>
                      )}
                      
                      {startup.amountSought && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Funding Sought
                          </span>
                          <span className="font-medium">{formatAmount(startup.amountSought, startup.currency)}</span>
                        </div>
                      )}
                      
                      {startup.revenue && (
                       <div className="flex justify-between text-sm">
                         <span className="text-slate-500 flex items-center">
                           <DollarSign className="h-4 w-4 mr-2" />
                           Revenue
                         </span>
                         <span className="font-medium">{startup.currency} {startup.revenue.toLocaleString()}</span>
                       </div>
                     )}
                     
                     {startup.valuation && (
                       <div className="flex justify-between text-sm">
                         <span className="text-slate-500 flex items-center">
                           <BarChart2 className="h-4 w-4 mr-2" />
                           Valuation
                         </span>
                         <span className="font-medium">{startup.currency} {startup.valuation.toLocaleString()}</span>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
         )}
       </TabsContent>

       {/* Documents Tab */}
       <TabsContent value="documents" className="space-y-6">
         <Card className="border-slate-200 shadow-sm overflow-hidden">
           <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 flex flex-row items-center justify-between">
             <div>
               <CardTitle className="text-lg font-medium flex items-center">
                 <FileText className="h-5 w-5 mr-2 text-primary-500" />
                 Documents
               </CardTitle>
               <CardDescription>All documents uploaded for this startup</CardDescription>
             </div>
             <Button 
               onClick={() => navigate(`/documents/upload?startupId=${id}`)}
               className="flex items-center gap-2"
             >
               <FileUp className="h-4 w-4" />
               Upload
             </Button>
           </CardHeader>
           <CardContent className="p-6">
             {isLoadingDocuments ? (
               <div className="space-y-4">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="flex items-center space-x-4 p-3 border border-slate-200 rounded-lg">
                     <Skeleton className="h-12 w-12 rounded-full" />
                     <div className="space-y-2 flex-1">
                       <Skeleton className="h-4 w-48" />
                       <div className="flex items-center gap-2">
                         <Skeleton className="h-4 w-16 rounded-full" />
                         <Skeleton className="h-4 w-24" />
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : documents && documents.length > 0 ? (
               <div className="space-y-3">
                 {documents.map((doc) => (
                   <div key={doc.id} className="p-4 bg-white border border-slate-200 rounded-lg hover:border-primary-200 hover:shadow-sm transition-all">
                     <div className="flex items-start">
                       <div className={`p-3 rounded-lg mr-4 flex-shrink-0 
                         ${doc.type === 'pitch-deck' ? 'bg-blue-100 text-blue-600' : 
                          doc.type === 'financials' ? 'bg-emerald-100 text-emerald-600' : 
                          doc.type === 'legal' ? 'bg-purple-100 text-purple-600' : 
                          doc.type === 'tech' ? 'bg-indigo-100 text-indigo-600' : 
                          'bg-primary-100 text-primary-600'}`}
                       >
                         <FileText className="h-6 w-6" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-start justify-between">
                           <div>
                             <h4 className="text-base font-medium text-slate-800 truncate">{doc.name}</h4>
                             <div className="mt-1 flex items-center flex-wrap gap-2">
                               <Badge variant="outline" className="text-xs capitalize bg-slate-50 border-slate-200">
                                 {doc.type.replace('-', ' ')}
                               </Badge>
                               <span className="text-xs text-slate-500 flex items-center">
                                 <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                 {formatDate(doc.uploadedAt)}
                               </span>
                               <span className={`text-xs inline-flex items-center px-2 py-0.5 rounded-full ${
                                 doc.processed ? 'bg-success-100 text-success-800' : 
                                 doc.processingStatus === 'failed' ? 'bg-destructive-100 text-destructive-800' :
                                 'bg-warning-100 text-warning-800'
                               }`}>
                                 {doc.processed ? (
                                   <><Check className="h-3 w-3 mr-1" /> Processed</>
                                 ) : doc.processingStatus === 'failed' ? (
                                   <><X className="h-3 w-3 mr-1" /> Failed</>
                                 ) : (
                                   <><Clock className="h-3 w-3 mr-1" /> {doc.processingStatus === 'processing' ? 'Processing' : 'Pending'}</>
                                 )}
                               </span>
                             </div>
                           </div>
                           
                           <Button 
                             variant="ghost" 
                             size="sm"
                             className="text-slate-600 hover:text-primary-600"
                             onClick={() => navigate(`/documents/${doc.id}`)}
                           >
                             <ExternalLink className="h-4 w-4" />
                           </Button>
                         </div>
                         
                         {doc.description && (
                           <p className="mt-2 text-sm text-slate-600 line-clamp-2">{doc.description}</p>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-12 px-4">
                 <div className="bg-slate-50 inline-flex rounded-full p-4 mb-4">
                   <FileText className="h-8 w-8 text-slate-400" />
                 </div>
                 <h3 className="mt-2 text-lg font-medium text-slate-800">No documents yet</h3>
                 <p className="mt-1 text-base text-slate-500 max-w-md mx-auto">
                   Get started by uploading documents for this startup. Documents will help with due diligence and investment decisions.
                 </p>
                 <div className="mt-6">
                   <Button onClick={() => navigate(`/documents/upload?startupId=${id}`)}>
                     <FileUp className="h-4 w-4 mr-2" />
                     Upload First Document
                   </Button>
                 </div>
               </div>
             )}
           </CardContent>
           <CardFooter className="bg-slate-50 border-t border-slate-200 py-3 flex justify-between">
             <div className="text-xs text-slate-500">
               {documents?.length ? `${documents.length} document${documents.length !== 1 ? 's' : ''} found` : 'No documents'}
             </div>
             <Button 
               variant="link" 
               size="sm" 
               className="text-xs text-primary-600"
               onClick={() => navigate('/documents')}
             >
               View All Documents
             </Button>
           </CardFooter>
         </Card>
       </TabsContent>

       {/* Memos Tab */}
       <TabsContent value="memos" className="space-y-6">
         <Card className="border-slate-200 shadow-sm overflow-hidden">
           <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 flex flex-row items-center justify-between">
             <div>
               <CardTitle className="text-lg font-medium flex items-center">
                 <Layers className="h-5 w-5 mr-2 text-primary-500" />
                 Investment Memos
               </CardTitle>
               <CardDescription>Generated investment memos for this startup</CardDescription>
             </div>
             <Button 
               onClick={handleGenerateMemo}
               disabled={generateMemoMutation.isPending}
               className="flex items-center gap-2"
             >
               <FileText className="h-4 w-4" />
               {generateMemoMutation.isPending ? "Generating..." : "Generate Memo"}
             </Button>
           </CardHeader>
           <CardContent className="p-6">
             {isLoadingMemos ? (
               <div className="space-y-4">
                 {[1, 2].map((i) => (
                   <div key={i} className="flex items-center space-x-4 p-3 border border-slate-200 rounded-lg">
                     <Skeleton className="h-12 w-12 rounded-lg" />
                     <div className="space-y-2 flex-1">
                       <Skeleton className="h-4 w-48" />
                       <div className="flex items-center gap-2">
                         <Skeleton className="h-4 w-16 rounded-full" />
                         <Skeleton className="h-4 w-24" />
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : memos && memos.length > 0 ? (
               <div className="space-y-3">
                 {memos.map((memo) => (
                   <div key={memo.id} className="p-4 bg-white border border-slate-200 rounded-lg hover:border-accent-200 hover:shadow-sm transition-all">
                     <div className="flex items-start">
                       <div className="p-3 rounded-lg mr-4 flex-shrink-0 bg-accent-100 text-accent-600">
                         <Layers className="h-6 w-6" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-start justify-between">
                           <div>
                             <h4 className="text-base font-medium text-slate-800">
                               Investment Memo v{memo.version}
                             </h4>
                             <div className="mt-1 flex items-center flex-wrap gap-2">
                               <Badge 
                                 variant={memo.status === 'draft' ? 'outline' : 
                                         memo.status === 'review' ? 'secondary' : 'success'} 
                                 className="text-xs capitalize"
                               >
                                 {memo.status}
                               </Badge>
                               <span className="text-xs text-slate-500 flex items-center">
                                 <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                 {formatDate(memo.createdAt)}
                               </span>
                               <span className="text-xs text-slate-500 flex items-center">
                                 <AlignLeft className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                 {memo.sections?.length || 0} sections
                               </span>
                             </div>
                           </div>
                           
                           <Button 
                             variant="outline" 
                             size="sm"
                             className="text-accent-600 border-accent-200 hover:bg-accent-50"
                             onClick={() => navigate(`/memos/${memo.id}`)}
                           >
                             <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                             View
                           </Button>
                         </div>
                         
                         {memo.summary && (
                           <p className="mt-2 text-sm text-slate-600 line-clamp-2">{memo.summary}</p>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-12 px-4">
                 <div className="bg-slate-50 inline-flex rounded-full p-4 mb-4">
                   <AlignLeft className="h-8 w-8 text-slate-400" />
                 </div>
                 <h3 className="mt-2 text-lg font-medium text-slate-800">No memos yet</h3>
                 <p className="mt-1 text-base text-slate-500 max-w-md mx-auto">
                   Generate your first investment memo for this startup to analyze its potential and document your investment thesis.
                 </p>
                 <div className="mt-6">
                   <Button 
                     onClick={handleGenerateMemo}
                     disabled={generateMemoMutation.isPending}
                     className="flex items-center gap-2"
                   >
                     <FileText className="h-4 w-4" />
                     {generateMemoMutation.isPending ? "Generating..." : "Generate First Memo"}
                   </Button>
                 </div>
               </div>
             )}
           </CardContent>
           <CardFooter className="bg-slate-50 border-t border-slate-200 py-3 flex justify-between">
             <div className="text-xs text-slate-500">
               {memos?.length ? `${memos.length} memo${memos.length !== 1 ? 's' : ''} found` : 'No memos'}
             </div>
             <Button 
               variant="link" 
               size="sm" 
               className="text-xs text-primary-600"
               onClick={() => navigate('/memos')}
             >
               View All Memos
             </Button>
           </CardFooter>
         </Card>
       </TabsContent>

       {/* AI Assistant Tab */}
       <TabsContent value="ai" className="space-y-6">
         <Card className="border-slate-200 shadow-sm overflow-hidden">
           <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
             <CardTitle className="text-lg font-medium flex items-center">
               <MessageCircle className="h-5 w-5 mr-2 text-primary-500" />
               AI Assistant
             </CardTitle>
             <CardDescription>
               Ask questions about this startup based on the uploaded documents
             </CardDescription>
           </CardHeader>
           <CardContent className="p-6">
             <div className="text-center py-12 px-4">
               <div className="bg-indigo-50 inline-flex rounded-full p-4 mb-4">
                 <MessageCircle className="h-8 w-8 text-indigo-600" />
               </div>
               <h3 className="mt-2 text-lg font-medium text-slate-800">AI Assistant</h3>
               <p className="mt-1 text-base text-slate-500 max-w-md mx-auto">
                 Get insights from documents, analyze financial data, and ask questions about {startup?.name || "this startup"}.
               </p>
               <div className="mt-6 space-x-3">
                 <Button 
                   onClick={() => navigate(`/ai-assistant?startupId=${id}`)}
                   className="flex items-center gap-2"
                 >
                   <MessageCircle className="h-4 w-4" />
                   Go to AI Assistant
                 </Button>
               </div>
             </div>
           </CardContent>
           
           <CardFooter className="bg-slate-50 border-t border-slate-200 p-4">
             <div className="w-full">
               <h4 className="text-xs font-medium text-slate-700 mb-2">Sample Questions:</h4>
               <div className="flex flex-wrap gap-2">
                 {getSampleQuestions(startup?.vertical).map((question, idx) => (
                   <Badge 
                     key={idx} 
                     variant="outline" 
                     className="text-xs cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                     onClick={() => navigate(`/ai-assistant?startupId=${id}&question=${encodeURIComponent(question)}`)}
                   >
                     {question}
                   </Badge>
                 ))}
               </div>
             </div>
           </CardFooter>
         </Card>
       </TabsContent>
     </Tabs>
   </div>
 );
}

// Helper function to get category icon
function getCategoryIcon(category: string) {
 switch(category.toLowerCase()) {
   case 'financials':
     return <DollarSign className="h-4 w-4 mr-2 text-emerald-600" />;
   case 'legal':
     return <FileText className="h-4 w-4 mr-2 text-purple-600" />;
   case 'pitch-deck':
     return <Layers className="h-4 w-4 mr-2 text-blue-600" />;
   case 'tech':
     return <Sparkles className="h-4 w-4 mr-2 text-indigo-600" />;
   case 'market':
     return <BarChart2 className="h-4 w-4 mr-2 text-amber-600" />;
   case 'other':
     return <FileText className="h-4 w-4 mr-2 text-slate-600" />;
   default:
     return <FileText className="h-4 w-4 mr-2 text-slate-600" />;
 }
}

// Helper function to get sample questions based on vertical
function getSampleQuestions(vertical?: string) {
 const baseQuestions = [
   "What are the key metrics?",
   "Who is on the founding team?"
 ];
 
 if (!vertical) return baseQuestions;
 
 switch(vertical.toLowerCase()) {
   case 'fintech':
     return [
       "What are the unit economics?",
       "What's the customer acquisition cost?",
       "What regulations apply?"
     ];
   case 'ai':
     return [
       "What AI technology do they use?",
       "What's their data strategy?",
       "How do they compare to competitors?"
     ];
   case 'saas':
     return [
       "What's their MRR growth?",
       "What's their churn rate?",
       "How is their sales pipeline?"
     ];
   case 'health':
     return [
       "What clinical validation exists?",
       "What's their regulatory pathway?",
       "What's the go-to-market strategy?"
     ];
   default:
     return [
       "What's the business model?",
       "What's the market opportunity?",
       "What's the competitive landscape?"
     ];
 }
}