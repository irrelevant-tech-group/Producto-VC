import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchStartups, fetchStartupDocuments } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, 
  FileText,
  Filter,
  X,
} from "lucide-react";

export default function DocumentsList() {
  const [, navigate] = useLocation();
  
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

  // Fetch documents for selected startup
  const {
    data: documents,
    isLoading: isLoadingDocuments,
  } = useQuery({
    queryKey: ['/api/startups', selectedStartupId, 'documents'],
    queryFn: () => fetchStartupDocuments(selectedStartupId),
    enabled: !!selectedStartupId,
  });

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Documents</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Upload and manage documents for your startups
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            className="flex items-center"
            onClick={() => navigate("/startups")}
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Document
          </Button>
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

      {/* Documents List */}
      {selectedStartupId ? (
        isLoadingDocuments ? (
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
        ) : documents && documents.length > 0 ? (
          <div className="space-y-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start py-2">
                    <div className={`p-2 rounded-md bg-primary-100 text-primary-600`}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-medium">{doc.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-2 items-center">
                        <Badge variant="outline" className="capitalize">
                          {doc.type.replace('-', ' ')}
                        </Badge>
                        <span className="text-sm text-secondary-500">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
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
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto text-secondary-400" />
              <h3 className="mt-2 text-lg font-medium">No documents found</h3>
              <p className="mt-1 text-secondary-500">
                This startup doesn't have any documents yet. Upload your first document to get started.
              </p>
              <Button 
                className="mt-4"
                onClick={() => navigate(`/startups/${selectedStartupId}`)}
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Document
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
              Choose a startup from the dropdown above to view and manage its documents
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}