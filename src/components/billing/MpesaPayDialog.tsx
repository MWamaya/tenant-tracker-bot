import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionPayment } from '@/hooks/useSubscriptionPayment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Smartphone, CheckCircle2, XCircle, PartyPopper } from 'lucide-react';

interface MpesaPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  /** Total amount to charge — monthly price × months. */
  amount: number;
  /** Billing cycles this payment covers (1, 3, 6, or 12). Defaults to 1. */
  months?: number;
  onActivated: () => void;
}

export const MpesaPayDialog = ({ open, onOpenChange, planName, amount, months = 1, onActivated }: MpesaPayDialogProps) => {
  const { user } = useAuth();
  const { status, failureReason, pay, reset } = useSubscriptionPayment();
  const [phone, setPhone] = useState((user?.user_metadata?.phone as string) || '');

  const busy = status === 'requesting' || status === 'awaiting_pin';
  const planLabel = months > 1 ? `${planName} plan — ${months} months` : `${planName} plan`;

  const handlePay = async () => {
    if (!phone.trim()) return;
    await pay(planName, phone.trim(), months);
  };

  const handleDone = () => {
    onActivated();
    reset();
    onOpenChange(false);
  };

  const handleCancelWait = () => {
    reset();
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!busy) {
      if (!next) reset();
      onOpenChange(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {status === 'completed' ? (
          <>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold flex items-center justify-center gap-1.5">
                  Payment successful <PartyPopper className="h-4 w-4 text-primary" />
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {planLabel} is now active. Receipt for KES {amount.toLocaleString()} confirmed.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleDone}>
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pay with M-Pesa</DialogTitle>
              <DialogDescription>
                {planLabel} — KES {amount.toLocaleString()}{months > 1 ? ' total' : '/month'}
              </DialogDescription>
            </DialogHeader>

            {status === 'awaiting_pin' ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Smartphone className="h-7 w-7 text-primary" />
                </div>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="font-medium">Check your phone</p>
                <p className="text-sm text-muted-foreground">
                  Enter your M-Pesa PIN on the prompt sent to <span className="font-medium text-foreground">{phone}</span> for
                  KES {amount.toLocaleString()}.
                </p>
                <p className="text-xs text-muted-foreground">This updates automatically once you approve it.</p>
              </div>
            ) : status === 'timed_out' ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Loader2 className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Still waiting for confirmation</p>
                <p className="text-sm text-muted-foreground">
                  If you completed the prompt, your account will activate shortly. You can close this
                  and check back, or try again below.
                </p>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {status === 'failed' && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{failureReason}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="mpesa-phone">M-Pesa phone number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mpesa-phone"
                      className="pl-9"
                      placeholder="0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className={status === 'awaiting_pin' ? 'sm:justify-center' : undefined}>
              {status === 'idle' || status === 'failed' || status === 'timed_out' ? (
                <Button className="w-full" onClick={handlePay} disabled={!phone.trim()}>
                  Send payment request
                </Button>
              ) : status === 'requesting' ? (
                <Button className="w-full" disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending request...
                </Button>
              ) : status === 'awaiting_pin' ? (
                <Button variant="ghost" size="sm" onClick={handleCancelWait}>
                  Cancel and close
                </Button>
              ) : null}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
