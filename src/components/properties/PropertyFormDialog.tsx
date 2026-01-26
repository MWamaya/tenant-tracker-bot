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

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (propertyData: {
    name: string;
    address?: string;
    county?: string;
    town?: string;
    property_type?: string;
  }) => void;
  editProperty?: Property | null;
}

export const PropertyFormDialog = ({
  open,
  onOpenChange,
  onSave,
  editProperty,
}: PropertyFormDialogProps) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [county, setCounty] = useState('');
  const [town, setTown] = useState('');
  const [propertyType, setPropertyType] = useState('residential');

  useEffect(() => {
    if (open) {
      if (editProperty) {
        setName(editProperty.name);
        setAddress(editProperty.address || '');
        setCounty(editProperty.county || '');
        setTown(editProperty.town || '');
        setPropertyType(editProperty.property_type || 'residential');
      } else {
        setName('');
        setAddress('');
        setCounty('');
        setTown('');
        setPropertyType('residential');
      }
    }
  }, [open, editProperty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      address: address.trim() || undefined,
      county: county.trim() || undefined,
      town: town.trim() || undefined,
      property_type: propertyType,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Sunrise Apartments"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyType">Property Type</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="mixed">Mixed Use</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="e.g., 123 Main Street"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="town">Town/City</Label>
              <Input
                id="town"
                placeholder="e.g., Nairobi"
                value={town}
                onChange={(e) => setTown(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                placeholder="e.g., Nairobi"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editProperty ? 'Save Changes' : 'Add Property'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
