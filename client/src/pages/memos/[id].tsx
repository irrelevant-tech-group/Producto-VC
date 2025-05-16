import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchMemo, exportMemo, updateMemo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Download, Edit, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function MemoDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState<string | null>(null);

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

  if (error) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-error-600">Error Loading Memo</h1>
          <p className="mt-2 text-secondary-600">
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
          <a className="flex items-center text-sm text-secondary-600 hover:text-primary-600 mb-2">
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
              <h1 className="text-2xl font-bold text-secondary-900">
                Investment Memo v{memo.version}
              </h1>
              <p className="mt-1 text-sm text-secondary-500">
                Created {new Date(memo.createdAt).toLocaleDateString()}
                {memo.updatedAt && memo.updatedAt !== memo.createdAt && 
                  ` • Updated ${new Date(memo.updatedAt).toLocaleDateString()}`}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
              <Badge variant={
                memo.status === 'draft' ? 'outline' : 
                memo.status === 'review' ? 'secondary' : 'success'
              } className="text-sm capitalize">
                {memo.status}
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
                <Button variant="ghost" size="sm" className="text-secondary-500">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Display memo content with proper formatting */}
                <div className="prose prose-secondary max-w-none">
                  {section.content.split('\n\n').map((paragraph, pidx) => (
                    <p key={pidx}>{paragraph}</p>
                  ))}
                </div>
                
                {/* Show sources if available */}
                {section.sources && section.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-secondary-200">
                    <h4 className="text-sm font-semibold text-secondary-600 mb-2">Sources</h4>
                    <div className="space-y-2">
                      {section.sources.map((source, sidx) => (
                        <div key={sidx} className="text-xs p-2 bg-secondary-50 rounded-md">
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
            <div className="h-12 w-12 mx-auto text-secondary-400">
              <FileText />
            </div>
            <h3 className="mt-2 text-lg font-medium">No content available</h3>
            <p className="mt-1 text-secondary-500">
              This memo appears to be empty or is still being generated.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}