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
import { Property } from '@/hooks/useProperties';

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
  properties: Property[];
  defaultPropertyId?: string | null;
  onSave: (houseData: {
    houseNo: string;
    expectedRent: number;
    isOccupied: boolean;
    propertyId?: string;
    tenantId?: string;
    occupancyDate?: string;
  }) => void;
}

export const HouseFormDialog = ({
  open,
  onOpenChange,
  tenants,
  properties,
  defaultPropertyId,
  onSave,
}: HouseFormDialogProps) => {
  const [houseNo, setHouseNo] = useState('');
  const [expectedRent, setExpectedRent] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [isOccupied, setIsOccupied] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [occupancyDate, setOccupancyDate] = useState('');

  useEffect(() => {
    if (open) {
      setHouseNo('');
      setExpectedRent('');
      setPropertyId(defaultPropertyId || '');
      setIsOccupied(false);
      setTenantId('');
      setOccupancyDate('');
    }
  }, [open, defaultPropertyId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNo.trim() || !expectedRent) return;

    onSave({
      houseNo: houseNo.trim(),
      expectedRent: parseFloat(expectedRent),
      isOccupied,
      propertyId: propertyId || undefined,
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
          {/* Property Selection */}
          <div className="space-y-2">
            <Label htmlFor="property">Property (Optional)</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Property (Standalone)</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Group this house under a property building
            </p>
          </div>

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
