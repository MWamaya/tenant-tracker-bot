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
import { Plus, Trash2, Users } from 'lucide-react';

interface BulkTenantEntry {
  name: string;
  phone: string;
  houseId: string;
}

interface House {
  id: string;
  houseNo: string;
  expectedRent: number;
}

interface BulkTenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  houses: House[];
  assignedHouseIds: string[];
  onSave: (tenants: { name: string; phone: string; houseId: string }[]) => void;
}

export const BulkTenantFormDialog = ({
  open,
  onOpenChange,
  houses,
  assignedHouseIds,
  onSave,
}: BulkTenantFormDialogProps) => {
  const [entries, setEntries] = useState<BulkTenantEntry[]>([
    { name: '', phone: '', houseId: '' },
    { name: '', phone: '', houseId: '' },
    { name: '', phone: '', houseId: '' },
  ]);

  useEffect(() => {
    if (open) {
      setEntries([
        { name: '', phone: '', houseId: '' },
        { name: '', phone: '', houseId: '' },
        { name: '', phone: '', houseId: '' },
      ]);
    }
  }, [open]);

  // Track which houses are selected within this bulk form
  const selectedHouseIds = entries.map(e => e.houseId).filter(Boolean);

  const getAvailableHouses = (currentEntryHouseId: string) => {
    return houses.filter(
      (h) =>
        (!assignedHouseIds.includes(h.id) && !selectedHouseIds.includes(h.id)) ||
        h.id === currentEntryHouseId
    );
  };

  const addRow = () => {
    setEntries(prev => [...prev, { name: '', phone: '', houseId: '' }]);
  };

  const removeRow = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof BulkTenantEntry, value: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const validEntries = entries.filter(e => e.name.trim() && e.phone.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validEntries.length === 0) return;

    onSave(
      validEntries.map(e => ({
        name: e.name.trim(),
        phone: e.phone.trim(),
        houseId: e.houseId,
      }))
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Bulk Add Tenants
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add multiple tenants at once. House assignment is optional.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Entries */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Full Name *</span>
              <span>Phone *</span>
              <span>House (Optional)</span>
              <span></span>
            </div>
            {entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 items-center">
                <Input
                  placeholder="Tenant name"
                  value={entry.name}
                  onChange={(e) => updateEntry(index, 'name', e.target.value)}
                />
                <Input
                  placeholder="0712345678"
                  value={entry.phone}
                  onChange={(e) => updateEntry(index, 'phone', e.target.value)}
                />
                <Select
                  value={entry.houseId || 'none'}
                  onValueChange={(val) => updateEntry(index, 'houseId', val === 'none' ? '' : val)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="No house" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="none">No house</SelectItem>
                    {getAvailableHouses(entry.houseId).map((house) => (
                      <SelectItem key={house.id} value={house.id}>
                        {house.houseNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              Add {validEntries.length} Tenant{validEntries.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
