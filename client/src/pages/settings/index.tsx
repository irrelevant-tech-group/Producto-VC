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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  User,
  Building2,
  Lightbulb,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  Save,
  X,
  Loader2,
  Target,
  TrendingUp,
  DollarSign,
  MapPin,
  Users,
  AlertTriangle,
  Star,
  History,
} from "lucide-react";
import { toast } from "sonner";

interface ThesisFormData {
  name: string;
  investmentPhilosophy: string;
  valueProposition: string;
  preferredVerticals: Array<{
    vertical: string;
    weight: number;
    criteria?: string;
  }>;
  preferredStages: Array<{
    stage: string;
    weight: number;
    ticketRange?: { min?: number; max?: number };
  }>;
  geographicFocus: Array<{
    region: string;
    weight: number;
  }>;
  evaluationCriteria: {
    team: { weight: number; subcriteria?: Record<string, any> };
    market: { weight: number; subcriteria?: Record<string, any> };
    product: { weight: number; subcriteria?: Record<string, any> };
    traction: { weight: number; subcriteria?: Record<string, any> };
    businessModel: { weight: number; subcriteria?: Record<string, any> };
    fundFit: { weight: number; subcriteria?: Record<string, any> };
  };
  ticketSizeMin?: number;
  ticketSizeMax?: number;
  redFlags?: string[];
  mustHaves?: string[];
  decisionProcess?: string;
  riskAppetite?: string;
}

const defaultThesisData: ThesisFormData = {
  name: "Investment Thesis v1",
  investmentPhilosophy: "We invest in early-stage technology companies with strong founding teams, large addressable markets, and innovative solutions to real problems.",
  valueProposition: "We provide not just capital, but strategic guidance and network access to help startups scale efficiently.",
  preferredVerticals: [
    { vertical: "fintech", weight: 0.3 },
    { vertical: "saas", weight: 0.25 },
    { vertical: "ai", weight: 0.25 },
    { vertical: "marketplace", weight: 0.2 }
  ],
  preferredStages: [
    { stage: "pre-seed", weight: 0.4, ticketRange: { min: 50000, max: 200000 } },
    { stage: "seed", weight: 0.5, ticketRange: { min: 200000, max: 500000 } },
    { stage: "series-a", weight: 0.1, ticketRange: { min: 500000, max: 1000000 } }
  ],
  geographicFocus: [
    { region: "North America", weight: 0.4 },
    { region: "Latin America", weight: 0.4 },
    { region: "Europe", weight: 0.2 }
  ],
  evaluationCriteria: {
    team: { weight: 0.25 },
    market: { weight: 0.2 },
    product: { weight: 0.2 },
    traction: { weight: 0.15 },
    businessModel: { weight: 0.15 },
    fundFit: { weight: 0.05 }
  },
  ticketSizeMin: 100000,
  ticketSizeMax: 1000000,
  redFlags: ["Incomplete founding team", "Small addressable market", "No clear competitive advantage"],
  mustHaves: ["Technical co-founder", "Some market validation", "Clear revenue model"],
  decisionProcess: "We evaluate opportunities through a structured process including initial screening, due diligence, and investment committee review.",
  riskAppetite: "Moderate to high risk tolerance with focus on scalable business models and experienced teams."
};

const verticalOptions = ["fintech", "saas", "ai", "marketplace", "ecommerce", "cleantech", "health"];
const stageOptions = ["pre-seed", "seed", "series-a"];
const regionOptions = ["North America", "Latin America", "Europe", "Asia Pacific", "Middle East", "Africa"];

