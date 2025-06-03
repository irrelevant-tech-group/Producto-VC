import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit3, Eye, Loader2, Lightbulb } from "lucide-react";

interface ActiveThesisCardProps {
  thesis: any;
  isLoading: boolean;
  onEdit: (thesis: any) => void;
  onPreview: (thesis: any) => void;
  formatCurrency: (amount?: number) => string;
  formatWeight: (weight: number) => string;
}

export const ActiveThesisCard = ({ 
  thesis, 
  isLoading, 
  onEdit, 
  onPreview, 
  formatCurrency, 
  formatWeight 
}: ActiveThesisCardProps) => {
  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (!thesis) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">No Investment Thesis</h3>
          <p className="text-slate-500 mt-1 max-w-md mx-auto">
            Create your first investment thesis to guide AI analysis and startup evaluation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            Active Investment Thesis
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Thesis Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-800">{thesis.name}</h3>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
                <Badge variant="outline">v{thesis.version}</Badge>
              </div>
              <p className="text-sm text-slate-500">
                Last updated: {new Date(thesis.updatedAt).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreview(thesis)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(thesis)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-600 font-medium">Ticket Range</div>
              <div className="text-sm font-semibold text-blue-800">
                {formatCurrency(thesis.ticketSizeMin)} - {formatCurrency(thesis.ticketSizeMax)}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="text-xs text-purple-600 font-medium">Verticals</div>
              <div className="text-sm font-semibold text-purple-800">
                {thesis.preferredVerticals?.length || 0} focused
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-xs text-green-600 font-medium">Stages</div>
              <div className="text-sm font-semibold text-green-800">
                {thesis.preferredStages?.length || 0} stages
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <div className="text-xs text-orange-600 font-medium">Regions</div>
              <div className="text-sm font-semibold text-orange-800">
                {thesis.geographicFocus?.length || 0} regions
              </div>
            </div>
          </div>

          {/* Investment Philosophy */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-800">Investment Philosophy</h4>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              {thesis.investmentPhilosophy}
            </p>
          </div>

          {/* Preferred Verticals */}
          {thesis.preferredVerticals && thesis.preferredVerticals.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-slate-800">Preferred Verticals</h4>
              <div className="flex flex-wrap gap-2">
                {thesis.preferredVerticals.map((vertical: any, index: number) => (
                  <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {vertical.vertical.charAt(0).toUpperCase() + vertical.vertical.slice(1)} ({formatWeight(vertical.weight)})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Evaluation Criteria */}
          {thesis.evaluationCriteria && (
            <div className="space-y-3">
              <h4 className="font-medium text-slate-800">Evaluation Criteria Weights</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(thesis.evaluationCriteria).map(([criteria, config]: [string, any]) => (
                  <div key={criteria} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm text-slate-700 capitalize">
                      {criteria.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      {formatWeight(config.weight)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};