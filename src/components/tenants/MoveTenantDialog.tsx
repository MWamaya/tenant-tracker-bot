import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRightLeft, Home } from 'lucide-react';

interface VacantHouse {
  id: string;
  houseNo: string;
  expectedRent: number;
  propertyName?: string | null;
}

interface MoveTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  currentHouseNo?: string | null;
  vacantHouses: VacantHouse[];
  onConfirm: (newHouseId: string) => Promise<void> | void;
}

export const MoveTenantDialog = ({
  open,
  onOpenChange,
  tenantName,
  currentHouseNo,
  vacantHouses,
  onConfirm,
}: MoveTenantDialogProps) => {
  const [newHouseId, setNewHouseId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewHouseId('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseId) return;
    setSubmitting(true);
    try {
      await onConfirm(newHouseId);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            Move Tenant to Another House
          </DialogTitle>
          <DialogDescription>
            Reassign <span className="font-medium text-foreground">{tenantName}</span>
            {currentHouseNo ? <> from house <span className="font-medium text-foreground">{currentHouseNo}</span></> : null} to a vacant house.
            All tenant details and payment history will be preserved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              New House
            </Label>
            {vacantHouses.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
                No vacant houses available to move into.
              </div>
            ) : (
              <Select value={newHouseId} onValueChange={setNewHouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vacant house" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {vacantHouses.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.houseNo}
                      {h.propertyName ? ` · ${h.propertyName}` : ''} — KES {h.expectedRent.toLocaleString()}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              The previous house will be marked vacant automatically.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newHouseId || submitting || vacantHouses.length === 0}>
              {submitting ? 'Moving…' : 'Move Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
