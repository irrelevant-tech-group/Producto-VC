import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from '@clerk/clerk-react';
import { 
  fetchActiveThesis, 
  fetchThesisHistory, 
  createThesis, 
  updateThesis, 
  activateThesis, 
  deleteThesis,
  previewThesisContext 
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Settings,
  User,
  Building2,
  Lightbulb,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// Import modular components
import { ThesisForm } from "@/components/settings/ThesisForm";
import { ActiveThesisCard } from "@/components/settings/ActiveThesisCard";
import { ThesisHistory } from "@/components/settings/ThesisHistory";
import { AccountSettings } from "@/components/settings/AccountSettings";

export default function SettingsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingThesis, setEditingThesis] = useState<any>(null);
  const [previewingThesis, setPreviewingThesis] = useState<any>(null);

  // Queries
  const { data: activeThesis, isLoading: isLoadingActive } = useQuery({
    queryKey: ['/api/investment-thesis/active'],
    queryFn: fetchActiveThesis,
    retry: false
  });

  const { data: thesisHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/investment-thesis/history'],
    queryFn: fetchThesisHistory
  });

  const { data: previewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['/api/investment-thesis/context-preview', previewingThesis?.id],
    queryFn: () => previewThesisContext(previewingThesis.id),
    enabled: !!previewingThesis
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createThesis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investment-thesis/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/investment-thesis/history'] });
      setIsCreateDialogOpen(false);
      toast.success("Investment thesis created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create thesis");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateThesis(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investment-thesis/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/investment-thesis/history'] });
      setEditingThesis(null);
      toast.success("Investment thesis updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update thesis");
    }
  });

  // Helper functions
  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toLocaleString()}` : 'N/A';
  };

  const formatWeight = (weight: number) => {
    return `${Math.round(weight * 100)}%`;
  };

  const handleCreateThesis = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateThesis = (data: any) => {
    if (editingThesis) {
      updateMutation.mutate({ id: editingThesis.id, data });
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Settings className="h-6 w-6 text-slate-600 mr-2" />
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your account settings and investment thesis
          </p>
        </div>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="thesis" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Investment Thesis
          </TabsTrigger>
        </TabsList>

        {/* Account Settings Tab */}
        <TabsContent value="account" className="space-y-6">
          <AccountSettings user={user} />
        </TabsContent>

        {/* Investment Thesis Tab */}
        <TabsContent value="thesis" className="space-y-6">
          {/* Active Thesis Card */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Investment Thesis Management</h2>
            {!isLoadingActive && !activeThesis && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Thesis
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Create Investment Thesis</DialogTitle>
                  </DialogHeader>
                  <ThesisForm
                    onSave={handleCreateThesis}
                    onCancel={() => setIsCreateDialogOpen(false)}
                    isLoading={createMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <ActiveThesisCard
            thesis={activeThesis}
            isLoading={isLoadingActive}
            onEdit={setEditingThesis}
            onPreview={setPreviewingThesis}
            formatCurrency={formatCurrency}
            formatWeight={formatWeight}
          />

          {/* Thesis History */}
          <ThesisHistory
            history={thesisHistory}
            isLoading={isLoadingHistory}
            onActivate={(id) => activateThesis(id)}
            onDelete={(id) => deleteThesis(id)}
            onPreview={setPreviewingThesis}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Thesis Dialog */}
      <Dialog open={!!editingThesis} onOpenChange={() => setEditingThesis(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Investment Thesis</DialogTitle>
          </DialogHeader>
          {editingThesis && (
            <ThesisForm
              thesis={editingThesis}
              onSave={handleUpdateThesis}
              onCancel={() => setEditingThesis(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewingThesis} onOpenChange={() => setPreviewingThesis(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Thesis Context Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : previewData ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-slate-800 mb-2">General Context</h3>
                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                    {previewData.generalContext}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-slate-800 mb-2">Alignment Context</h3>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                    {previewData.alignmentContext}
                  </div>
                </div>
                
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  <h4 className="font-medium text-indigo-800 mb-1">Thesis Information</h4>
                  <div className="text-sm text-indigo-700 space-y-1">
                    <p><strong>Name:</strong> {previewData.thesisInfo.name}</p>
                    <p><strong>Version:</strong> {previewData.thesisInfo.version}</p>
                    <p><strong>Status:</strong> {previewData.thesisInfo.isActive ? 'Active' : 'Inactive'}</p>
                    <p><strong>Last Updated:</strong> {new Date(previewData.thesisInfo.lastUpdated).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No preview data available
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewingThesis(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}