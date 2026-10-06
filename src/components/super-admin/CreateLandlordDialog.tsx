import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateLandlordAccount } from '@/hooks/useSuperAdminData';

interface CreateLandlordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill when creating an account from an onboarding request. */
  initial?: { fullName?: string; email?: string; phone?: string };
  /** When set, the request is marked 'converted' on success. */
  onboardingRequestId?: string;
}

export const CreateLandlordDialog = ({
  open,
  onOpenChange,
  initial,
  onboardingRequestId,
}: CreateLandlordDialogProps) => {
  const createLandlord = useCreateLandlordAccount();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Reset/pre-fill every time the dialog opens for a (potentially
  // different) onboarding request, rather than carrying over stale input.
  useEffect(() => {
    if (open) {
      setFullName(initial?.fullName || '');
      setEmail(initial?.email || '');
      setPhone(initial?.phone || '');
      setCompanyName('');
    }
  }, [open, initial?.fullName, initial?.email, initial?.phone]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) return;
    await createLandlord.mutateAsync({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      companyName: companyName.trim() || undefined,
      onboardingRequestId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Landlord</DialogTitle>
          <DialogDescription className="text-[#64748B]">
            Creates the account and emails them an invite to set a password. No subscription is
            assigned yet — do that afterwards from the Landlords list.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Wanjiru"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone (Optional)</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07xx xxx xxx"
            />
          </div>
          <div className="space-y-2">
            <Label>Company Name (Optional)</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Abc Properties"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#F1F5F9]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!fullName.trim() || !email.trim() || createLandlord.isPending}
          >
            {createLandlord.isPending ? 'Creating…' : 'Create Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
