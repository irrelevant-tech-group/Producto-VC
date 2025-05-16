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
import { useToast } from "@/hooks/use-toast";
import { Upload, ArrowLeft, File } from "lucide-react";

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
  
  // Fetch all startups
  const { data: startups, isLoading: isLoadingStartups } = useQuery({
    queryKey: ['/api/startups'],
    queryFn: fetchStartups
  });
  
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
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 animate-in">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            className="mr-3 hover:bg-secondary/80 transition-all"
            onClick={() => navigate("/documents")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="w-[1px] h-8 bg-border mr-4"></div>
          <div>
            <h1 className="text-3xl font-semibold bg-gradient-to-r from-primary/90 to-accent/90 text-transparent bg-clip-text">Upload Document</h1>
            <p className="mt-1 text-muted-foreground">
              Add a new document to enhance your startup intelligence
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
              <CardDescription>
                Provide details about the document you're uploading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="startup">Startup</Label>
                <Select
                  value={selectedStartupId}
                  onValueChange={setSelectedStartupId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a startup" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingStartups ? (
                      <div className="p-2">Loading startups...</div>
                    ) : startups && startups.length > 0 ? (
                      startups.map((startup: any) => (
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
              
              <div className="space-y-2">
                <Label htmlFor="type">Document Type</Label>
                <Select
                  value={documentType}
                  onValueChange={setDocumentType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pitch-deck">Pitch Deck</SelectItem>
                    <SelectItem value="financials">Financial Documents</SelectItem>
                    <SelectItem value="legal">Legal Documents</SelectItem>
                    <SelectItem value="tech">Technical Documents</SelectItem>
                    <SelectItem value="market">Market Analysis</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Document Name</Label>
                <Input
                  id="name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="E.g., Q2 Financial Report"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  placeholder="Brief description of the document contents"
                  rows={3}
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-base">Upload File</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
                    selectedFile 
                      ? "border-primary/30 bg-primary/5 shadow-sm" 
                      : "border-muted-foreground/20 hover:border-primary/30 hover:bg-secondary/50"
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
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                        </div>
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                          <File className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 shadow-sm hover:shadow-md transition-all"
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
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center shadow-sm">
                        <Upload className="h-7 w-7 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Drop your file here or click to browse</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          PDF, Word, Excel, PowerPoint, CSV or TXT files (max. 10MB)
                        </p>
                      </div>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="mt-2 border-primary/30 text-primary hover:bg-primary/5 shadow-sm"
                      >
                        Select File
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                className="px-5 shadow-sm hover:shadow transition-all"
                onClick={() => navigate("/documents")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-6 font-medium shadow-md hover:shadow-lg transition-all"
                disabled={!selectedStartupId || !documentType || !selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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
        
        <Card className="border border-primary/10 shadow-sm">
          <CardHeader className="pb-3 bg-gradient-to-r from-secondary to-muted rounded-t-lg">
            <CardTitle className="flex items-center">
              <div className="w-8 h-8 mr-2 bg-primary/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>
              </div>
              Upload Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm pt-5">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div>
                <h3 className="font-medium text-base">Supported File Types</h3>
                <p className="text-muted-foreground mt-1">PDF, Word, Excel, PowerPoint, CSV, TXT</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div>
                <h3 className="font-medium text-base">Maximum File Size</h3>
                <p className="text-muted-foreground mt-1">10MB per document</p>
              </div>
            </div>
            
            <div className="rounded-lg bg-secondary/50 p-4 border border-border">
              <h3 className="font-medium text-base mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Document Types
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span className="font-medium text-foreground">Pitch Deck:</span>
                  <span className="ml-1">Presentation materials, investor decks</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span className="font-medium text-foreground">Financials:</span>
                  <span className="ml-1">Financial statements, projections, metrics</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span className="font-medium text-foreground">Legal:</span>
                  <span className="ml-1">Contracts, agreements, terms</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span className="font-medium text-foreground">Tech:</span>
                  <span className="ml-1">Technical documentation, specs, architecture</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span className="font-medium text-foreground">Market:</span>
                  <span className="ml-1">Market analysis, research, competitive insights</span>
                </li>
              </ul>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </div>
              <div>
                <h3 className="font-medium text-base">AI Processing</h3>
                <p className="text-muted-foreground mt-1">Documents are automatically processed to extract information for the AI assistant to analyze.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}