import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchStartup, fetchDueDiligenceProgress, fetchStartupDocuments, fetchStartupMemos, generateMemo } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

  // Handle memo generation
  const handleGenerateMemo = () => {
    generateMemoMutation.mutate();
  };

  if (startupError) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-error-600">Error Loading Startup</h1>
          <p className="mt-2 text-secondary-600">
            We couldn't find the startup you're looking for. It may have been removed or the ID is invalid.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/startups")}
            className="mt-4"
          >
            Back to Startups
          </Button>
        </div>
      </div>
    );
  }

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const variants = {
      active: "primary",
      invested: "success",
      declined: "destructive",
      archived: "secondary",
    };
    return variants[status] || "secondary";
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/startups">
          <a className="flex items-center text-sm text-secondary-600 hover:text-primary-600 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to startups
          </a>
        </Link>

        {isLoadingStartup ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">{startup.name}</h1>
                <p className="mt-1 text-sm text-secondary-500">
                  {startup.vertical.charAt(0).toUpperCase() + startup.vertical.slice(1)} • {startup.stage} • Added on {new Date(startup.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-2 sm:mt-0">
                <Badge variant={getStatusBadge(startup.status) as any} className="text-sm">
                  {startup.status.charAt(0).toUpperCase() + startup.status.slice(1)}
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Startup Overview Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Location */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-primary-100 p-2 rounded-md mr-3">
                <MapPin className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <CardDescription className="text-xs">Location</CardDescription>
                {isLoadingStartup ? (
                  <Skeleton className="h-5 w-32 mt-1" />
                ) : (
                  <CardTitle className="text-sm font-medium">{startup.location}</CardTitle>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funding */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-success-100 p-2 rounded-md mr-3">
                <DollarSign className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <CardDescription className="text-xs">Funding Sought</CardDescription>
                {isLoadingStartup ? (
                  <Skeleton className="h-5 w-32 mt-1" />
                ) : (
                  <CardTitle className="text-sm font-medium">
                    {startup.amountSought
                      ? `${startup.currency} ${startup.amountSought.toLocaleString()}`
                      : "Not specified"}
                  </CardTitle>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-warning-100 p-2 rounded-md mr-3">
                <FileText className="h-5 w-5 text-warning-600" />
              </div>
              <div>
                <CardDescription className="text-xs">Documents</CardDescription>
                {isLoadingDocuments ? (
                  <Skeleton className="h-5 w-32 mt-1" />
                ) : (
                  <CardTitle className="text-sm font-medium">
                    {documents?.length || 0} documents
                  </CardTitle>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alignment Score */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-accent-100 p-2 rounded-md mr-3">
                <BarChart2 className="h-5 w-5 text-accent-600" />
              </div>
              <div>
                <CardDescription className="text-xs">Alignment Score</CardDescription>
                {isLoadingStartup ? (
                  <Skeleton className="h-5 w-32 mt-1" />
                ) : (
                  <CardTitle className="text-sm font-medium">
                    {startup.alignmentScore
                      ? `${Math.round(startup.alignmentScore * 100)}%`
                      : "Not analyzed"}
                  </CardTitle>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-4 md:w-auto md:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="memos">Memos</TabsTrigger>
          <TabsTrigger value="ai">Ask AI</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Due Diligence Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Due Diligence Progress</CardTitle>
              <CardDescription>Track your due diligence completion by document category</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDueDiligence ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Overall Progress</Label>
                      <span className="text-sm font-medium">{dueDiligence?.overallCompletion || 0}%</span>
                    </div>
                    <Progress value={dueDiligence?.overallCompletion || 0} className="h-2" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dueDiligence && Object.entries(dueDiligence.categories).map(([key, category]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="capitalize">{key.replace('-', ' ')}</Label>
                          <span className="text-xs">{category.uploaded}/{category.required}</span>
                        </div>
                        <Progress value={category.completion} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="flex items-center justify-center py-6"
                  onClick={() => navigate(`/documents?startupId=${id}`)}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Documents
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-center py-6"
                  onClick={handleGenerateMemo}
                  disabled={generateMemoMutation.isPending}
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Generate Memo
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center justify-center py-6"
                  onClick={() => navigate(`/ai-assistant?startupId=${id}`)}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Ask AI Assistant
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Documents</CardTitle>
                <CardDescription>All documents uploaded for this startup</CardDescription>
              </div>
              <Button onClick={() => navigate(`/documents/upload?startupId=${id}`)}>
                <FileUp className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="divide-y">
                  {documents.map((doc) => (
                    <div key={doc.id} className="py-3 flex items-start">
                      <div className={`p-2 rounded-md mr-3 bg-primary-100 text-primary-600`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{doc.name}</h4>
                        <div className="mt-1 flex items-center">
                          <Badge variant="outline" className="text-xs mr-2 capitalize">
                            {doc.type.replace('-', ' ')}
                          </Badge>
                          <span className="text-xs text-secondary-500">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-1 text-xs">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full ${
                            doc.processed ? 'bg-success-100 text-success-800' : 
                            doc.processingStatus === 'failed' ? 'bg-destructive-100 text-destructive-800' :
                            'bg-warning-100 text-warning-800'
                          }`}>
                            {doc.processed ? 'Processed' : 
                             doc.processingStatus === 'failed' ? 'Failed' : 
                             doc.processingStatus === 'processing' ? 'Processing' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-8 w-8 text-secondary-400" />
                  <h3 className="mt-2 text-sm font-medium text-secondary-900">No documents yet</h3>
                  <p className="mt-1 text-sm text-secondary-500">
                    Get started by uploading documents for this startup.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => navigate(`/documents?startupId=${id}`)}>
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Memos Tab */}
        <TabsContent value="memos" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Investment Memos</CardTitle>
                <CardDescription>Generated investment memos for this startup</CardDescription>
              </div>
              <Button 
                onClick={handleGenerateMemo}
                disabled={generateMemoMutation.isPending}
              >
                <FileText className="h-4 w-4 mr-2" />
                {generateMemoMutation.isPending ? "Generating..." : "Generate Memo"}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingMemos ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : memos && memos.length > 0 ? (
                <div className="divide-y">
                  {memos.map((memo) => (
                    <div key={memo.id} className="py-3">
                      <Link href={`/memos/${memo.id}`}>
                        <a className="flex items-start hover:bg-secondary-50 p-2 rounded-md -mx-2">
                          <div className={`p-2 rounded-md mr-3 bg-accent-100 text-accent-600`}>
                            <Layers className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium">Investment Memo v{memo.version}</h4>
                            <div className="mt-1 flex items-center">
                              <Badge 
                                variant={memo.status === 'draft' ? 'outline' : 
                                        memo.status === 'review' ? 'secondary' : 'success'} 
                                className="text-xs mr-2 capitalize"
                              >
                                {memo.status}
                              </Badge>
                              <span className="text-xs text-secondary-500">
                                {new Date(memo.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-secondary-500">
                              {memo.sections?.length || 0} sections
                            </p>
                          </div>
                        </a>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlignLeft className="mx-auto h-8 w-8 text-secondary-400" />
                  <h3 className="mt-2 text-sm font-medium text-secondary-900">No memos yet</h3>
                  <p className="mt-1 text-sm text-secondary-500">
                    Generate your first investment memo for this startup.
                  </p>
                  <div className="mt-6">
                    <Button 
                      onClick={handleGenerateMemo}
                      disabled={generateMemoMutation.isPending}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Memo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Assistant</CardTitle>
              <CardDescription>
                Ask questions about this startup based on the uploaded documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageCircle className="mx-auto h-8 w-8 text-secondary-400" />
                <h3 className="mt-2 text-sm font-medium text-secondary-900">AI Assistant</h3>
                <p className="mt-1 text-sm text-secondary-500">
                  Use the AI assistant to query information from the startup's documents.
                </p>
                <div className="mt-6">
                  <Button onClick={() => navigate(`/ai-assistant?startupId=${id}`)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Go to AI Assistant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}