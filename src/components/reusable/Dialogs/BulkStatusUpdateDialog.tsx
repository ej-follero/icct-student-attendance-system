import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Users, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface BulkStatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  entityType: 'student' | 'instructor';
  onUpdate: (status: string, reason?: string) => Promise<void>;
}

export function BulkStatusUpdateDialog({
  open,
  onOpenChange,
  selectedCount,
  entityType,
  onUpdate
}: BulkStatusUpdateDialogProps) {
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async () => {
    if (!status) {
      toast.error('Please select a status');
      return;
    }

    try {
      setIsUpdating(true);
      await onUpdate(status, reason || undefined);
      toast.success(`Successfully updated ${selectedCount} ${entityType}s`);
      onOpenChange(false);
      setStatus('');
      setReason('');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(`Failed to update ${entityType}s`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setStatus('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-xl flex flex-col max-h-[90vh]">
        {/* Accessibility - Hidden DialogTitle for screen readers */}
        <VisuallyHidden>
          <DialogTitle>Bulk Status Update</DialogTitle>
        </VisuallyHidden>
        
        {/* Blue Header Section with Close Button */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white rounded-t-xl relative flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Bulk Status Update</h3>
              <p className="text-blue-100 text-sm">
                Update the status of {selectedCount} selected {entityType}s
              </p>
            </div>
          </div>
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8 text-white hover:bg-white/20 rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Section */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className = "rounded">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for status change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="rounded"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Important:</p>
              <p>This action will update the status of all {selectedCount} selected {entityType}s. This action cannot be undone.</p>
            </div>
          </div>
          </div>
        </div>

        {/* Footer Section - Sticky */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 rounded-b-xl">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating}
            className = "rounded"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUpdating || !status}
            className="bg-blue-600 hover:bg-blue-700 rounded"
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Update Status
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
