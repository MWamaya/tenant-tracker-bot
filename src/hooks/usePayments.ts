import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
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
      return apiClient.get<PaymentWithDetails[]>('/api/payments');
    },
    enabled: !!user?.id,
  });

  const addPayment = useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiClient.post<Payment>('/api/payments', payment);
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
