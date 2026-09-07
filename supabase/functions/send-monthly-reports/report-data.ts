// supabase/functions/send-monthly-reports/report-data.ts
//
// Builds one landlord's rent report for a single target month
// ('yyyy-MM'). Pulls only that month's entry out of computeArrears's
// monthlyBreakdown — NOT its cumulative totalExpected/totalPaid/arrears,
// which are cumulative through the target month, not isolated to it.
import { computeArrears, ArrearsPayment } from '../_shared/arrears.ts';

export interface HouseReportRow {
  houseNo: string;
  tenantName: string | null;
  tenantPhone: string | null;
  expectedRent: number;
  paidAmount: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
}

export interface LandlordReport {
  rows: HouseReportRow[];
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

export async function buildLandlordReport(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  landlordId: string,
  targetMonth: string,
): Promise<LandlordReport> {
  const { data: houses, error: housesError } = await supabase
    .from('houses')
    .select('id, house_no, expected_rent, status, occupancy_date')
    .eq('landlord_id', landlordId);
  if (housesError) throw housesError;

  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, phone, house_id')
    .eq('landlord_id', landlordId);
  if (tenantsError) throw tenantsError;

  const pageSize = 1000;
  let from = 0;
  const payments: { amount: number; house_id: string | null; payment_date: string }[] = [];
  while (true) {
    const { data: page, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, house_id, payment_date')
      .eq('landlord_id', landlordId)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (paymentsError) throw paymentsError;
    payments.push(...(page || []));
    if (!page || page.length < pageSize) break;
    from += pageSize;
  }

  const targetMonthKey = `${targetMonth}-01`;
  const rows: HouseReportRow[] = [];

  // Known limitation: this gates on the house's CURRENT status/occupancy_date,
  // not its status during targetMonth. A house that was occupied throughout
  // targetMonth but has since been marked vacant (occupancy_date nulled on
  // move-out — see useTenants.ts) will be silently excluded from this
  // historical report, even though it may have been a defaulter that month.
  // A real fix needs a tenancy-history table; not attempted here.
  for (const house of houses || []) {
    const housePayments: ArrearsPayment[] = payments
      .filter((p) => p.house_id === house.id)
      .map((p) => ({ amount: Number(p.amount), payment_date: p.payment_date }));

    const arrears = computeArrears(
      house.status === 'occupied' ? house.occupancy_date : null,
      Number(house.expected_rent),
      housePayments,
      targetMonth,
    );

    const monthEntry = arrears?.monthlyBreakdown.find((m) => m.month === targetMonthKey);
    if (!monthEntry) continue; // vacant, or no tenancy yet during targetMonth

    // deno-lint-ignore no-explicit-any
    const tenant = (tenants || []).find((t: any) => t.house_id === house.id);

    rows.push({
      houseNo: house.house_no,
      tenantName: tenant?.name ?? null,
      tenantPhone: tenant?.phone ?? null,
      expectedRent: monthEntry.expectedRent,
      paidAmount: monthEntry.paidAmount,
      balance: monthEntry.balance,
      status: monthEntry.status,
    });
  }

  return {
    rows,
    totalExpected: rows.reduce((s, r) => s + r.expectedRent, 0),
    totalCollected: rows.reduce((s, r) => s + r.paidAmount, 0),
    totalOutstanding: rows.reduce((s, r) => s + r.balance, 0),
    paidCount: rows.filter((r) => r.status === 'paid').length,
    partialCount: rows.filter((r) => r.status === 'partial').length,
    unpaidCount: rows.filter((r) => r.status === 'unpaid').length,
  };
}