const ThesisForm = ({ 
  thesis, 
  onSave, 
  onCancel, 
  isLoading 
}: { 
  thesis?: any; 
  onSave: (data: ThesisFormData) => void; 
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState<ThesisFormData>(
    thesis ? {
      name: thesis.name,
      investmentPhilosophy: thesis.investmentPhilosophy,
      valueProposition: thesis.valueProposition,
      preferredVerticals: thesis.preferredVerticals,
      preferredStages: thesis.preferredStages,
      geographicFocus: thesis.geographicFocus,
      evaluationCriteria: thesis.evaluationCriteria,
      ticketSizeMin: thesis.ticketSizeMin,
      ticketSizeMax: thesis.ticketSizeMax,
      redFlags: thesis.redFlags || [],
      mustHaves: thesis.mustHaves || [],
      decisionProcess: thesis.decisionProcess,
      riskAppetite: thesis.riskAppetite,
    } : defaultThesisData
  );

  const [newRedFlag, setNewRedFlag] = useState("");
  const [newMustHave, setNewMustHave] = useState("");

  const addRedFlag = () => {
    if (newRedFlag.trim()) {
      setFormData(prev => ({
        ...prev,
        redFlags: [...(prev.redFlags || []), newRedFlag.trim()]
      }));
      setNewRedFlag("");
    }
  };

  const removeRedFlag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redFlags: prev.redFlags?.filter((_, i) => i !== index) || []
    }));
  };

  const addMustHave = () => {
    if (newMustHave.trim()) {
      setFormData(prev => ({
        ...prev,
        mustHaves: [...(prev.mustHaves || []), newMustHave.trim()]
      }));
      setNewMustHave("");
    }
  };

  const removeMustHave = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mustHaves: prev.mustHaves?.filter((_, i) => i !== index) || []
    }));
  };

  const updateVerticalWeight = (index: number, weight: number) => {
    const newVerticals = [...formData.preferredVerticals];
    newVerticals[index].weight = weight;
    setFormData(prev => ({ ...prev, preferredVerticals: newVerticals }));
  };

  const updateStageWeight = (index: number, weight: number) => {
    const newStages = [...formData.preferredStages];
    newStages[index].weight = weight;
    setFormData(prev => ({ ...prev, preferredStages: newStages }));
  };

  const updateGeographicWeight = (index: number, weight: number) => {
    const newRegions = [...formData.geographicFocus];
    newRegions[index].weight = weight;
    setFormData(prev => ({ ...prev, geographicFocus: newRegions }));
  };

  const updateEvaluationWeight = (criteria: string, weight: number) => {
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: {
        ...prev.evaluationCriteria,
        [criteria]: { ...prev.evaluationCriteria[criteria], weight }
      }
    }));
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Thesis Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Investment Thesis v1"
          />
        </div>

        <div>
          <Label htmlFor="philosophy">Investment Philosophy</Label>
          <Textarea
            id="philosophy"
            value={formData.investmentPhilosophy}
            onChange={(e) => setFormData(prev => ({ ...prev, investmentPhilosophy: e.target.value }))}
            placeholder="Describe your investment philosophy..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="valueProposition">Value Proposition</Label>
          <Textarea
            id="valueProposition"
            value={formData.valueProposition}
            onChange={(e) => setFormData(prev => ({ ...prev, valueProposition: e.target.value }))}
            placeholder="What unique value do you provide to startups?"
            rows={3}
          />
        </div>
      </div>

      {/* Financial Criteria */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-800 flex items-center">
          <DollarSign className="h-4 w-4 mr-2 text-green-500" />
          Investment Size
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ticketMin">Minimum Ticket ($)</Label>
            <Input
              id="ticketMin"
              type="number"
              value={formData.ticketSizeMin || ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                ticketSizeMin: e.target.value ? Number(e.target.value) : undefined 
              }))}
              placeholder="100000"
            />
          </div>
          <div>
            <Label htmlFor="ticketMax">Maximum Ticket ($)</Label>
            <Input
              id="ticketMax"
              type="number"
              value={formData.ticketSizeMax || ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                ticketSizeMax: e.target.value ? Number(e.target.value) : undefined 
              }))}
              placeholder="1000000"
            />
          </div>
        </div>
      </div>

      {/* Preferred Verticals */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-800 flex items-center">
          <Target className="h-4 w-4 mr-2 text-blue-500" />
          Preferred Verticals
        </h3>
        
        <div className="space-y-3">
          {formData.preferredVerticals.map((vertical, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <Select
                  value={vertical.vertical}
                  onValueChange={(value) => {
                    const newVerticals = [...formData.preferredVerticals];
                    newVerticals[index].vertical = value;
                    setFormData(prev => ({ ...prev, preferredVerticals: newVerticals }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {verticalOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-20">
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={vertical.weight}
                  onChange={(e) => updateVerticalWeight(index, Number(e.target.value))}
                  placeholder="0.25"
                />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newVerticals = formData.preferredVerticals.filter((_, i) => i !== index);
                  setFormData(prev => ({ ...prev, preferredVerticals: newVerticals }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                preferredVerticals: [...prev.preferredVerticals, { vertical: "fintech", weight: 0.1 }]
              }));
            }}
            className="w-full"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Vertical
          </Button>
        </div>
      </div>

      {/* Preferred Stages */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-800 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2 text-purple-500" />
          Preferred Stages
        </h3>
        
        <div className="space-y-3">
          {formData.preferredStages.map((stage, index) => (
            <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <Select
                    value={stage.stage}
                    onValueChange={(value) => {
                      const newStages = [...formData.preferredStages];
                      newStages[index].stage = value;
                      setFormData(prev => ({ ...prev, preferredStages: newStages }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stageOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-20">
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={stage.weight}
                    onChange={(e) => updateStageWeight(index, Number(e.target.value))}
                    placeholder="0.4"
                  />
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newStages = formData.preferredStages.filter((_, i) => i !== index);
                    setFormData(prev => ({ ...prev, preferredStages: newStages }));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Min Ticket ($)</Label>
                  <Input
                    type="number"
                    value={stage.ticketRange?.min || ""}
                    onChange={(e) => {
                      const newStages = [...formData.preferredStages];
                      newStages[index].ticketRange = {
                        ...newStages[index].ticketRange,
                        min: e.target.value ? Number(e.target.value) : undefined
                      };
                      setFormData(prev => ({ ...prev, preferredStages: newStages }));
                    }}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max Ticket ($)</Label>
                  <Input
                    type="number"
                    value={stage.ticketRange?.max || ""}
                    onChange={(e) => {
                      const newStages = [...formData.preferredStages];
                      newStages[index].ticketRange = {
                        ...newStages[index].ticketRange,
                        max: e.target.value ? Number(e.target.value) : undefined
                      };
                      setFormData(prev => ({ ...prev, preferredStages: newStages }));
                    }}
                    placeholder="200000"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                preferredStages: [...prev.preferredStages, { stage: "seed", weight: 0.1 }]
              }));
            }}
            className="w-full"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Stage
          </Button>
        </div>
      </div>

      {/* Geographic Focus */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-800 flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-orange-500" />
          Geographic Focus
        </h3>
        
        <div className="space-y-3">
          {formData.geographicFocus.map((region, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <Select
                  value={region.region}
                  onValueChange={(value) => {
                    const newRegions = [...formData.geographicFocus];
                    newRegions[index].region = value;
                    setFormData(prev => ({ ...prev, geographicFocus: newRegions }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-20">
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={region.weight}
                  onChange={(e) => updateGeographicWeight(index, Number(e.target.value))}
                  placeholder="0.4"
                />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newRegions = formData.geographicFocus.filter((_, i) => i !== index);
                  setFormData(prev => ({ ...prev, geographicFocus: newRegions }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                geographicFocus: [...prev.geographicFocus, { region: "North America", weight: 0.1 }]
              }));
            }}
            className="w-full"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Region
          </Button>
        </div>
      </div>

      {/* Evaluation Criteria */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-800 flex items-center">
          <Users className="h-4 w-4 mr-2 text-indigo-500" />
          Evaluation Criteria Weights
        </h3>
        
        <div className="space-y-3">
          {Object.entries(formData.evaluationCriteria).map(([criteria, config]) => (
            <div key={criteria} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <Label className="text-sm font-medium">
                  {criteria.charAt(0).toUpperCase() + criteria.slice(1).replace(/([A-Z])/g, ' $1')}
                </Label>
              </div>
              
              <div className="w-20">
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.weight}
                  onChange={(e) => updateEvaluationWeight(criteria, Number(e.target.value))}
                  placeholder="0.25"
                />
              </div>
              
              <div className="w-16 text-xs text-slate-500">
                {Math.round(config.weight * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Red Flags */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-800 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
          Red Flags
        </h3>
        
        <div className="space-y-2">
          {formData.redFlags?.map((flag, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 rounded border border-red-200">
              <span className="flex-1 text-sm">{flag}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRedFlag(index)}
                className="text-red-600 hover:text-red-700 hover:bg-red-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <div className="flex space-x-2">
            <Input
              value={newRedFlag}
              onChange={(e) => setNewRedFlag(e.target.value)}
              placeholder="Add a red flag..."
              onKeyPress={(e) => e.key === 'Enter' && addRedFlag()}
            />
            <Button onClick={addRedFlag} variant="outline" size="sm">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Must Haves */}
      <div className="space-y-4">
        <h3 className="font-medium text-slate-800 flex items-center">
          <Star className="h-4 w-4 mr-2 text-yellow-500" />
          Must Haves
        </h3>
        
        <div className="space-y-2">
          {formData.mustHaves?.map((mustHave, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 rounded border border-green-200">
              <span className="flex-1 text-sm">{mustHave}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMustHave(index)}
                className="text-green-600 hover:text-green-700 hover:bg-green-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <div className="flex space-x-2">
            <Input
              value={newMustHave}
              onChange={(e) => setNewMustHave(e.target.value)}
              placeholder="Add a must have..."
              onKeyPress={(e) => e.key === 'Enter' && addMustHave()}
            />
            <Button onClick={addMustHave} variant="outline" size="sm">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="decisionProcess">Decision Process</Label>
          <Textarea
            id="decisionProcess"
            value={formData.decisionProcess}
            onChange={(e) => setFormData(prev => ({ ...prev, decisionProcess: e.target.value }))}
            placeholder="Describe your investment decision process..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="riskAppetite">Risk Appetite</Label>
          <Textarea
            id="riskAppetite"
            value={formData.riskAppetite}
            onChange={(e) => setFormData(prev => ({ ...prev, riskAppetite: e.target.value }))}
            placeholder="Describe your risk tolerance and appetite..."
            rows={3}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Thesis
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

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
 
  const activateMutation = useMutation({
    mutationFn: activateThesis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investment-thesis/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/investment-thesis/history'] });
      toast.success("Investment thesis activated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to activate thesis");
    }
  });
 
  const deleteMutation = useMutation({
    mutationFn: deleteThesis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investment-thesis/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/investment-thesis/history'] });
      toast.success("Investment thesis deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete thesis");
    }
  });
 
  const handleCreateThesis = (data: ThesisFormData) => {
    createMutation.mutate(data);
  };
 
  const handleUpdateThesis = (data: ThesisFormData) => {
    if (editingThesis) {
      updateMutation.mutate({ id: editingThesis.id, data });
    }
  };
 
  const handleActivateThesis = (id: string) => {
    activateMutation.mutate(id);
  };
 
  const handleDeleteThesis = (id: string) => {
    deleteMutation.mutate(id);
  };
 
  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toLocaleString()}` : 'N/A';
  };
 
  const formatWeight = (weight: number) => {
    return `${Math.round(weight * 100)}%`;
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
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-slate-600" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={user?.fullName || ""} disabled className="bg-slate-50" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user?.primaryEmailAddress?.emailAddress || ""} disabled className="bg-slate-50" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Account information is managed through your organization's authentication system.
                  Contact your administrator to make changes.
                </p>
              </div>
            </CardContent>
          </Card>
 
          {/* Additional account settings can be added here */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-600" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">Current Organization</p>
                  <p className="text-sm text-slate-500">Manage organization settings and members</p>
                </div>
                <Button variant="outline" disabled>
                  Manage Organization
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
 
        {/* Investment Thesis Tab */}
        <TabsContent value="thesis" className="space-y-6">
          {/* Active Thesis Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Active Investment Thesis
                </CardTitle>
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
            </CardHeader>
            <CardContent>
              {isLoadingActive ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : activeThesis ? (
                <div className="space-y-6">
                  {/* Thesis Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-800">{activeThesis.name}</h3>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                        <Badge variant="outline">v{activeThesis.version}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        Last updated: {new Date(activeThesis.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewingThesis(activeThesis)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingThesis(activeThesis)}
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
                        {formatCurrency(activeThesis.ticketSizeMin)} - {formatCurrency(activeThesis.ticketSizeMax)}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <div className="text-xs text-purple-600 font-medium">Verticals</div>
                      <div className="text-sm font-semibold text-purple-800">
                        {activeThesis.preferredVerticals?.length || 0} focused
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="text-xs text-green-600 font-medium">Stages</div>
                      <div className="text-sm font-semibold text-green-800">
                        {activeThesis.preferredStages?.length || 0} stages
                      </div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <div className="text-xs text-orange-600 font-medium">Regions</div>
                      <div className="text-sm font-semibold text-orange-800">
                        {activeThesis.geographicFocus?.length || 0} regions
                      </div>
                    </div>
                  </div>
 
                  {/* Investment Philosophy */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-800">Investment Philosophy</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      {activeThesis.investmentPhilosophy}
                    </p>
                  </div>
 
                  {/* Preferred Verticals */}
                  {activeThesis.preferredVerticals && activeThesis.preferredVerticals.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-800">Preferred Verticals</h4>
                      <div className="flex flex-wrap gap-2">
                        {activeThesis.preferredVerticals.map((vertical: any, index: number) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {vertical.vertical.charAt(0).toUpperCase() + vertical.vertical.slice(1)} ({formatWeight(vertical.weight)})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
 
                  {/* Evaluation Criteria */}
                  {activeThesis.evaluationCriteria && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-800">Evaluation Criteria Weights</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(activeThesis.evaluationCriteria).map(([criteria, config]: [string, any]) => (
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
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800">No Investment Thesis</h3>
                  <p className="text-slate-500 mt-1 max-w-md mx-auto">
                    Create your first investment thesis to guide AI analysis and startup evaluation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
 
          {/* Thesis History */}
          {thesisHistory && thesisHistory.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-600" />
                  Thesis History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {thesisHistory.map((thesis: any) => (
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
                            onClick={() => setPreviewingThesis(thesis)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {!thesis.isActive && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActivateThesis(thesis.id)}
                                disabled={activateMutation.isPending}
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
                                      onClick={() => handleDeleteThesis(thesis.id)}
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
          )}
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