import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveLandlordId } from '@/hooks/useImpersonation';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

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

export const useDashboardStats = (month?: string) => {
  const landlordId = useEffectiveLandlordId();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const targetMonth = month || currentMonth;
  // Anchor to the first day of the selected month in local time
  const monthAnchor = new Date(`${targetMonth}-01T00:00:00`);
  // Use full ISO timestamps so the month range respects the user's local timezone.
  const monthStart = startOfMonth(monthAnchor).toISOString();
  const monthEnd = endOfMonth(monthAnchor).toISOString();
  const prevMonthStart = startOfMonth(subMonths(monthAnchor, 1)).toISOString();
  const prevMonthEnd = endOfMonth(subMonths(monthAnchor, 1)).toISOString();

  return useQuery({
    queryKey: ['dashboard-stats', landlordId, targetMonth],
    queryFn: async () => {
      if (!landlordId) return null;

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
        .eq('landlord_id', landlordId);

      if (housesError) throw housesError;

      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, phone, house_id')
        .eq('landlord_id', landlordId);

      if (tenantsError) throw tenantsError;

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, house_id')
        .eq('landlord_id', landlordId)
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd);

      if (paymentsError) throw paymentsError;

      const { data: prevPayments, error: prevPaymentsError } = await supabase
        .from('payments')
        .select('id, amount, house_id')
        .eq('landlord_id', landlordId)
        .gte('payment_date', prevMonthStart)
        .lte('payment_date', prevMonthEnd);

      if (prevPaymentsError) throw prevPaymentsError;

      const houseBalances: HouseBalance[] = houses.map(house => {
        const housePayments = payments.filter(p => p.house_id === house.id);
        const currentPaid = housePayments.reduce((sum, p) => sum + p.amount, 0);

        // Carry-forward: previous month's overpayment rolls into this month
        const prevHousePayments = prevPayments.filter(p => p.house_id === house.id);
        const prevPaid = prevHousePayments.reduce((sum, p) => sum + p.amount, 0);
        const carryForward = Math.max(0, prevPaid - house.expected_rent);

        const paidAmount = currentPaid + carryForward;
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
        totalCollected: houseBalances.reduce((sum, h) => sum + h.paidAmount, 0),
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
    enabled: !!landlordId,
  });
};
