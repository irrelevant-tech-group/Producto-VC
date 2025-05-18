import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchStartups, fetchStartupDocuments } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Upload, 
  FileText,
  Filter,
  X,
  Eye,
  Calendar,
  Clock,
  User2,
  ChevronRight,
  Download,
  FileArchive,
  Bookmark,
  FilePlus,
  Loader2,
  Plus
} from "lucide-react";

export default function DocumentsList() {
  // Get current location for navigation
  const [location, setLocation] = useLocation();
  
  // Extract startup ID from URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedStartupId = searchParams.get('startupId');
  
  // State
  const [selectedStartupId, setSelectedStartupId] = useState(preselectedStartupId || "");
  const [filterType, setFilterType] = useState("all");

  // Update URL when startup selection changes
  useEffect(() => {
    if (selectedStartupId) {
      const newParams = new URLSearchParams();
      newParams.set('startupId', selectedStartupId);
      setLocation(`/documents?${newParams.toString()}`, { replace: true });
    } else if (preselectedStartupId) {
      setLocation('/documents', { replace: true });
    }
  }, [selectedStartupId, setLocation]);

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

  // Filter documents by type
  const filteredDocuments = documents && filterType !== "all"
    ? documents.filter(doc => doc.type === filterType)
    : documents;

  // Document type icon mapping
  const typeConfig = {
    'pitch-deck': { 
      icon: FileText, 
      color: "text-amber-600", 
      bg: "bg-amber-100", 
      border: "border-amber-200",
      label: "Pitch Deck"
    },
    'financial-statement': { 
      icon: FileText, 
      color: "text-green-600", 
      bg: "bg-green-100", 
      border: "border-green-200",
      label: "Financial Statement" 
    },
    'legal-document': { 
      icon: FileText, 
      color: "text-blue-600", 
      bg: "bg-blue-100", 
      border: "border-blue-200",
      label: "Legal Document" 
    },
    'market-research': { 
      icon: FileText, 
      color: "text-indigo-600", 
      bg: "bg-indigo-100", 
      border: "border-indigo-200",
      label: "Market Research" 
    },
    'other': { 
      icon: FileText, 
      color: "text-slate-600", 
      bg: "bg-slate-100", 
      border: "border-slate-200",
      label: "Other Document" 
    }
  };

  // Get unique document types for filter
  const documentTypes = documents
    ? Array.from(new Set(documents.map(doc => doc.type)))
    : [];

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
            {filteredDocuments && (
              <Badge variant="outline" className="font-normal text-slate-600">
                {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Upload and manage documents for your startups
          </p>
        </div>
        
        {selectedStartupId && (
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => window.location.href = `/documents/upload?startupId=${selectedStartupId}`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
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
                Select a startup to view its documents
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
                
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => window.location.href = `/startups/${selectedStartupId}`}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Startup Details
                </Button>
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

      {/* Type Filter Tabs - Only show if we have documents */}
      {selectedStartupId && documents && documents.length > 0 && documentTypes.length > 1 && (
        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-medium text-slate-700">Filter by Document Type</h2>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
              className={filterType === "all" ? "bg-blue-600 hover:bg-blue-700" : "text-slate-700"}
            >
              All Types
            </Button>
            
            {documentTypes.map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
                className={filterType === type ? "bg-blue-600 hover:bg-blue-700" : "text-slate-700"}
              >
                {typeConfig[type]?.label || type.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      {selectedStartupId ? (
        isLoadingDocuments ? (
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
        ) : filteredDocuments && filteredDocuments.length > 0 ? (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => {
              const DocTypeIcon = typeConfig[doc.type]?.icon || FileText;
              
              return (
                <Card key={doc.id} className="overflow-hidden border-slate-200 hover:border-blue-300 transition-all hover:shadow-md cursor-pointer group" onClick={() => window.location.href = `/documents/${doc.id}`}>
                  <CardContent className="p-0">
                    <div className="p-5 border-b border-slate-100">
                      <div className="flex items-start">
                        <div className={`p-2 rounded-lg ${typeConfig[doc.type]?.bg || 'bg-blue-100'} ${typeConfig[doc.type]?.border || 'border-blue-200'} border`}>
                          <DocTypeIcon className={`h-5 w-5 ${typeConfig[doc.type]?.color || 'text-blue-600'}`} />
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-lg font-medium text-slate-800 group-hover:text-blue-700 transition-colors">
                            {doc.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-2 items-center">
                            <Badge 
                              className={`capitalize ${typeConfig[doc.type]?.bg || 'bg-blue-100'} ${typeConfig[doc.type]?.color || 'text-blue-600'} border-0`}
                            >
                              {typeConfig[doc.type]?.label || doc.type.replace('-', ' ')}
                            </Badge>
                            
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              doc.processed ? 'bg-green-100 text-green-800' : 
                              doc.processingStatus === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {doc.processed ? 'Processed' : 
                              doc.processingStatus === 'failed' ? 'Failed' : 
                              doc.processingStatus === 'processing' ? 'Processing' : 'Pending'}
                            </span>
                            
                            {doc.uploadedBy && (
                              <span className="text-sm text-slate-500 flex items-center">
                                <User2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                {doc.uploadedBy}
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
                            Uploaded {new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          
                          {doc.lastViewed && (
                            <div className="flex items-center text-sm text-slate-500">
                              <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                              Last viewed {new Date(doc.lastViewed).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle download logic here
                              console.log(`Downloading document: ${doc.id}`);
                            }}
                          >
                            <Download className="h-4 w-4 mr-1.5" />
                            Download
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-sm text-slate-500 hover:text-blue-600 p-0 h-auto group-hover:translate-x-0.5 transition-transform"
                          >
                            View Details
                            <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-70" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-800">No documents found</h3>
              <p className="mt-1 text-slate-500 max-w-md mx-auto">
                This startup doesn't have any documents yet. Upload your first document to get started.
              </p>
              <Button 
                className="mt-6 bg-blue-600 hover:bg-blue-700"
                onClick={() => window.location.href = `/documents/upload?startupId=${selectedStartupId}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload First Document
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
              Choose a startup from the dropdown above to view and manage its documents
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}