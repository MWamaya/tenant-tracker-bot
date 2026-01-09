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

interface Tenant {
  id: string;
  name: string;
  phone: string;
  houseId: string;
}

interface HouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  onSave: (houseData: {
    houseNo: string;
    expectedRent: number;
    isOccupied: boolean;
    tenantId?: string;
    occupancyDate?: string;
  }) => void;
}

export const HouseFormDialog = ({
  open,
  onOpenChange,
  tenants,
  onSave,
}: HouseFormDialogProps) => {
  const [houseNo, setHouseNo] = useState('');
  const [expectedRent, setExpectedRent] = useState('');
  const [isOccupied, setIsOccupied] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [occupancyDate, setOccupancyDate] = useState('');

  useEffect(() => {
    if (open) {
      setHouseNo('');
      setExpectedRent('');
      setIsOccupied(false);
      setTenantId('');
      setOccupancyDate('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNo.trim() || !expectedRent) return;

    onSave({
      houseNo: houseNo.trim(),
      expectedRent: parseFloat(expectedRent),
      isOccupied,
      tenantId: isOccupied ? tenantId : undefined,
      occupancyDate: isOccupied ? occupancyDate : undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New House</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="houseNo">House Number</Label>
            <Input
              id="houseNo"
              placeholder="e.g., 212245 A1"
              value={houseNo}
              onChange={(e) => setHouseNo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedRent">Expected Rent (KES)</Label>
            <Input
              id="expectedRent"
              type="number"
              placeholder="e.g., 10000"
              value={expectedRent}
              onChange={(e) => setExpectedRent(e.target.value)}
              required
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupancy">Occupancy Status</Label>
            <Select
              value={isOccupied ? 'occupied' : 'vacant'}
              onValueChange={(value) => {
                setIsOccupied(value === 'occupied');
                if (value === 'vacant') {
                  setTenantId('');
                  setOccupancyDate('');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isOccupied && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tenant">Assign Tenant</Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.length === 0 ? (
                      <div className="py-2 px-2 text-sm text-muted-foreground">
                        No available tenants
                      </div>
                    ) : (
                      tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} - {tenant.phone}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupancyDate">Occupancy Date</Label>
                <Input
                  id="occupancyDate"
                  type="date"
                  value={occupancyDate}
                  onChange={(e) => setOccupancyDate(e.target.value)}
                />
              </div>
            </>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add House</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
