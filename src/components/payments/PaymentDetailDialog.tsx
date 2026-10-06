import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { recomputeHouseBalanceForPaymentDate } from '@/lib/syncPayments';
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
import { Trash2, Loader2, Split, PiggyBank } from 'lucide-react';
import { format } from 'date-fns';
import { formatDateTime } from '@/lib/dates';
import { toast } from 'sonner';
import { useImpersonation, assertWritable } from '@/hooks/useImpersonation';
import type { PaymentWithDetails } from '@/hooks/usePayments';

interface Props {
  payment: PaymentWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SiblingHouse {
  tenant_id: string;
  tenant_name: string;
  house_id: string;
  house_no: string | null;
}

const normalizePersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const nameTokens = (value: string) =>
  normalizePersonName(value)
    .split(' ')
    .filter((token) => token.length >= 3);

// A deposit only ever happens at move-in. Gate "Mark Deposit" to payments
// dated near the tenant's occupancy_date so it can't be mistaken for a tool
// to reclassify an ordinary overpayment made months into the tenancy.
const MOVE_IN_WINDOW_DAYS = 14;

export const PaymentDetailDialog = ({ payment, open, onOpenChange }: Props) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [siblings, setSiblings] = useState<SiblingHouse[]>([]);
  const [splitConfirmOpen, setSplitConfirmOpen] = useState(false);
  const [depositConfirmOpen, setDepositConfirmOpen] = useState(false);
  // How much of the house's deposit is still unpaid for the CURRENT tenancy,
  // so the button stays available across multiple installments and disables
  // once the deposit is fully covered (not just "any deposit row exists").
  const [depositRemaining, setDepositRemaining] = useState(0);
  const queryClient = useQueryClient();
  const { viewOnly } = useImpersonation();

  useEffect(() => {
    let cancelled = false;
    async function loadDepositRemaining() {
      const depositOwed = Number(payment?.houses?.deposit || 0);
      if (!payment?.house_id || !payment.houses?.occupancy_date || depositOwed <= 0) {
        setDepositRemaining(0);
        return;
      }
      // Same ±MOVE_IN_WINDOW_DAYS window as isMoveInWindow/eligibility below —
      // a deposit is often paid a few days BEFORE occupancy_date, so a plain
      // gte(occupancy_date) would never find it and depositRemaining would
      // never drop, leaving the button stuck on forever.
      const occ = new Date(payment.houses.occupancy_date).getTime();
      const windowStart = new Date(occ - MOVE_IN_WINDOW_DAYS * 86400000).toISOString();
      const windowEnd = new Date(occ + MOVE_IN_WINDOW_DAYS * 86400000).toISOString();
      const { data } = await supabase
        .from('payments')
        .select('amount')
        .eq('house_id', payment.house_id)
        .eq('payment_type', 'deposit')
        .gte('payment_date', windowStart)
        .lte('payment_date', windowEnd);
      const depositPaid = (data || []).reduce((sum, p) => sum + Number(p.amount), 0);
      if (!cancelled) setDepositRemaining(Math.max(0, depositOwed - depositPaid));
    }
    loadDepositRemaining();
    return () => {
      cancelled = true;
    };
  }, [payment?.id, payment?.house_id, payment?.houses?.occupancy_date, payment?.houses?.deposit]);

