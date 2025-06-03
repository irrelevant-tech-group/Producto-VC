import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchMemo, exportMemo, updateMemo, approveMemo, rejectMemo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Download, Edit, Check, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MemoApprovalModal } from "@/components/modals/MemoApprovalModal";

export default function MemoDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  
  // Modal states
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | null;
  }>({ isOpen: false, type: null });

  // Fetch memo details
  const {
    data: memo,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/memos', id],
    queryFn: () => fetchMemo(id as string),
    enabled: !!id,
  });

  // Approval mutations
  const approveMutation = useMutation({
    mutationFn: (data: any) => approveMemo(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memos', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/startups'] });
      setApprovalModal({ isOpen: false, type: null });
      toast({
        title: "Memo Approved",
        description: "The memo has been approved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to approve memo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (data: any) => rejectMemo(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memos', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/startups'] });
      setApprovalModal({ isOpen: false, type: null });
      toast({
        title: "Memo Rejected",
        description: "The memo has been rejected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reject memo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleApprovalSubmit = (data: any) => {
    if (approvalModal.type === 'approve') {
      approveMutation.mutate(data);
    } else if (approvalModal.type === 'reject') {
      rejectMutation.mutate(data);
    }
  };

  const isApprovalLoading = approveMutation.isPending || rejectMutation.isPending;

  // Handle document export
  const handleExport = async (format: 'pdf' | 'docx' | 'slides') => {
    try {
      setExportLoading(format);
      const result = await exportMemo(id as string, format);
      
      // In a real implementation, we would download the file
      // For now just show a success message
      toast({
        title: "Export Successful",
        description: `Memo exported as ${format.toUpperCase()}`,
      });
      
      // Simulate opening the document
      window.open(result.url, '_blank');
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to export memo: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setExportLoading(null);
    }
  };

  // Get status badge configuration
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'outline', label: 'Draft' },
      review: { variant: 'secondary', label: 'In Review' },
      final: { variant: 'default', label: 'Final' },
      approved: { variant: 'success', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };
    return statusConfig[status] || statusConfig.draft;
  };

  if (error) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600">Error Loading Memo</h1>
          <p className="mt-2 text-slate-600">
            We couldn't find the memo you're looking for. It may have been removed or the ID is invalid.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/memos">
          <a className="flex items-center text-sm text-slate-600 hover:text-blue-600 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to memos
          </a>
        </Link>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : memo ? (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Investment Memo v{memo.version}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Created {new Date(memo.createdAt).toLocaleDateString()}
                {memo.updatedAt && memo.updatedAt !== memo.createdAt && 
                  ` • Updated ${new Date(memo.updatedAt).toLocaleDateString()}`}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
              <Badge 
                variant={getStatusBadge(memo.status).variant as any} 
                className="text-sm capitalize"
              >
                {getStatusBadge(memo.status).label}
              </Badge>
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button 
          variant="outline" 
          className="flex items-center"
          onClick={() => handleExport('pdf')}
          disabled={isLoading || !!exportLoading}
        >
          {exportLoading === 'pdf' ? (
            <>Loading...</>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="flex items-center"
          onClick={() => handleExport('docx')}
          disabled={isLoading || !!exportLoading}
        >
          {exportLoading === 'docx' ? (
            <>Loading...</>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Export as DOCX
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="flex items-center"
          onClick={() => handleExport('slides')}
          disabled={isLoading || !!exportLoading}
        >
          {exportLoading === 'slides' ? (
            <>Loading...</>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Export as Slides
            </>
          )}
        </Button>

        {/* Approval Buttons - Solo mostrar si el memo está en estado 'final' o 'review' */}
        {memo && (memo.status === 'final' || memo.status === 'review') && (
          <>
            <Button
              onClick={() => setApprovalModal({ isOpen: true, type: 'approve' })}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={isApprovalLoading}
            >
              <CheckCircle className="h-4 w-4" />
              Approve Memo
            </Button>
            
            <Button
              onClick={() => setApprovalModal({ isOpen: true, type: 'reject' })}
              variant="outline"
              className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
              disabled={isApprovalLoading}
            >
              <XCircle className="h-4 w-4" />
              Reject Memo
            </Button>
          </>
        )}
      </div>

      {/* Memo Content */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : memo && memo.sections ? (
        <div className="space-y-6">
          {memo.sections.map((section, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-500">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Display memo content with proper formatting */}
                <div className="prose prose-slate max-w-none">
                  {section.content.split('\n\n').map((paragraph, pidx) => (
                    <p key={pidx}>{paragraph}</p>
                  ))}
                </div>
                
                {/* Show sources if available */}
                {section.sources && section.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Sources</h4>
                    <div className="space-y-2">
                      {section.sources.map((source, sidx) => (
                        <div key={sidx} className="text-xs p-2 bg-slate-50 rounded-md">
                          {source.content.length > 150 
                            ? `${source.content.substring(0, 150)}...` 
                            : source.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 mx-auto text-slate-400">
              <FileText />
            </div>
            <h3 className="mt-2 text-lg font-medium">No content available</h3>
            <p className="mt-1 text-slate-500">
              This memo appears to be empty or is still being generated.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Memo Approval Modal */}
      <MemoApprovalModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, type: null })}
        approvalType={approvalModal.type!}
        memoVersion={memo?.version || 1}
        onSubmit={handleApprovalSubmit}
        isLoading={isApprovalLoading}
      />
    </div>
  );
}