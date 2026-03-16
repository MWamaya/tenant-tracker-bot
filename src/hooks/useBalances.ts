import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Balance {
  id: string;
  landlord_id: string;
  house_id: string;
  month: string;
  expected_rent: number;
  paid_amount: number;
  carry_forward: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface BalanceWithHouse extends Balance {
  houses?: {
    id: string;
    house_no: string;
    expected_rent: number;
  } | null;
}

export const useBalances = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const balancesQuery = useQuery({
    queryKey: ['balances', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return apiClient.get<BalanceWithHouse[]>('/api/balances');
    },
    enabled: !!user?.id,
  });

  const calculateMonthlyBalance = useMutation({
    mutationFn: async ({ houseId, month }: { houseId: string; month: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiClient.post<Balance>('/api/balances/calculate', { house_id: houseId, month });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate balance: ${error.message}`);
    },
  });

  return {
    balances: balancesQuery.data || [],
    isLoading: balancesQuery.isLoading,
    error: balancesQuery.error,
    calculateMonthlyBalance,
    refetch: balancesQuery.refetch,
  };
};
