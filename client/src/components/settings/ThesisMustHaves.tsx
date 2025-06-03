import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, PlusCircle, X } from "lucide-react";

interface ThesisMustHavesProps {
  mustHaves: string[];
  onUpdate: (mustHaves: string[]) => void;
}

export const ThesisMustHaves = ({ mustHaves, onUpdate }: ThesisMustHavesProps) => {
  const [newMustHave, setNewMustHave] = useState("");

  const addMustHave = () => {
    if (newMustHave.trim()) {
      onUpdate([...mustHaves, newMustHave.trim()]);
      setNewMustHave("");
    }
  };

  const removeMustHave = (index: number) => {
    onUpdate(mustHaves.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-800 flex items-center">
        <Star className="h-4 w-4 mr-2 text-yellow-500" />
        Must Haves
      </h3>
      
      <div className="space-y-2">
        {mustHaves.map((mustHave, index) => (
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
  );
};