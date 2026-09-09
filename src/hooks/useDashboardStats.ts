import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveLandlordId } from '@/hooks/useImpersonation';
import { format } from 'date-fns';
import { computeArrears } from '@/lib/arrears';

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
          occupancy_date,
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

      const pageSize = 1000;
      let paymentsFrom = 0;
      const payments: { amount: number; house_id: string | null; payment_date: string }[] = [];

      while (true) {
        const { data: paymentsPage, error: paymentsError } = await supabase
          .from('payments')
          .select('amount, house_id, payment_date')
          .eq('landlord_id', landlordId)
          .range(paymentsFrom, paymentsFrom + pageSize - 1);

        if (paymentsError) throw paymentsError;

        payments.push(...(paymentsPage || []));

        if (!paymentsPage || paymentsPage.length < pageSize) break;
        paymentsFrom += pageSize;
      }

      const houseBalances: HouseBalance[] = houses.map((house) => {
        const housePayments = (payments || [])
          .filter((p) => p.house_id === house.id)
          .map((p) => ({ amount: Number(p.amount), payment_date: p.payment_date }));

        const arrears = computeArrears(
          house.status === 'occupied' ? house.occupancy_date : null,
          Number(house.expected_rent),
          housePayments,
          targetMonth,
        );
        // Dashboard/Reports show this month's activity, not the cumulative
        // total since move-in — pull out just the matching month's entry
        // (same technique the monthly-report PDF uses) rather than
        // arrears.totalExpected/totalPaid/arrears, which are cumulative.
        const monthEntry = arrears?.monthlyBreakdown.find((m) => m.month === `${targetMonth}-01`);

        const tenant = tenants.find((t) => t.house_id === house.id);

        return {
          houseId: house.id,
          houseNo: house.house_no,
          propertyId: house.property_id,
          propertyName: house.properties?.name || null,
          expectedRent: monthEntry?.expectedRent ?? 0,
          paidAmount: monthEntry?.paidAmount ?? 0,
          balance: monthEntry?.balance ?? 0,
          status: monthEntry?.status ?? 'paid',
          tenantId: tenant?.id || null,
          tenantName: tenant?.name || null,
          tenantPhone: tenant?.phone || null,
        };
      });

      const stats: DashboardStats = {
        totalHouses: houses.length,
        occupiedHouses: houses.filter((h) => h.status === 'occupied').length,
        vacantHouses: houses.filter((h) => h.status === 'vacant').length,
        totalExpected: houseBalances.reduce((sum, h) => sum + h.expectedRent, 0),
        totalCollected: houseBalances.reduce((sum, h) => sum + h.paidAmount, 0),
        totalOutstanding: houseBalances.reduce((sum, h) => sum + h.balance, 0),
        paidHouses: houseBalances.filter((h) => h.status === 'paid').length,
        partialHouses: houseBalances.filter((h) => h.status === 'partial').length,
        unpaidHouses: houseBalances.filter((h) => h.status === 'unpaid').length,
      };

      return {
        stats,
        houseBalances,
        unpaidHouses: houseBalances.filter((h) => h.status === 'unpaid'),
        partialHouses: houseBalances.filter((h) => h.status === 'partial'),
        paidHouses: houseBalances.filter((h) => h.status === 'paid'),
      };
    },
    enabled: !!landlordId,
  });
};
