import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2, Split } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { PaymentWithDetails } from '@/hooks/usePayments';

interface Props {
  payment: PaymentWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SiblingHouse {
  tenant_id: string;
  tenant_name: string;
  house_id: string | null;
  house_no: string | null;
}

export const PaymentDetailDialog = ({ payment, open, onOpenChange }: Props) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [siblings, setSiblings] = useState<SiblingHouse[]>([]);
  const [splitConfirmOpen, setSplitConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    async function loadSiblings() {
      if (!payment || !payment.tenants?.name || !payment.landlord_id) {
        setSiblings([]);
        return;
      }
      const { data } = await supabase
        .from('tenants')
        .select('id, name, house_id, houses(id, house_no)')
        .eq('landlord_id', payment.landlord_id)
        .ilike('name', payment.tenants.name)
        .neq('id', payment.tenants.id);
      if (cancelled) return;
      setSiblings(
        (data || []).map((t: any) => ({
          tenant_id: t.id,
          tenant_name: t.name,
          house_id: t.house_id,
          house_no: t.houses?.house_no ?? null,
        }))
      );
    }
    loadSiblings();
    return () => {
      cancelled = true;
    };
  }, [payment?.id]);

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      // Remove dependent email_logs first (FK-less but referenced by payment_id)
      await supabase.from('email_logs').delete().eq('payment_id', id);
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment deleted');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      setConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  const splitPayment = useMutation({
    mutationFn: async () => {
      if (!payment) throw new Error('No payment');
      const total = Number(payment.amount);
      const parts = siblings.length + 1;
      const share = Math.round((total / parts) * 100) / 100;
      // First share stays on the original payment; give remainder to it to avoid rounding drift.
      const originalShare = Math.round((total - share * siblings.length) * 100) / 100;

      const { error: updErr } = await supabase
        .from('payments')
        .update({ amount: originalShare })
        .eq('id', payment.id);
      if (updErr) throw updErr;

      const rows = siblings.map((s, idx) => ({
        landlord_id: payment.landlord_id,
        tenant_id: s.tenant_id,
        house_id: s.house_id,
        amount: share,
        mpesa_ref: `${payment.mpesa_ref}-S${idx + 2}`,
        payment_date: payment.payment_date,
        sender_name: payment.sender_name,
        sender_phone: payment.sender_phone,
      }));
      if (rows.length) {
        const { error: insErr } = await supabase.from('payments').insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      toast.success('Payment split equally across houses');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSplitConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(`Failed to split: ${err.message}`),
  });

  if (!payment) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Full message and information for this payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-success">
                {formatCurrency(Number(payment.amount))}
              </span>
              <Badge variant="outline" className="font-mono">
                {payment.mpesa_ref}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Sender</p>
                <p className="font-medium">
                  {payment.tenants?.name || payment.sender_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{payment.sender_phone || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">House</p>
                <p className="font-medium">
                  {payment.houses?.house_no || 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(payment.payment_date), 'd/M/yyyy HH:mm')}
                </p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm mb-1">Full message</p>
              <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                {`${payment.sender_name || 'Unknown'} sent ${formatCurrency(
                  Number(payment.amount)
                )} on ${format(
                  new Date(payment.payment_date),
                  'd/M/yyyy HH:mm'
                )}. Ref: ${payment.mpesa_ref}${
                  payment.sender_phone ? ` • Phone: ${payment.sender_phone}` : ''
                }${
                  payment.houses?.house_no
                    ? ` • House: ${payment.houses.house_no}`
                    : ''
                }`}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            {siblings.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => setSplitConfirmOpen(true)}
                className="gap-2"
              >
                <Split className="h-4 w-4" />
                Split across {siblings.length + 1} houses
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Payment
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the payment{' '}
              <span className="font-mono">{payment.mpesa_ref}</span> of{' '}
              {formatCurrency(Number(payment.amount))}. Tenant balances will be
              recalculated on the next sync.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePayment.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePayment.isPending}
              onClick={(e) => {
                e.preventDefault();
                deletePayment.mutate(payment.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
