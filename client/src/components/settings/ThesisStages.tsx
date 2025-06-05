import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Trash2, TrendingUp } from "lucide-react";

interface Stage {
  stage: string;
  weight: number;
  ticketRange?: { min?: number; max?: number };
}

interface ThesisStagesProps {
  stages: Stage[];
  onUpdate: (stages: Stage[]) => void;
}

const stageOptions = ["pre-seed", "seed", "series-a"];

export const ThesisStages = ({ stages, onUpdate }: ThesisStagesProps) => {
  const updateStageWeight = (index: number, weight: number) => {
    const newStages = [...stages];
    newStages[index].weight = weight;
    onUpdate(newStages);
  };

  const updateStageType = (index: number, stage: string) => {
    const newStages = [...stages];
    newStages[index].stage = stage;
    onUpdate(newStages);
  };

  const updateTicketRange = (index: number, field: 'min' | 'max', value: number | undefined) => {
    const newStages = [...stages];
    newStages[index].ticketRange = {
      ...newStages[index].ticketRange,
      [field]: value
    };
    onUpdate(newStages);
  };

  const removeStage = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index);
    onUpdate(newStages);
  };

  const addStage = () => {
    onUpdate([...stages, { stage: "seed", weight: 0.1 }]);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-800 flex items-center">
        <TrendingUp className="h-4 w-4 mr-2 text-purple-500" />
        Preferred Stages
      </h3>
      
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <Select
                  value={stage.stage}
                  onValueChange={(value) => updateStageType(index, value)}
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
                  onChange={(e) => updateTicketRange(index, 'min', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label className="text-xs">Max Ticket ($)</Label>
                <Input
                  type="number"
                  value={stage.ticketRange?.max || ""}
                  onChange={(e) => updateTicketRange(index, 'max', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="200000"
                />
              </div>
            </div>
          </div>
        ))}
        
        <Button
          variant="outline"
          onClick={addStage}
          className="w-full"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Stage
        </Button>
      </div>
    </div>
  );
};