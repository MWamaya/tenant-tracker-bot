import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      const { data, error } = await supabase
        .from('balances')
        .select(`
          *,
          houses (
            id,
            house_no,
            expected_rent
          )
        `)
        .eq('landlord_id', user.id)
        .order('month', { ascending: false });

      if (error) throw error;
      return data as BalanceWithHouse[];
    },
    enabled: !!user?.id,
  });

  const calculateMonthlyBalance = useMutation({
    mutationFn: async ({ houseId, month }: { houseId: string; month: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get house details
      const { data: house, error: houseError } = await supabase
        .from('houses')
        .select('expected_rent')
        .eq('id', houseId)
        .single();

      if (houseError) throw houseError;

      // Get previous month's balance for carry forward
      const prevMonth = new Date(month);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStr = prevMonth.toISOString().slice(0, 10);

      const { data: prevBalance } = await supabase
        .from('balances')
        .select('balance')
        .eq('house_id', houseId)
        .eq('month', prevMonthStr)
        .maybeSingle();

      const carryForward = prevBalance?.balance || 0;

      // Get payments for this house in this month
      const monthStart = new Date(month);
      const monthEnd = new Date(month);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('house_id', houseId)
        .gte('payment_date', monthStart.toISOString())
        .lt('payment_date', monthEnd.toISOString());

      if (paymentsError) throw paymentsError;

      const paidAmount = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const expectedRent = Number(house.expected_rent);
      const balance = expectedRent + carryForward - paidAmount;

      // Upsert balance record
      const { data, error } = await supabase
        .from('balances')
        .upsert({
          landlord_id: user.id,
          house_id: houseId,
          month,
          expected_rent: expectedRent,
          paid_amount: paidAmount,
          carry_forward: carryForward,
          balance,
        }, {
          onConflict: 'house_id,month'
        })
        .select()
        .single();

      if (error) throw error;
      return data as Balance;
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
