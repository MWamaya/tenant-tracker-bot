import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveLandlordId } from '@/hooks/useImpersonation';
import { toast } from 'sonner';

// A queue item is either an existing payment with a missing house/tenant
// (resend-inbound found a partial match) or an email_log that never became
// a payment at all (resend-inbound found no match and had nothing to attach
// a payment to). Both are surfaced the same way so the landlord can assign
// a house to either from one screen.
export interface ReconciliationItem {
  source: 'payment' | 'email_log';
  id: string;
  amount: number;
  mpesaRef: string;
  senderName: string | null;
  parsedHouseNo: string | null;
  date: string;
}

export const useReconciliation = () => {
  const landlordId = useEffectiveLandlordId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reconciliation', landlordId],
    queryFn: async (): Promise<ReconciliationItem[]> => {
      if (!landlordId) return [];

      const [paymentsRes, emailLogsRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount, mpesa_ref, sender_name, payment_date, house_id, tenant_id')
          .eq('landlord_id', landlordId)
          .or('house_id.is.null,tenant_id.is.null')
          .order('payment_date', { ascending: false }),
        supabase
          .from('email_logs')
          .select('id, parsed_amount, parsed_mpesa_ref, parsed_tenant_name, parsed_house_no, parsed_date, created_at')
          .eq('landlord_id', landlordId)
          .eq('status', 'pending')
          .is('payment_id', null)
          .not('parsed_amount', 'is', null)
          .not('parsed_mpesa_ref', 'is', null)
          .order('created_at', { ascending: false }),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (emailLogsRes.error) throw emailLogsRes.error;

      const fromPayments: ReconciliationItem[] = (paymentsRes.data || []).map((p) => ({
        source: 'payment',
        id: p.id,
        amount: Number(p.amount),
        mpesaRef: p.mpesa_ref,
        senderName: p.sender_name,
        parsedHouseNo: null,
        date: p.payment_date,
      }));

      const fromEmailLogs: ReconciliationItem[] = (emailLogsRes.data || []).map((l) => ({
        source: 'email_log',
        id: l.id,
        amount: Number(l.parsed_amount),
        mpesaRef: l.parsed_mpesa_ref as string,
        senderName: l.parsed_tenant_name,
        parsedHouseNo: l.parsed_house_no,
        date: l.parsed_date || l.created_at,
      }));

      return [...fromPayments, ...fromEmailLogs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    },
    enabled: !!landlordId,
  });

  const assign = useMutation({
    mutationFn: async ({ item, houseId }: { item: ReconciliationItem; houseId: string }) => {
      const { data, error } = await supabase.functions.invoke('reconcile-payment', {
        body: { type: item.source === 'payment' ? 'payment' : 'email_log', id: item.id, houseId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['emailLogs'] });
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      toast.success('Payment reconciled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reconcile: ${error.message}`);
    },
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    assign,
  };
};
