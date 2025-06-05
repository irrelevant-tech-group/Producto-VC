import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const investedSchema = z.object({
  investmentAmount: z.number().min(1, "Investment amount must be greater than 0"),
  investmentDate: z.string().min(1, "Investment date is required"),
  ownershipPercentage: z.number().min(0.01, "Ownership must be greater than 0").max(100, "Ownership cannot exceed 100%"),
  decisionReason: z.string().min(1, "Decision reason is required"),
});

const declinedSchema = z.object({
  decisionReason: z.string().min(1, "Decision reason is required"),
});

const standbySchema = z.object({
  decisionReason: z.string().optional(),
});

type DecisionType = 'invested' | 'declined' | 'standby';

interface InvestmentDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionType: DecisionType;
  startupName: string;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export function InvestmentDecisionModal({
  isOpen,
  onClose,
  decisionType,
  startupName,
  onSubmit,
  isLoading,
}: InvestmentDecisionModalProps) {
  const getSchema = () => {
    switch (decisionType) {
      case 'invested': return investedSchema;
      case 'declined': return declinedSchema;
      case 'standby': return standbySchema;
      default: return standbySchema;
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      investmentAmount: undefined,
      investmentDate: new Date().toISOString().split('T')[0],
      ownershipPercentage: undefined,
      decisionReason: "",
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const getTitle = () => {
    switch (decisionType) {
      case 'invested': return `Mark ${startupName} as Invested`;
      case 'declined': return `Mark ${startupName} as Declined`;
      case 'standby': return `Move ${startupName} to Standby`;
      default: return 'Investment Decision';
    }
  };

  const getIcon = () => {
    switch (decisionType) {
      case 'invested': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'declined': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'standby': return <Clock className="h-5 w-5 text-amber-600" />;
      default: return null;
    }
  };

  const getButtonColor = () => {
    switch (decisionType) {
      case 'invested': return 'bg-green-600 hover:bg-green-700';
      case 'declined': return 'bg-red-600 hover:bg-red-700';
      case 'standby': return 'bg-amber-600 hover:bg-amber-700';
      default: return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {decisionType === 'invested' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="investmentAmount">Investment Amount*</Label>
                  <Input
                    id="investmentAmount"
                    type="number"
                    step="0.01"
                    placeholder="1000000"
                    {...register("investmentAmount", { 
                      setValueAs: value => value === "" ? undefined : Number(value)
                    })}
                    className={errors.investmentAmount ? "border-destructive" : ""}
                  />
                  {errors.investmentAmount && (
                    <p className="text-destructive text-xs mt-1">{errors.investmentAmount.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="ownershipPercentage">Ownership %*</Label>
                  <Input
                    id="ownershipPercentage"
                    type="number"
                    step="0.01"
                    placeholder="10.5"
                    {...register("ownershipPercentage", { 
                      setValueAs: value => value === "" ? undefined : Number(value)
                    })}
                    className={errors.ownershipPercentage ? "border-destructive" : ""}
                  />
                  {errors.ownershipPercentage && (
                    <p className="text-destructive text-xs mt-1">{errors.ownershipPercentage.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="investmentDate">Investment Date*</Label>
                <Input
                  id="investmentDate"
                  type="date"
                  {...register("investmentDate")}
                  className={errors.investmentDate ? "border-destructive" : ""}
                />
                {errors.investmentDate && (
                  <p className="text-destructive text-xs mt-1">{errors.investmentDate.message}</p>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="decisionReason">
              Decision Reason{decisionType === 'standby' ? ' (Optional)' : '*'}
            </Label>
            <Textarea
              id="decisionReason"
              placeholder={
                decisionType === 'invested' 
                  ? "Explain why this investment was approved..."
                  : decisionType === 'declined'
                  ? "Explain why this startup was declined..."
                  : "Explain why this startup was moved to standby..."
              }
              {...register("decisionReason")}
              className={errors.decisionReason ? "border-destructive" : ""}
              rows={3}
            />
            {errors.decisionReason && (
              <p className="text-destructive text-xs mt-1">{errors.decisionReason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className={getButtonColor()}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : `Mark as ${decisionType.charAt(0).toUpperCase() + decisionType.slice(1)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}