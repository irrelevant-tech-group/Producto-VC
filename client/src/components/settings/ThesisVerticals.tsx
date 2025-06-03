import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Trash2, Target } from "lucide-react";

interface Vertical {
  vertical: string;
  weight: number;
  criteria?: string;
}

interface ThesisVerticalsProps {
  verticals: Vertical[];
  onUpdate: (verticals: Vertical[]) => void;
}

const verticalOptions = ["fintech", "saas", "ai", "marketplace", "ecommerce", "cleantech", "health"];

export const ThesisVerticals = ({ verticals, onUpdate }: ThesisVerticalsProps) => {
  const updateVerticalWeight = (index: number, weight: number) => {
    const newVerticals = [...verticals];
    newVerticals[index].weight = weight;
    onUpdate(newVerticals);
  };

  const updateVerticalType = (index: number, vertical: string) => {
    const newVerticals = [...verticals];
    newVerticals[index].vertical = vertical;
    onUpdate(newVerticals);
  };

  const removeVertical = (index: number) => {
    const newVerticals = verticals.filter((_, i) => i !== index);
    onUpdate(newVerticals);
  };

  const addVertical = () => {
    onUpdate([...verticals, { vertical: "fintech", weight: 0.1 }]);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-800 flex items-center">
        <Target className="h-4 w-4 mr-2 text-blue-500" />
        Preferred Verticals
      </h3>
      
      <div className="space-y-3">
        {verticals.map((vertical, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <Select
                value={vertical.vertical}
                onValueChange={(value) => updateVerticalType(index, value)}
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
              onClick={() => removeVertical(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <Button
          variant="outline"
          onClick={addVertical}
          className="w-full"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Vertical
        </Button>
      </div>
    </div>
  );
};