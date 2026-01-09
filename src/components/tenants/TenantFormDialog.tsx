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
import { User, Phone, Home } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  secondaryPhone?: string;
  houseId: string;
}

interface House {
  id: string;
  houseNo: string;
  expectedRent: number;
}

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
  houses: House[];
  assignedHouseIds: string[];
  onSave: (data: { name: string; phone: string; secondaryPhone?: string; houseId: string }) => void;
}

export const TenantFormDialog = ({
  open,
  onOpenChange,
  tenant,
  houses,
  assignedHouseIds,
  onSave,
}: TenantFormDialogProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [houseId, setHouseId] = useState('');

  const isEditing = !!tenant;

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setPhone(tenant.phone);
      setSecondaryPhone(tenant.secondaryPhone || '');
      setHouseId(tenant.houseId);
    } else {
      setName('');
      setPhone('');
      setSecondaryPhone('');
      setHouseId('');
    }
  }, [tenant, open]);

  const availableHouses = houses.filter(
    (h) => !assignedHouseIds.includes(h.id) || h.id === tenant?.houseId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone) {
      onSave({ name, phone, secondaryPhone: secondaryPhone || undefined, houseId });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            {isEditing ? 'Edit Tenant' : 'Add New Tenant'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Full Name
            </Label>
            <Input
              id="name"
              placeholder="Enter tenant name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone Number
            </Label>
            <Input
              id="phone"
              placeholder="e.g. 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryPhone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Secondary Phone (Optional)
            </Label>
            <Input
              id="secondaryPhone"
              placeholder="e.g. 0722345678"
              value={secondaryPhone}
              onChange={(e) => setSecondaryPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="house" className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              Assign House (Optional)
            </Label>
            <Select 
              value={houseId || "none"} 
              onValueChange={(val) => setHouseId(val === "none" ? "" : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a house" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">No house assigned</SelectItem>
                {availableHouses.map((house) => (
                  <SelectItem key={house.id} value={house.id}>
                    {house.houseNo} - KES {house.expectedRent.toLocaleString()}/month
                  </SelectItem>
                ))}
                {availableHouses.length === 0 && (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No vacant houses available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || !phone}>
              {isEditing ? 'Save Changes' : 'Add Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
