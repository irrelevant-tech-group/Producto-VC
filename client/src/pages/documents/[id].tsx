import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchDocument } from "@/lib/api"; // We'll need to add this API function
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Check, 
  X, 
  Clock,
  Calendar,
  User2
} from "lucide-react";

export default function DocumentDetail() {
  const { id } = useParams();

  // Fetch document details
  const {
    data: document,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/documents', id],
    queryFn: () => fetchDocument(id as string),
    enabled: !!id,
  });

  // Handle document download
  const handleDownload = () => {
    if (document?.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  };

  if (error) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600">Error Loading Document</h1>
          <p className="mt-2 text-slate-600">
            We couldn't find the document you're looking for. It may have been removed or the ID is invalid.
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
        <Link href="/documents">
          <a className="flex items-center text-sm text-slate-600 hover:text-blue-600 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to documents
          </a>
        </Link>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : document ? (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{document.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Uploaded {new Date(document.uploadedAt).toLocaleDateString()} 
                {document.uploadedBy && ` by ${document.uploadedBy}`}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
              <Badge className={`capitalize ${
                document.type === 'pitch-deck' ? 'bg-blue-100 text-blue-800' : 
                document.type === 'financials' ? 'bg-green-100 text-green-800' : 
                document.type === 'legal' ? 'bg-purple-100 text-purple-800' : 
                document.type === 'tech' ? 'bg-indigo-100 text-indigo-800' : 
                'bg-slate-100 text-slate-800'
              }`}>
                {document.type.replace('-', ' ')}
              </Badge>
              
              <Badge variant={
                document.processed ? 'success' : 
                document.processingStatus === 'failed' ? 'destructive' : 'outline'
              } className="text-sm">
                {document.processed ? 'Processed' : 
                 document.processingStatus === 'failed' ? 'Failed' : 
                 document.processingStatus === 'processing' ? 'Processing' : 'Pending'}
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
          onClick={handleDownload}
          disabled={isLoading || !document?.fileUrl}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Document
        </Button>
      </div>

      {/* Document Content/Preview */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : document ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Document Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {document.description && (
              <div>
                <h3 className="font-medium text-slate-800 mb-2">Description</h3>
                <p className="text-slate-600">{document.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h3 className="font-medium text-slate-800 mb-2">Document Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <FileText className="h-4 w-4 mr-2 text-slate-400" />
                    <span className="font-medium">Type:</span>
                    <span className="ml-2">{document.type.replace('-', ' ')}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                    <span className="font-medium">Uploaded on:</span>
                    <span className="ml-2">{new Date(document.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  
                  {document.uploadedBy && (
                    <div className="flex items-center text-sm">
                      <User2 className="h-4 w-4 mr-2 text-slate-400" />
                      <span className="font-medium">Uploaded by:</span>
                      <span className="ml-2">{document.uploadedBy}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm">
                    <div className={`h-4 w-4 mr-2 flex items-center justify-center rounded-full
                      ${document.processed ? 'text-green-500' : 
                       document.processingStatus === 'failed' ? 'text-red-500' : 
                       'text-amber-500'}`}
                    >
                      {document.processed ? (
                        <Check className="h-3 w-3" />
                      ) : document.processingStatus === 'failed' ? (
                        <X className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-2">
                      {document.processed ? 'Processed' : 
                       document.processingStatus === 'failed' ? 'Processing failed' : 
                       document.processingStatus === 'processing' ? 'Processing in progress' : 
                       'Pending processing'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Add more document details here based on metadata */}
              <div>
                <h3 className="font-medium text-slate-800 mb-2">File Information</h3>
                <div className="space-y-2">
                  {document.metadata?.originalName && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium">Original filename:</span>
                      <span className="ml-2">{document.metadata.originalName}</span>
                    </div>
                  )}
                  
                  {document.metadata?.size && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium">File size:</span>
                      <span className="ml-2">{formatFileSize(document.metadata.size)}</span>
                    </div>
                  )}
                  
                  {document.fileType && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium">File type:</span>
                      <span className="ml-2">{document.fileType}</span>
                    </div>
                  )}
                  
                  {document.metadata?.storageProvider && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium">Storage:</span>
                      <span className="ml-2">
                        {document.metadata.storageProvider === 'google-cloud-storage' ? 
                          'Google Cloud Storage' : 'Local storage'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-slate-100 bg-slate-50">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()} 
              className="text-slate-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownload}
              disabled={!document?.fileUrl}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 mx-auto text-slate-400">
              <FileText />
            </div>
            <h3 className="mt-2 text-lg font-medium">Document not found</h3>
            <p className="mt-1 text-slate-500">
              This document may have been removed or is not accessible.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}