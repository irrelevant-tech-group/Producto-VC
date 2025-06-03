import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchStartups, uploadDocument } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useActiveDDTemplate } from "@/hooks/useDueDiligence";
import { 
  Upload, 
  ArrowLeft, 
  File, 
  FileText, 
  FilePlus,
  Bookmark,
  AlertCircle,
  CheckCircle,
  Calendar,
  Clock,
  Info,
  Eye,
  Loader2
} from "lucide-react";

export default function UploadDocument() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract startup ID from URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedStartupId = searchParams.get('startupId');
  
  // State
  const [selectedStartupId, setSelectedStartupId] = useState(preselectedStartupId || "");
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: activeTemplate } = useActiveDDTemplate();
  const categoryOptions = activeTemplate?.categories.map(cat => ({
    value: cat.key,
    label: cat.name,
    description: cat.description
  })) || [];
  
  // Fetch all startups
  const { data: startups, isLoading: isLoadingStartups } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: fetchStartups
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
  
  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadDocument(formData),
    onSuccess: () => {
      // Invalidate queries for documents
      queryClient.invalidateQueries({ queryKey: ['/api/startups', selectedStartupId, 'documents'] });
      
      // Show success toast
      toast({
        title: "Document uploaded successfully",
        description: "Your document has been uploaded and is being processed.",
      });
      
      // Navigate back to documents page
      navigate(`/documents?startupId=${selectedStartupId}`);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStartupId) {
      toast({
        title: "Startup required",
        description: "Please select a startup for this document",
        variant: "destructive",
      });
      return;
    }
    
    if (!documentType) {
      toast({
        title: "Document type required",
        description: "Please select a document type",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedFile) {
      toast({
        title: "File required",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('startupId', selectedStartupId);
    formData.append('type', documentType);
    
    if (documentName) {
      formData.append('name', documentName);
    }
    
    if (documentDescription) {
      formData.append('description', documentDescription);
    }
    
    // Upload document
    uploadMutation.mutate(formData);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // If no document name is provided, use file name
      if (!documentName) {
        setDocumentName(file.name);
      }
    }
  };
  
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            className="mr-3 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50"
            onClick={() => navigate(`/documents${selectedStartupId ? `?startupId=${selectedStartupId}` : ''}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Upload Document</h1>
            <p className="mt-1 text-sm text-slate-500">
              Add a new document to enhance your startup intelligence
            </p>
          </div>
        </div>
      </div>
      
      {/* Selected Startup Info (if any) */}
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit}>
            <CardHeader className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-center mb-1">
                <FilePlus className="h-5 w-5 text-blue-500 mr-2" />
                <CardTitle className="text-lg font-medium text-slate-800">Document Information</CardTitle>
              </div>
              <CardDescription className="text-slate-500">
                Provide details about the document you're uploading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {!selectedStartup && (
                <div className="space-y-2">
                  <Label htmlFor="startup" className="text-sm font-medium text-slate-700">Startup</Label>
                  <Select
                    value={selectedStartupId}
                    onValueChange={setSelectedStartupId}
                  >
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select a startup" />
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
              )}
              
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-medium text-slate-700">Document Type</Label>
                <Select
                  value={documentType}
                  onValueChange={setDocumentType}
                >
                  <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.length === 0 && (
                      <div className="p-2 text-slate-500">No categories</div>
                    )}
                    {categoryOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} title={opt.description || ''}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">Document Name</Label>
                <Input
                  id="name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="E.g., Q2 Financial Report"
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  placeholder="Brief description of the document contents"
                  rows={3}
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Upload File</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition-all ${
                    selectedFile 
                      ? "border-blue-200 bg-blue-50" 
                      : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  />
                  
                  {selectedFile ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        </div>
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-8 w-8 text-blue-600" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-slate-800">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                        onClick={handleFileSelect}
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="flex flex-col items-center space-y-4 cursor-pointer py-4"
                      onClick={handleFileSelect}
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Upload className="h-7 w-7 text-blue-600" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-slate-800">Drop your file here or click to browse</p>
                        <p className="text-sm text-slate-500 mt-1">
                          PDF, Word, Excel, PowerPoint, CSV or TXT files (max. 10MB)
                        </p>
                      </div>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="mt-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        Select File
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-3 pt-2 p-6 border-t border-slate-100 bg-slate-50">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => navigate(`/documents${selectedStartupId ? `?startupId=${selectedStartupId}` : ''}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!selectedStartupId || !documentType || !selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <span className="flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </span>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="px-5 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-blue-500 mr-2" />
              <CardTitle className="text-sm font-medium text-slate-700">Upload Guidelines</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 text-sm p-5">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Supported File Types</h3>
                <p className="text-slate-500 mt-1">PDF, Word, Excel, PowerPoint, CSV, TXT</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 shrink-0">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800">Maximum File Size</h3>
                <p className="text-slate-500 mt-1">10MB per document</p>
              </div>
            </div>
            
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <h3 className="font-medium text-slate-800 mb-3 flex items-center">
                <FileText className="h-4 w-4 text-blue-600 mr-2" />
                Document Types
              </h3>
              <ul className="space-y-2.5 text-slate-500">
                <li className="flex items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 mr-2 shrink-0"></div>
                  <div>
                    <span className="font-medium text-slate-700">Pitch Deck:</span>
                    <span className="ml-1">Presentation materials, investor decks</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-green-500 mr-2 shrink-0"></div>
                  <div>
                    <span className="font-medium text-slate-700">Financials:</span>
                    <span className="ml-1">Financial statements, projections, metrics</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 mr-2 shrink-0"></div>
                  <div>
                    <span className="font-medium text-slate-700">Legal:</span>
                    <span className="ml-1">Contracts, agreements, terms</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 mr-2 shrink-0"></div>
                  <div>
                    <span className="font-medium text-slate-700">Tech:</span>
                    <span className="ml-1">Technical documentation, specs, architecture</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-purple-500 mr-2 shrink-0"></div>
                  <div>
                    <span className="font-medium text-slate-700">Market:</span>
                    <span className="ml-1">Market analysis, research, competitive insights</span>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 shrink-0">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800">AI Processing</h3>
                <p className="text-slate-500 mt-1">Documents are automatically processed to extract information for the AI assistant to analyze.</p>
              </div>
            </div>

            {selectedStartup && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 mr-2 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-slate-800">Document Confidentiality</h3>
                    <p className="text-slate-600 mt-1 text-sm">
                      Documents uploaded for {selectedStartup.name} are confidential and only accessible to your team. 
                      Manage document permissions in settings.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          
          {selectedStartupId && (
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={() => navigate(`/startups/${selectedStartupId}`)}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                View Startup Details
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}