import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, PlusCircle, X } from "lucide-react";

interface ThesisRedFlagsProps {
  redFlags: string[];
  onUpdate: (redFlags: string[]) => void;
}

export const ThesisRedFlags = ({ redFlags, onUpdate }: ThesisRedFlagsProps) => {
  const [newRedFlag, setNewRedFlag] = useState("");

  const addRedFlag = () => {
    if (newRedFlag.trim()) {
      onUpdate([...redFlags, newRedFlag.trim()]);
      setNewRedFlag("");
    }
  };

  const removeRedFlag = (index: number) => {
    onUpdate(redFlags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-800 flex items-center">
        <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
        Red Flags
      </h3>
      
      <div className="space-y-2">
        {redFlags.map((flag, index) => (
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
  );
};