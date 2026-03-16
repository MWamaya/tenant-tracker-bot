import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export interface DashboardStats {
  totalHouses: number;
  occupiedHouses: number;
  vacantHouses: number;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  paidHouses: number;
  partialHouses: number;
  unpaidHouses: number;
}

export interface HouseBalance {
  houseId: string;
  houseNo: string;
  propertyId: string | null;
  propertyName: string | null;
  expectedRent: number;
  paidAmount: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  tenantId: string | null;
  tenantName: string | null;
  tenantPhone: string | null;
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const currentMonth = format(new Date(), 'yyyy-MM');

  return useQuery({
    queryKey: ['dashboard-stats', user?.id, currentMonth],
    queryFn: async () => {
      if (!user?.id) return null;
      return apiClient.get<{
        stats: DashboardStats;
        houseBalances: HouseBalance[];
        unpaidHouses: HouseBalance[];
        partialHouses: HouseBalance[];
        paidHouses: HouseBalance[];
      }>(`/api/dashboard?month=${currentMonth}`);
    },
    enabled: !!user?.id,
  });
};
