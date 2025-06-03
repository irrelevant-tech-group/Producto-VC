import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, Eye, CheckCircle, Trash2, Loader2 } from "lucide-react";

interface ThesisHistoryProps {
  history: any[];
  isLoading: boolean;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (thesis: any) => void;
}

export const ThesisHistory = ({ 
  history, 
  isLoading, 
  onActivate, 
  onDelete, 
  onPreview 
}: ThesisHistoryProps) => {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-600" />
          Thesis History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((thesis: any) => (
              <div key={thesis.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{thesis.name}</span>
                      <Badge variant="outline">v{thesis.version}</Badge>
                      {thesis.isActive && (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {thesis.isActive ? 'Currently active' : 'Inactive'} • 
                      Updated {new Date(thesis.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPreview(thesis)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {!thesis.isActive && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onActivate(thesis.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Investment Thesis</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{thesis.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(thesis.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};