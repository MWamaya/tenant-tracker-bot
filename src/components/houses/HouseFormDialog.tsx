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
import { House, Tenant } from '@/lib/mockData';

interface HouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house?: House | null;
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
  house,
  tenants,
  onSave,
}: HouseFormDialogProps) => {
  const [houseNo, setHouseNo] = useState('');
  const [expectedRent, setExpectedRent] = useState('');
  const [isOccupied, setIsOccupied] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [occupancyDate, setOccupancyDate] = useState('');

  // Get tenants that are not assigned to any house (available tenants)
  const availableTenants = tenants.filter(t => !t.houseId || (house && t.houseId === house.id));

  useEffect(() => {
    if (house) {
      setHouseNo(house.houseNo);
      setExpectedRent(house.expectedRent.toString());
      const assignedTenant = tenants.find(t => t.houseId === house.id);
      setIsOccupied(!!assignedTenant);
      setTenantId(assignedTenant?.id || '');
      setOccupancyDate('');
    } else {
      setHouseNo('');
      setExpectedRent('');
      setIsOccupied(false);
      setTenantId('');
      setOccupancyDate('');
    }
  }, [house, tenants, open]);

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
          <DialogTitle>{house ? 'Edit House' : 'Add New House'}</DialogTitle>
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
                    {availableTenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} - {tenant.phone}
                      </SelectItem>
                    ))}
                    {availableTenants.length === 0 && (
                      <SelectItem value="" disabled>
                        No available tenants
                      </SelectItem>
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
            <Button type="submit">
              {house ? 'Save Changes' : 'Add House'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
