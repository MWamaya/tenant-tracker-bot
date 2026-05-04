import { useState } from 'react';
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
import { Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { PaymentWithDetails } from '@/hooks/usePayments';

interface Props {
  payment: PaymentWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentDetailDialog = ({ payment, open, onOpenChange }: Props) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

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

          <DialogFooter className="gap-2">
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
