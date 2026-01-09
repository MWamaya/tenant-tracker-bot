import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Payment {
  id: string;
  landlord_id: string;
  house_id: string | null;
  tenant_id: string | null;
  amount: number;
  mpesa_ref: string;
  payment_date: string;
  sender_name: string | null;
  sender_phone: string | null;
  created_at: string;
}

export interface PaymentWithDetails extends Payment {
  houses?: {
    id: string;
    house_no: string;
  } | null;
  tenants?: {
    id: string;
    name: string;
  } | null;
}

export interface PaymentInsert {
  house_id?: string | null;
  tenant_id?: string | null;
  amount: number;
  mpesa_ref: string;
  payment_date: string;
  sender_name?: string | null;
  sender_phone?: string | null;
}

export const usePayments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          houses (
            id,
            house_no
          ),
          tenants (
            id,
            name
          )
        `)
        .eq('landlord_id', user.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as PaymentWithDetails[];
    },
    enabled: !!user?.id,
  });

  const addPayment = useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('payments')
        .insert({
          landlord_id: user.id,
          house_id: payment.house_id || null,
          tenant_id: payment.tenant_id || null,
          amount: payment.amount,
          mpesa_ref: payment.mpesa_ref,
          payment_date: payment.payment_date,
          sender_name: payment.sender_name || null,
          sender_phone: payment.sender_phone || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  return {
    payments: paymentsQuery.data || [],
    isLoading: paymentsQuery.isLoading,
    error: paymentsQuery.error,
    addPayment,
    refetch: paymentsQuery.refetch,
  };
};
