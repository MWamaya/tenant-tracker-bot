import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth } from 'date-fns';

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
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['dashboard-stats', user?.id, currentMonth],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch houses with property info
      const { data: houses, error: housesError } = await supabase
        .from('houses')
        .select(`
          id,
          house_no,
          expected_rent,
          status,
          property_id,
          properties (
            id,
            name
          )
        `)
        .eq('landlord_id', user.id);

      if (housesError) throw housesError;

      // Fetch tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, phone, house_id')
        .eq('landlord_id', user.id);

      if (tenantsError) throw tenantsError;

      // Fetch payments for current month
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, house_id')
        .eq('landlord_id', user.id)
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd);

      if (paymentsError) throw paymentsError;

      // Calculate stats
      const houseBalances: HouseBalance[] = houses.map(house => {
        const housePayments = payments.filter(p => p.house_id === house.id);
        const paidAmount = housePayments.reduce((sum, p) => sum + p.amount, 0);
        const balance = house.expected_rent - paidAmount;
        const tenant = tenants.find(t => t.house_id === house.id);
        
        let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if (paidAmount >= house.expected_rent) {
          status = 'paid';
        } else if (paidAmount > 0) {
          status = 'partial';
        }

        return {
          houseId: house.id,
          houseNo: house.house_no,
          propertyId: house.property_id,
          propertyName: house.properties?.name || null,
          expectedRent: house.expected_rent,
          paidAmount,
          balance: Math.max(0, balance),
          status,
          tenantId: tenant?.id || null,
          tenantName: tenant?.name || null,
          tenantPhone: tenant?.phone || null,
        };
      });

      const stats: DashboardStats = {
        totalHouses: houses.length,
        occupiedHouses: houses.filter(h => h.status === 'occupied').length,
        vacantHouses: houses.filter(h => h.status === 'vacant').length,
        totalExpected: houses.reduce((sum, h) => sum + h.expected_rent, 0),
        totalCollected: payments.reduce((sum, p) => sum + p.amount, 0),
        totalOutstanding: houseBalances.reduce((sum, h) => sum + h.balance, 0),
        paidHouses: houseBalances.filter(h => h.status === 'paid').length,
        partialHouses: houseBalances.filter(h => h.status === 'partial').length,
        unpaidHouses: houseBalances.filter(h => h.status === 'unpaid').length,
      };

      return {
        stats,
        houseBalances,
        unpaidHouses: houseBalances.filter(h => h.status === 'unpaid'),
        partialHouses: houseBalances.filter(h => h.status === 'partial'),
        paidHouses: houseBalances.filter(h => h.status === 'paid'),
      };
    },
    enabled: !!user?.id,
  });
};
