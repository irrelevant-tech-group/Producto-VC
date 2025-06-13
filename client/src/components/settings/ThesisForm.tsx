import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  PlusCircle,
  Save,
  Trash2,
  X,
  Loader2,
  DollarSign,
  Target,
  TrendingUp,
  MapPin,
  Users,
  AlertTriangle,
  Star,
  ChevronDown,
  Info,
  BarChart3,
  Building,
  Lightbulb,
  Eye,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// Complete interface matching backend requirements
interface InvestmentThesisComplete {
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
    ticketRange?: {
      min: number;
      max: number;
    };
  }>;
  
  geographicFocus: Array<{
    region: string;
    weight: number;
  }>;
  
  evaluationCriteria: {
    team: {
      weight: number;
      subcriteria?: {
        experience: { weight: number };
        complementarity: { weight: number };
        technicalExpertise: { weight: number };
      };
    };
    market: {
      weight: number;
      subcriteria?: {
        size: { weight: number };
        growth: { weight: number };
        timing: { weight: number };
      };
    };
    product: {
      weight: number;
      subcriteria?: {
        innovation: { weight: number };
        defensibility: { weight: number };
        scalability: { weight: number };
      };
    };
    traction: {
      weight: number;
      subcriteria?: {
        growthMetrics: { weight: number };
        customerValidation: { weight: number };
        revenueQuality: { weight: number };
      };
    };
    businessModel: {
      weight: number;
      subcriteria?: {
        unitEconomics: { weight: number };
        margins: { weight: number };
        repeatability: { weight: number };
      };
    };
    fundFit: {
      weight: number;
      subcriteria?: {
        stageAlignment: { weight: number };
        verticalAlignment: { weight: number };
        geographicFit: { weight: number };
      };
    };
  };
  
  ticketSizeMin?: number;
  ticketSizeMax?: number;
  targetOwnershipMin?: number;
  targetOwnershipMax?: number;
  
  expectedReturns?: {
    [stage: string]: {
      target: string;
      timeframe: string;
    };
  };
  
  decisionProcess?: string;
  riskAppetite?: string;
  
  verticalSpecificCriteria?: {
    [vertical: string]: {
      [criterium: string]: string;
    };
  };
  
  redFlags?: string[];
  mustHaves?: string[];
}

interface ThesisFormProps {
  thesis?: any;
  onSave: (data: InvestmentThesisComplete) => void;
  onCancel: () => void;
  isLoading: boolean;
}


const verticalOptions = ["fintech", "saas", "ai", "marketplace", "ecommerce", "cleantech", "health", "edtech", "proptech", "deeptech"];
const stageOptions = ["First Approach", "Due Diligence", "Post inversion"];
const regionOptions = ["North America", "Latin America", "Europe", "Asia Pacific", "Middle East", "Africa"];

const defaultFormData: InvestmentThesisComplete = {
  name: "",
  investmentPhilosophy: "",
  valueProposition: "",
  preferredVerticals: [],
  preferredStages: [],
  geographicFocus: [],
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
    { stage: "First Approach", weight: 0.4, ticketRange: { min: 50000, max: 200000 } },
    { stage: "Due Diligence", weight: 0.5, ticketRange: { min: 200000, max: 500000 } },
    { stage: "Post inversion", weight: 0.1, ticketRange: { min: 500000, max: 1000000 } }
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
  redFlags: [],
  mustHaves: []
};

