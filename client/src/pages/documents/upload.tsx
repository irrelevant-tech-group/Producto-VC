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
      <div className="mb-6">
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => navigate("/documents")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        <h1 className="text-2xl font-bold text-secondary-900">Upload Document</h1>
        <p className="mt-1 text-sm text-secondary-500">
          Add a new document to your startup data
        </p>
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
              
              <div className="space-y-2">
                <Label>File</Label>
                <div
                  className={`border-2 border-dashed rounded-md p-6 text-center ${
                    selectedFile ? "border-primary-300 bg-primary-50" : "border-secondary-200"
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
                    <div className="flex items-center justify-center space-x-2">
                      <File className="h-6 w-6 text-primary-500" />
                      <div className="text-sm">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-secondary-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleFileSelect}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="space-y-2 cursor-pointer"
                      onClick={handleFileSelect}
                    >
                      <Upload className="h-8 w-8 mx-auto text-secondary-400" />
                      <div className="text-sm">
                        <p className="font-medium">Click to upload a file</p>
                        <p className="text-secondary-500">
                          PDF, Word, Excel, PowerPoint, CSV or TXT files (max. 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/documents")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedStartupId || !documentType || !selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Upload Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium">Supported File Types</h3>
              <p className="text-secondary-500">PDF, Word, Excel, PowerPoint, CSV, TXT</p>
            </div>
            <div>
              <h3 className="font-medium">Maximum File Size</h3>
              <p className="text-secondary-500">10MB per document</p>
            </div>
            <div>
              <h3 className="font-medium">Document Types</h3>
              <ul className="list-disc ml-5 text-secondary-500 space-y-1">
                <li><span className="font-medium text-secondary-900">Pitch Deck</span>: Presentation materials, investor decks</li>
                <li><span className="font-medium text-secondary-900">Financials</span>: Financial statements, projections, metrics</li>
                <li><span className="font-medium text-secondary-900">Legal</span>: Contracts, agreements, terms</li>
                <li><span className="font-medium text-secondary-900">Tech</span>: Technical documentation, specs, architecture</li>
                <li><span className="font-medium text-secondary-900">Market</span>: Market analysis, research, competitive landscape</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Processing</h3>
              <p className="text-secondary-500">Documents will be processed automatically to extract information that can be used by the AI assistant.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}