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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";

const approveSchema = z.object({
  comments: z.string().optional(),
});

const rejectSchema = z.object({
  comments: z.string().min(1, "Comments are required when rejecting a memo"),
});

type ApprovalType = 'approve' | 'reject';

interface MemoApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvalType: ApprovalType;
  memoVersion: number;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export function MemoApprovalModal({
  isOpen,
  onClose,
  approvalType,
  memoVersion,
  onSubmit,
  isLoading,
}: MemoApprovalModalProps) {
  const schema = approvalType === 'approve' ? approveSchema : rejectSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      comments: "",
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const getTitle = () => {
    return approvalType === 'approve' 
      ? `Approve Investment Memo v${memoVersion}`
      : `Reject Investment Memo v${memoVersion}`;
  };

  const getIcon = () => {
    return approvalType === 'approve' 
      ? <CheckCircle className="h-5 w-5 text-green-600" />
      : <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getButtonColor = () => {
    return approvalType === 'approve' 
      ? 'bg-green-600 hover:bg-green-700'
      : 'bg-red-600 hover:bg-red-700';
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
          <div>
            <Label htmlFor="comments">
              Comments{approvalType === 'reject' ? '*' : ' (Optional)'}
            </Label>
            <Textarea
              id="comments"
              placeholder={
                approvalType === 'approve'
                  ? "Add any additional comments about this approval..."
                  : "Explain why this memo is being rejected..."
              }
              {...register("comments")}
              className={errors.comments ? "border-destructive" : ""}
              rows={4}
            />
            {errors.comments && (
              <p className="text-destructive text-xs mt-1">{errors.comments.message}</p>
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
              {isLoading 
                ? 'Processing...' 
                : approvalType === 'approve' 
                  ? 'Approve Memo' 
                  : 'Reject Memo'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}