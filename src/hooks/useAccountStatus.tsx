import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Reads the current authenticated user's account_status from profiles.
 * Used to gate the app when a Super Admin suspends an account.
 */
export const useAccountStatus = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['account-status', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.account_status ?? 'active';
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  return {
    status: query.data ?? 'active',
    isSuspended: query.data === 'suspended',
    isExpired: query.data === 'expired',
    loading: query.isLoading,
  };
};
