import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Property } from '@/hooks/useProperties';

interface BulkHouseEntry {
  houseNo: string;
  expectedRent: string;
}

interface BulkHouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  propertyName?: string;
  properties?: Property[];
  onSave: (houses: { houseNo: string; expectedRent: number; propertyId?: string }[]) => void;
}

export const BulkHouseFormDialog = ({
  open,
  onOpenChange,
  propertyId: defaultPropertyId,
  propertyName,
  properties = [],
  onSave,
}: BulkHouseFormDialogProps) => {
  const [entries, setEntries] = useState<BulkHouseEntry[]>([
    { houseNo: '', expectedRent: '' },
    { houseNo: '', expectedRent: '' },
    { houseNo: '', expectedRent: '' },
  ]);
  const [commonRent, setCommonRent] = useState('');
  const [useCommonRent, setUseCommonRent] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState(defaultPropertyId || 'none');

  useEffect(() => {
    if (open) {
      setEntries([
        { houseNo: '', expectedRent: '' },
        { houseNo: '', expectedRent: '' },
        { houseNo: '', expectedRent: '' },
      ]);
      setCommonRent('');
      setUseCommonRent(false);
      setSelectedPropertyId(defaultPropertyId || 'none');
    }
  }, [open, defaultPropertyId]);

  const addRow = () => {
    setEntries(prev => [...prev, { houseNo: '', expectedRent: '' }]);
  };

  const removeRow = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof BulkHouseEntry, value: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const applyCommonRent = () => {
    if (!commonRent) return;
    setEntries(prev => prev.map(e => ({ ...e, expectedRent: commonRent })));
    setUseCommonRent(true);
  };

  const validEntries = entries.filter(e => e.houseNo.trim() && e.expectedRent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validEntries.length === 0) return;

    onSave(
      validEntries.map(e => ({
        houseNo: e.houseNo.trim(),
        expectedRent: parseFloat(e.expectedRent),
      }))
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Houses</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adding houses to <span className="font-medium">{propertyName}</span>
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Common Rent */}
          <div className="flex items-end gap-2 p-3 rounded-lg bg-muted/50">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Set common rent for all (KES)</Label>
              <Input
                type="number"
                placeholder="e.g., 10000"
                value={commonRent}
                onChange={(e) => setCommonRent(e.target.value)}
                min="0"
              />
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={applyCommonRent}>
              Apply All
            </Button>
          </div>

          {/* House Entries */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>House Number</span>
              <span>Rent (KES)</span>
              <span></span>
            </div>
            {entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center">
                <Input
                  placeholder={`e.g., A${index + 1}`}
                  value={entry.houseNo}
                  onChange={(e) => updateEntry(index, 'houseNo', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="10000"
                  value={entry.expectedRent}
                  onChange={(e) => updateEntry(index, 'expectedRent', e.target.value)}
                  min="0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(index)}
                  disabled={entries.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add Another Row
          </Button>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={validEntries.length === 0}>
              Add {validEntries.length} House{validEntries.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