export const ThesisForm = ({ thesis, onSave, onCancel, isLoading }: ThesisFormProps) => {
  const [formData, setFormData] = useState<InvestmentThesisComplete>(defaultFormData);
  const [activeTab, setActiveTab] = useState("basic");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [newRedFlag, setNewRedFlag] = useState("");
  const [newMustHave, setNewMustHave] = useState("");
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({});
  const [newVerticalCriteria, setNewVerticalCriteria] = useState<Record<string, { key: string; value: string }>>({});

  // Initialize form data from existing thesis
  useEffect(() => {
    if (thesis) {
      setFormData({
        name: thesis.name || "",
        investmentPhilosophy: thesis.investmentPhilosophy || "",
        valueProposition: thesis.valueProposition || "",
        preferredVerticals: thesis.preferredVerticals || [],
        preferredStages: thesis.preferredStages || [],
        geographicFocus: thesis.geographicFocus || [],
        evaluationCriteria: thesis.evaluationCriteria || defaultFormData.evaluationCriteria,
        ticketSizeMin: thesis.ticketSizeMin,
        ticketSizeMax: thesis.ticketSizeMax,
        targetOwnershipMin: thesis.targetOwnershipMin,
        targetOwnershipMax: thesis.targetOwnershipMax,
        expectedReturns: thesis.expectedReturns || {},
        decisionProcess: thesis.decisionProcess || "",
        riskAppetite: thesis.riskAppetite || "",
        verticalSpecificCriteria: thesis.verticalSpecificCriteria || {},
        redFlags: thesis.redFlags || [],
        mustHaves: thesis.mustHaves || []
      });
    }
  }, [thesis]);

  // Auto-save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('thesis-form-draft', JSON.stringify(formData));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData]);

  // Load draft on mount
  useEffect(() => {
    if (!thesis) {
      const draft = localStorage.getItem('thesis-form-draft');
      if (draft) {
        try {
          const parsedDraft = JSON.parse(draft);
          setFormData(parsedDraft);
          toast.info("Draft loaded from previous session");
        } catch (error) {
          console.error("Failed to load draft:", error);
        }
      }
    }
  }, [thesis]);

  // Validation functions
  const validateWeights = (weights: number[]): boolean => {
    const sum = weights.reduce((acc, weight) => acc + weight, 0);
    return Math.abs(sum - 1.0) < 0.01; // Allow small floating point differences
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Basic validation
    if (!formData.name.trim()) {
      errors.name = "Thesis name is required";
    }
    if (!formData.investmentPhilosophy.trim()) {
      errors.investmentPhilosophy = "Investment philosophy is required";
    }

    // Verticals validation
    if (formData.preferredVerticals.length > 0) {
      const verticalWeights = formData.preferredVerticals.map(v => v.weight);
      if (!validateWeights(verticalWeights)) {
        errors.verticals = "Vertical weights must sum to 100%";
      }
    }

    // Stages validation
    if (formData.preferredStages.length > 0) {
      const stageWeights = formData.preferredStages.map(s => s.weight);
      if (!validateWeights(stageWeights)) {
        errors.stages = "Stage weights must sum to 100%";
      }
      
      // Validate ticket ranges
      formData.preferredStages.forEach((stage, index) => {
        if (stage.ticketRange && stage.ticketRange.min && stage.ticketRange.max) {
          if (stage.ticketRange.min > stage.ticketRange.max) {
            errors[`stage_${index}`] = `${stage.stage}: Min ticket cannot be greater than max ticket`;
          }
        }
      });
    }

    // Geographic validation
    if (formData.geographicFocus.length > 0) {
      const geoWeights = formData.geographicFocus.map(g => g.weight);
      if (!validateWeights(geoWeights)) {
        errors.geography = "Geographic weights must sum to 100%";
      }
    }

    // Evaluation criteria validation
    const criteriaWeights = Object.values(formData.evaluationCriteria).map(c => c.weight);
    if (!validateWeights(criteriaWeights)) {
      errors.criteria = "Evaluation criteria weights must sum to 100%";
    }

    // Subcriteria validation
    Object.entries(formData.evaluationCriteria).forEach(([key, criteria]) => {
      if (criteria.subcriteria) {
        const subWeights = Object.values(criteria.subcriteria).map(sub => sub.weight);
        if (subWeights.length > 0 && !validateWeights(subWeights)) {
          errors[`subcriteria_${key}`] = `${key} subcriteria weights must sum to 100%`;
        }
      }
    });

    // Financial validation
    if (formData.ticketSizeMin && formData.ticketSizeMax && formData.ticketSizeMin > formData.ticketSizeMax) {
      errors.ticketSize = "Minimum ticket size cannot be greater than maximum";
    }
    if (formData.targetOwnershipMin && formData.targetOwnershipMax && formData.targetOwnershipMin > formData.targetOwnershipMax) {
      errors.ownership = "Minimum ownership cannot be greater than maximum";
    }
    if (formData.targetOwnershipMin && (formData.targetOwnershipMin < 0 || formData.targetOwnershipMin > 100)) {
      errors.ownershipRange = "Ownership percentages must be between 0 and 100";
    }
    if (formData.targetOwnershipMax && (formData.targetOwnershipMax < 0 || formData.targetOwnershipMax > 100)) {
      errors.ownershipRange = "Ownership percentages must be between 0 and 100";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Clear draft on successful save
      localStorage.removeItem('thesis-form-draft');
      onSave(formData);
    } else {
      toast.error("Please fix validation errors before saving");
    }
  };

  // Helper functions for managing arrays
  const addVertical = () => {
    const newVertical = { vertical: "fintech", weight: 0.1, criteria: "" };
    setFormData(prev => ({
      ...prev,
      preferredVerticals: [...prev.preferredVerticals, newVertical]
    }));
  };

  const updateVertical = (index: number, field: keyof typeof formData.preferredVerticals[0], value: any) => {
    const updated = [...formData.preferredVerticals];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, preferredVerticals: updated }));
  };

  const removeVertical = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preferredVerticals: prev.preferredVerticals.filter((_, i) => i !== index)
    }));
  };

  const addStage = () => {
    const newStage = { stage: "seed", weight: 0.1, ticketRange: { min: 100000, max: 500000 } };
    setFormData(prev => ({
      ...prev,
      preferredStages: [...prev.preferredStages, newStage]
    }));
  };

  const updateStage = (index: number, field: string, value: any) => {
    const updated = [...formData.preferredStages];
    if (field.startsWith('ticketRange.')) {
      const ticketField = field.split('.')[1];
      updated[index] = {
        ...updated[index],
        ticketRange: { ...updated[index].ticketRange, [ticketField]: value }
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormData(prev => ({ ...prev, preferredStages: updated }));
  };

  const removeStage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preferredStages: prev.preferredStages.filter((_, i) => i !== index)
    }));
  };

  const addGeography = () => {
    const newGeo = { region: "North America", weight: 0.1 };
    setFormData(prev => ({
      ...prev,
      geographicFocus: [...prev.geographicFocus, newGeo]
    }));
  };

  const updateGeography = (index: number, field: string, value: any) => {
    const updated = [...formData.geographicFocus];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, geographicFocus: updated }));
  };

  const removeGeography = (index: number) => {
    setFormData(prev => ({
      ...prev,
      geographicFocus: prev.geographicFocus.filter((_, i) => i !== index)
    }));
  };

  const updateCriteriaWeight = (criteria: string, weight: number) => {
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: {
        ...prev.evaluationCriteria,
        [criteria]: {
          ...prev.evaluationCriteria[criteria],
          weight: weight
        }
      }
    }));
  };

  const updateSubcriteriaWeight = (criteria: string, subcriteria: string, weight: number) => {
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: {
        ...prev.evaluationCriteria,
        [criteria]: {
          ...prev.evaluationCriteria[criteria],
          subcriteria: {
            ...prev.evaluationCriteria[criteria].subcriteria,
            [subcriteria]: { weight }
          }
        }
      }
    }));
  };

  const addExpectedReturn = (stage: string) => {
    setFormData(prev => ({
      ...prev,
      expectedReturns: {
        ...prev.expectedReturns,
        [stage]: { target: "", timeframe: "" }
      }
    }));
  };

  const updateExpectedReturn = (stage: string, field: 'target' | 'timeframe', value: string) => {
    setFormData(prev => ({
      ...prev,
      expectedReturns: {
        ...prev.expectedReturns,
        [stage]: {
          ...prev.expectedReturns?.[stage],
          [field]: value
        }
      }
    }));
  };

  const removeExpectedReturn = (stage: string) => {
    setFormData(prev => {
      const updated = { ...prev.expectedReturns };
      delete updated[stage];
      return { ...prev, expectedReturns: updated };
    });
  };

  const addVerticalSpecificCriteria = (vertical: string, key: string, value: string) => {
    if (!key.trim() || !value.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      verticalSpecificCriteria: {
        ...prev.verticalSpecificCriteria,
        [vertical]: {
          ...prev.verticalSpecificCriteria?.[vertical],
          [key]: value
        }
      }
    }));
  };

  const removeVerticalSpecificCriteria = (vertical: string, key: string) => {
    setFormData(prev => {
      const updated = { ...prev.verticalSpecificCriteria };
      if (updated[vertical]) {
        delete updated[vertical][key];
        if (Object.keys(updated[vertical]).length === 0) {
          delete updated[vertical];
        }
      }
      return { ...prev, verticalSpecificCriteria: updated };
    });
  };

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

  // Calculate progress for visual feedback
  const calculateProgress = () => {
    let completed = 0;
    let total = 8; // Total sections

    if (formData.name && formData.investmentPhilosophy) completed++;
    if (formData.preferredVerticals.length > 0) completed++;
    if (formData.preferredStages.length > 0) completed++;
    if (formData.geographicFocus.length > 0) completed++;
    if (Object.values(formData.evaluationCriteria).some(c => c.weight > 0)) completed++;
    if (formData.ticketSizeMin || formData.ticketSizeMax) completed++;
    if (formData.decisionProcess || formData.riskAppetite) completed++;
    if ((formData.redFlags?.length || 0) + (formData.mustHaves?.length || 0) > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();

  const formatWeight = (weight: number) => `${Math.round(weight * 100)}%`;

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Progress Indicator */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-800">Form Progress</span>
          <span className="text-sm text-blue-600">{progress}% Complete</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Validation Errors Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-800">Please fix the following errors:</span>
          </div>
          <ul className="text-sm text-red-600 space-y-1">
            {Object.entries(validationErrors).map(([field, error]) => (
              <li key={field}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs">Preferences</TabsTrigger>
          <TabsTrigger value="criteria" className="text-xs">Evaluation</TabsTrigger>
          <TabsTrigger value="process" className="text-xs">Process</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-500" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Thesis Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Investment Thesis 2025 v1"
                  className={validationErrors.name ? "border-red-500" : ""}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="philosophy">
                  Investment Philosophy <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="philosophy"
                  value={formData.investmentPhilosophy}
                  onChange={(e) => setFormData(prev => ({ ...prev, investmentPhilosophy: e.target.value }))}
                  placeholder="Describe your core investment philosophy and approach..."
                  rows={4}
                  className={validationErrors.investmentPhilosophy ? "border-red-500" : ""}
                />
                {validationErrors.investmentPhilosophy && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.investmentPhilosophy}</p>
                )}
              </div>

              <div>
                <Label htmlFor="valueProposition">Value Proposition</Label>
                <Textarea
                  id="valueProposition"
                  value={formData.valueProposition}
                  onChange={(e) => setFormData(prev => ({ ...prev, valueProposition: e.target.value }))}
                  placeholder="What unique value do you provide to startups beyond capital?"
                  rows={3}
                />
              </div>

              {/* Financial Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ticketMin">Minimum Ticket Size ($)</Label>
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
                  <Label htmlFor="ticketMax">Maximum Ticket Size ($)</Label>
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
              {validationErrors.ticketSize && (
                <p className="text-sm text-red-500">{validationErrors.ticketSize}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownershipMin">Target Ownership Min (%)</Label>
                  <Input
                    id="ownershipMin"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.targetOwnershipMin || ""}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      targetOwnershipMin: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="ownershipMax">Target Ownership Max (%)</Label>
                  <Input
                    id="ownershipMax"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.targetOwnershipMax || ""}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      targetOwnershipMax: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    placeholder="20"
                  />
                </div>
              </div>
              {(validationErrors.ownership || validationErrors.ownershipRange) && (
                <p className="text-sm text-red-500">{validationErrors.ownership || validationErrors.ownershipRange}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          {/* Preferred Verticals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Preferred Verticals
                <div className="ml-auto text-xs text-slate-500">
                  Total: {formatWeight(formData.preferredVerticals.reduce((sum, v) => sum + v.weight, 0))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationErrors.verticals && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{validationErrors.verticals}</p>
                </div>
              )}
              
              <div className="space-y-3">
                {formData.preferredVerticals.map((vertical, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Select
                          value={vertical.vertical}
                          onValueChange={(value) => updateVertical(index, 'vertical', value)}
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
                      
                      <div className="w-32">
                        <Label className="text-xs">Weight: {formatWeight(vertical.weight)}</Label>
                        <Slider
                          value={[vertical.weight]}
                          onValueChange={([value]) => updateVertical(index, 'weight', value)}
                          max={1}
                          min={0}
                          step={0.05}
                          className="mt-1"
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVertical(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Specific Criteria (Optional)</Label>
                      <Input
                        value={vertical.criteria || ""}
                        onChange={(e) => updateVertical(index, 'criteria', e.target.value)}
                        placeholder="e.g., Focus on B2B SaaS with $10K+ ACV"
                      />
                    </div>

                    {/* Vertical-specific criteria */}
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                          <span className="text-xs">Vertical-Specific Criteria</span>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {formData.verticalSpecificCriteria?.[vertical.vertical] && 
                          Object.entries(formData.verticalSpecificCriteria[vertical.vertical]).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 p-2 bg-white rounded border">
                              <span className="text-xs font-medium">{key}:</span>
                              <span className="text-xs flex-1">{value}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVerticalSpecificCriteria(vertical.vertical, key)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              </div>
                          ))
                        }
                        <div className="flex gap-2">
                          <Input
                            placeholder="Criteria name"
                            value={newVerticalCriteria[vertical.vertical]?.key || ""}
                            onChange={(e) => setNewVerticalCriteria(prev => ({
                              ...prev,
                              [vertical.vertical]: { ...prev[vertical.vertical], key: e.target.value }
                            }))}
                            className="text-xs"
                          />
                          <Input
                            placeholder="Criteria value"
                            value={newVerticalCriteria[vertical.vertical]?.value || ""}
                            onChange={(e) => setNewVerticalCriteria(prev => ({
                              ...prev,
                              [vertical.vertical]: { ...prev[vertical.vertical], value: e.target.value }
                            }))}
                            className="text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const criteria = newVerticalCriteria[vertical.vertical];
                              if (criteria?.key && criteria?.value) {
                                addVerticalSpecificCriteria(vertical.vertical, criteria.key, criteria.value);
                                setNewVerticalCriteria(prev => ({ ...prev, [vertical.vertical]: { key: "", value: "" } }));
                              }
                            }}
                          >
                            <PlusCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
                
                <Button variant="outline" onClick={addVertical} className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Vertical
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preferred Stages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Preferred Stages
                <div className="ml-auto text-xs text-slate-500">
                  Total: {formatWeight(formData.preferredStages.reduce((sum, s) => sum + s.weight, 0))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationErrors.stages && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{validationErrors.stages}</p>
                </div>
              )}
              
              <div className="space-y-3">
                {formData.preferredStages.map((stage, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-3">
                    {validationErrors[`stage_${index}`] && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                        {validationErrors[`stage_${index}`]}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Select
                          value={stage.stage}
                          onValueChange={(value) => updateStage(index, 'stage', value)}
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
                      
                      <div className="w-32">
                        <Label className="text-xs">Weight: {formatWeight(stage.weight)}</Label>
                        <Slider
                          value={[stage.weight]}
                          onValueChange={([value]) => updateStage(index, 'weight', value)}
                          max={1}
                          min={0}
                          step={0.05}
                          className="mt-1"
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStage(index)}
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
                          onChange={(e) => updateStage(index, 'ticketRange.min', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="50000"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Max Ticket ($)</Label>
                        <Input
                          type="number"
                          value={stage.ticketRange?.max || ""}
                          onChange={(e) => updateStage(index, 'ticketRange.max', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="200000"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" onClick={addStage} className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Stage
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Geographic Focus */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Geographic Focus
                <div className="ml-auto text-xs text-slate-500">
                  Total: {formatWeight(formData.geographicFocus.reduce((sum, g) => sum + g.weight, 0))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationErrors.geography && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{validationErrors.geography}</p>
                </div>
              )}
              
              <div className="space-y-3">
                {formData.geographicFocus.map((geo, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <Select
                        value={geo.region}
                        onValueChange={(value) => updateGeography(index, 'region', value)}
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
                    
                    <div className="w-32">
                      <Label className="text-xs">Weight: {formatWeight(geo.weight)}</Label>
                      <Slider
                        value={[geo.weight]}
                        onValueChange={([value]) => updateGeography(index, 'weight', value)}
                        max={1}
                        min={0}
                        step={0.05}
                        className="mt-1"
                      />
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGeography(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button variant="outline" onClick={addGeography} className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Region
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluation Criteria Tab */}
        <TabsContent value="criteria" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Evaluation Criteria
                <div className="ml-auto text-xs text-slate-500">
                  Total: {formatWeight(Object.values(formData.evaluationCriteria).reduce((sum, c) => sum + c.weight, 0))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationErrors.criteria && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{validationErrors.criteria}</p>
                </div>
              )}

              <div className="space-y-4">
                {Object.entries(formData.evaluationCriteria).map(([criteria, config]) => {
                  const criteriaName = criteria.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  const hasSubcriteria = config.subcriteria && Object.keys(config.subcriteria).length > 0;
                  
                  return (
                    <div key={criteria} className="p-4 bg-slate-50 rounded-lg">
                      {validationErrors[`subcriteria_${criteria}`] && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                          {validationErrors[`subcriteria_${criteria}`]}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1">
                          <Label className="font-medium">{criteriaName}</Label>
                          <div className="text-xs text-slate-500">Weight: {formatWeight(config.weight)}</div>
                        </div>
                        <div className="w-48">
                          <Slider
                            value={[config.weight]}
                            onValueChange={([value]) => updateCriteriaWeight(criteria, value)}
                            max={1}
                            min={0}
                            step={0.05}
                          />
                        </div>
                      </div>

                      <Collapsible 
                        open={expandedCriteria[criteria]} 
                        onOpenChange={(open) => setExpandedCriteria(prev => ({ ...prev, [criteria]: open }))}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span className="text-xs">
                              {hasSubcriteria ? `Edit Subcriteria (${Object.keys(config.subcriteria!).length})` : 'Add Subcriteria'}
                            </span>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-2">
                          {criteria === 'team' && (
                            <div className="space-y-2">
                              {['experience', 'complementarity', 'technicalExpertise'].map(sub => (
                                <div key={sub} className="flex items-center gap-3 p-2 bg-white rounded">
                                  <span className="text-xs flex-1 capitalize">{sub.replace(/([A-Z])/g, ' $1')}</span>
                                  <div className="w-32">
                                    <Slider
                                      value={[config.subcriteria?.[sub]?.weight || 0.33]}
                                      onValueChange={([value]) => updateSubcriteriaWeight(criteria, sub, value)}
                                      max={1}
                                      min={0}
                                      step={0.05}
                                    />
                                  </div>
                                  <span className="text-xs w-12">{formatWeight(config.subcriteria?.[sub]?.weight || 0.33)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {criteria === 'market' && (
                            <div className="space-y-2">
                              {['size', 'growth', 'timing'].map(sub => (
                                <div key={sub} className="flex items-center gap-3 p-2 bg-white rounded">
                                  <span className="text-xs flex-1 capitalize">{sub}</span>
                                  <div className="w-32">
                                    <Slider
                                      value={[config.subcriteria?.[sub]?.weight || 0.33]}
                                      onValueChange={([value]) => updateSubcriteriaWeight(criteria, sub, value)}
                                      max={1}
                                      min={0}
                                      step={0.05}
                                    />
                                  </div>
                                  <span className="text-xs w-12">{formatWeight(config.subcriteria?.[sub]?.weight || 0.33)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {criteria === 'product' && (
                            <div className="space-y-2">
                              {['innovation', 'defensibility', 'scalability'].map(sub => (
                                <div key={sub} className="flex items-center gap-3 p-2 bg-white rounded">
                                  <span className="text-xs flex-1 capitalize">{sub}</span>
                                  <div className="w-32">
                                    <Slider
                                      value={[config.subcriteria?.[sub]?.weight || 0.33]}
                                      onValueChange={([value]) => updateSubcriteriaWeight(criteria, sub, value)}
                                      max={1}
                                      min={0}
                                      step={0.05}
                                    />
                                  </div>
                                  <span className="text-xs w-12">{formatWeight(config.subcriteria?.[sub]?.weight || 0.33)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {criteria === 'traction' && (
                            <div className="space-y-2">
                              {['growthMetrics', 'customerValidation', 'revenueQuality'].map(sub => (
                                <div key={sub} className="flex items-center gap-3 p-2 bg-white rounded">
                                  <span className="text-xs flex-1 capitalize">{sub.replace(/([A-Z])/g, ' $1')}</span>
                                  <div className="w-32">
                                    <Slider
                                      value={[config.subcriteria?.[sub]?.weight || 0.33]}
                                      onValueChange={([value]) => updateSubcriteriaWeight(criteria, sub, value)}
                                      max={1}
                                      min={0}
                                      step={0.05}
                                    />
                                  </div>
                                  <span className="text-xs w-12">{formatWeight(config.subcriteria?.[sub]?.weight || 0.33)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {criteria === 'businessModel' && (
                            <div className="space-y-2">
                              {['unitEconomics', 'margins', 'repeatability'].map(sub => (
                                <div key={sub} className="flex items-center gap-3 p-2 bg-white rounded">
                                  <span className="text-xs flex-1 capitalize">{sub.replace(/([A-Z])/g, ' $1')}</span>
                                  <div className="w-32">
                                    <Slider
                                      value={[config.subcriteria?.[sub]?.weight || 0.33]}
                                      onValueChange={([value]) => updateSubcriteriaWeight(criteria, sub, value)}
                                      max={1}
                                      min={0}
                                      step={0.05}
                                    />
                                  </div>
                                  <span className="text-xs w-12">{formatWeight(config.subcriteria?.[sub]?.weight || 0.33)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {criteria === 'fundFit' && (
                            <div className="space-y-2">
                              {['stageAlignment', 'verticalAlignment', 'geographicFit'].map(sub => (
                                <div key={sub} className="flex items-center gap-3 p-2 bg-white rounded">
                                  <span className="text-xs flex-1 capitalize">{sub.replace(/([A-Z])/g, ' $1')}</span>
                                  <div className="w-32">
                                    <Slider
                                      value={[config.subcriteria?.[sub]?.weight || 0.33]}
                                      onValueChange={([value]) => updateSubcriteriaWeight(criteria, sub, value)}
                                      max={1}
                                      min={0}
                                      step={0.05}
                                    />
                                  </div>
                                  <span className="text-xs w-12">{formatWeight(config.subcriteria?.[sub]?.weight || 0.33)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Expected Returns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Expected Returns by Stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stageOptions.map(stage => (
                  <div key={stage} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="capitalize font-medium">{stage}</Label>
                      {!formData.expectedReturns?.[stage] ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addExpectedReturn(stage)}
                        >
                          <PlusCircle className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExpectedReturn(stage)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    {formData.expectedReturns?.[stage] && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Target Multiple</Label>
                          <Input
                            placeholder="e.g., 10x"
                            value={formData.expectedReturns[stage].target}
                            onChange={(e) => updateExpectedReturn(stage, 'target', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Timeframe</Label>
                          <Input
                            placeholder="e.g., 5-7 years"
                            value={formData.expectedReturns[stage].timeframe}
                            onChange={(e) => updateExpectedReturn(stage, 'timeframe', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Process Tab */}
        <TabsContent value="process" className="space-y-6">
          {/* Decision Process */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-500" />
                Decision Process & Risk Appetite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="decisionProcess">Decision Process</Label>
                <Textarea
                  id="decisionProcess"
                  value={formData.decisionProcess || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, decisionProcess: e.target.value }))}
                  placeholder="Describe your investment decision-making process..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="riskAppetite">Risk Appetite</Label>
                <Textarea
                  id="riskAppetite"
                  value={formData.riskAppetite || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, riskAppetite: e.target.value }))}
                  placeholder="Describe your risk tolerance and appetite..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Red Flags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Red Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.redFlags?.map((flag, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
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
                
                <div className="flex gap-2">
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
            </CardContent>
          </Card>

          {/* Must Haves */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Must Haves
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.mustHaves?.map((mustHave, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
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
                
                <div className="flex gap-2">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Eye className="h-5 w-5" />
            Thesis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-blue-800">Verticals</div>
              <div className="text-blue-600">{formData.preferredVerticals.length} configured</div>
            </div>
            <div>
              <div className="font-medium text-blue-800">Stages</div>
              <div className="text-blue-600">{formData.preferredStages.length} configured</div>
            </div>
            <div>
              <div className="font-medium text-blue-800">Regions</div>
              <div className="text-blue-600">{formData.geographicFocus.length} configured</div>
            </div>
            <div>
              <div className="font-medium text-blue-800">Ticket Range</div>
              <div className="text-blue-600">
                ${formData.ticketSizeMin?.toLocaleString() || 'N/A'} - ${formData.ticketSizeMax?.toLocaleString() || 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || Object.keys(validationErrors).length > 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
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