  useEffect(() => {
    let cancelled = false;
    async function loadSiblings() {
      if (!payment || !payment.landlord_id) {
        setSiblings([]);
        return;
      }
      const { data } = await supabase
        .from('tenants')
        .select('id, name, house_id, houses(id, house_no)')
        .eq('landlord_id', payment.landlord_id)
        .not('house_id', 'is', null);
      if (cancelled) return;

      const targetName = payment.tenants?.name ? normalizePersonName(payment.tenants.name) : '';
      const senderTokens = nameTokens(payment.sender_name || '');

      setSiblings(
        (data || [])
          .filter((t) => {
            if (!t.house_id) return false;
            if (payment.house_id && t.house_id === payment.house_id) return false;
            if (!payment.house_id && payment.tenants?.id && t.id === payment.tenants.id) return false;

            const tenantName = normalizePersonName(t.name || '');
            if (targetName && tenantName === targetName) return true;

            if (senderTokens.length > 0) {
              const tenantTokens = new Set(nameTokens(t.name || ''));
              return senderTokens.every((token) => tenantTokens.has(token));
            }

            return false;
          })
          .map((t) => ({
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
      assertWritable(viewOnly);
      if (!payment) throw new Error('No payment');
      // Remove dependent email_logs first (FK-less but referenced by payment_id)
      await supabase.from('email_logs').delete().eq('payment_id', id);
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;

      if (payment.house_id) {
        await recomputeHouseBalanceForPaymentDate(payment.landlord_id, payment.house_id, payment.payment_date);
      }
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
      assertWritable(viewOnly);
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
        payment_source: 'split_payment',
      }));
      if (rows.length) {
        const { error: insErr } = await supabase.from('payments').insert(rows);
        if (insErr) throw insErr;
      }

      const affectedHouseIds = new Set(
        [payment.house_id, ...siblings.map((s) => s.house_id)].filter((id): id is string => !!id),
      );
      await Promise.all(
        Array.from(affectedHouseIds).map((houseId) =>
          recomputeHouseBalanceForPaymentDate(payment.landlord_id, houseId, payment.payment_date),
        ),
      );
    },
    onSuccess: () => {
      toast.success('Payment split equally across houses');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setSplitConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(`Failed to split: ${err.message}`),
  });

  const markDeposit = useMutation({
    mutationFn: async () => {
      assertWritable(viewOnly);
      if (!payment || !payment.house_id || !payment.houses) throw new Error('No payment');
      const depositAmount = Math.min(Number(payment.amount), depositRemaining);
      const rentPortion = Number(payment.amount) - depositAmount;

      if (rentPortion <= 0) {
        const { error } = await supabase
          .from('payments')
          .update({ payment_type: 'deposit' })
          .eq('id', payment.id);
        if (error) throw error;
      } else {
        const { error: updErr } = await supabase
          .from('payments')
          .update({ amount: rentPortion })
          .eq('id', payment.id);
        if (updErr) throw updErr;

        const { error: insErr } = await supabase.from('payments').insert({
          landlord_id: payment.landlord_id,
          tenant_id: payment.tenant_id,
          house_id: payment.house_id,
          amount: depositAmount,
          mpesa_ref: `${payment.mpesa_ref}-DEP`,
          payment_date: payment.payment_date,
          sender_name: payment.sender_name,
          sender_phone: payment.sender_phone,
          payment_source: 'deposit_split',
          payment_type: 'deposit',
        });
        if (insErr) throw insErr;
      }

      await recomputeHouseBalanceForPaymentDate(payment.landlord_id, payment.house_id, payment.payment_date);
    },
    onSuccess: () => {
      toast.success('Deposit recorded');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setDepositConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(`Failed to mark deposit: ${err.message}`),
  });

  if (!payment) return null;

  const isMoveInWindow = (() => {
    if (!payment.houses?.occupancy_date) return false;
    const occ = new Date(payment.houses.occupancy_date).getTime();
    const paid = new Date(payment.payment_date).getTime();
    return Math.abs(paid - occ) / 86400000 <= MOVE_IN_WINDOW_DAYS;
  })();

  const canMarkDeposit =
    payment.payment_type !== 'deposit' &&
    !!payment.house_id &&
    isMoveInWindow &&
    depositRemaining > 0;

  const depositAmount = Math.min(Number(payment.amount), depositRemaining);
  const rentPortionAfterDeposit = Number(payment.amount) - depositAmount;

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
              <div className="flex items-center gap-2">
                {payment.payment_type === 'deposit' && <Badge>Deposit</Badge>}
                <Badge variant="outline" className="font-mono">
                  {payment.mpesa_ref}
                </Badge>
              </div>
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
                  {formatDateTime(payment.payment_date)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm mb-1">Full message</p>
              <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                {`${payment.sender_name || 'Unknown'} sent ${formatCurrency(
                  Number(payment.amount)
                )} on ${formatDateTime(payment.payment_date)}. Ref: ${payment.mpesa_ref}${
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
            {canMarkDeposit && (
              <Button
                variant="secondary"
                onClick={() => setDepositConfirmOpen(true)}
                className="gap-2"
              >
                <PiggyBank className="h-4 w-4" />
                Mark Deposit
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

      <AlertDialog open={splitConfirmOpen} onOpenChange={setSplitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Split this payment equally?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {formatCurrency(Number(payment.amount))} will be split equally across{' '}
                  {siblings.length + 1} houses under{' '}
                  <span className="font-medium">
                    {payment.tenants?.name || payment.sender_name || 'this tenant'}
                  </span>:
                </p>
                <ul className="list-disc pl-5 text-sm">
                  <li>
                    {payment.houses?.house_no || 'Unassigned'} —{' '}
                    {formatCurrency(
                      Math.round(
                        (Number(payment.amount) -
                          Math.round((Number(payment.amount) / (siblings.length + 1)) * 100) /
                            100 *
                            siblings.length) *
                          100
                      ) / 100
                    )}
                  </li>
                  {siblings.map((s) => (
                    <li key={s.tenant_id}>
                      {s.house_no || 'Unassigned'} —{' '}
                      {formatCurrency(
                        Math.round((Number(payment.amount) / (siblings.length + 1)) * 100) / 100
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  New payment rows will use the same M-Pesa reference with suffixes (-S2, -S3…).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={splitPayment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={splitPayment.isPending}
              onClick={(e) => {
                e.preventDefault();
                splitPayment.mutate();
              }}
            >
              {splitPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Split'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={depositConfirmOpen} onOpenChange={setDepositConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark the deposit portion?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {rentPortionAfterDeposit > 0 ? (
                  <p>
                    {formatCurrency(depositAmount)} of this payment will be split off and tagged as
                    the deposit, leaving {formatCurrency(rentPortionAfterDeposit)} as rent for{' '}
                    {payment.houses?.house_no || 'this house'}.
                  </p>
                ) : (
                  <p>
                    This entire payment ({formatCurrency(Number(payment.amount))}) will be tagged as
                    the deposit for {payment.houses?.house_no || 'this house'} — none of it will
                    count as rent.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Deposits are excluded from rent arrears and collection totals everywhere in the
                  app.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markDeposit.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={markDeposit.isPending}
              onClick={(e) => {
                e.preventDefault();
                markDeposit.mutate();
              }}
            >
              {markDeposit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Deposit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
