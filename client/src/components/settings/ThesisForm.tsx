import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";

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

interface ThesisFormProps {
  thesis?: any;
  onSave: (data: ThesisFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
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

export const ThesisForm = ({ thesis, onSave, onCancel, isLoading }: ThesisFormProps) => {
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

  // Helper functions
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

  // Continue with other helper functions and JSX...
  // (resto del componente ThesisForm del código original)

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

      {/* Resto de secciones del formulario... */}

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