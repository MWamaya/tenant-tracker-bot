// supabase/functions/send-monthly-reports/report-data.ts
//
// Builds one landlord's rent report for a single target month
// ('yyyy-MM'). Pulls only that month's entry out of computeArrears's
// monthlyBreakdown — NOT its cumulative totalExpected/totalPaid/arrears,
// which are cumulative through the target month, not isolated to it.
//
// House occupancy for targetMonth is read from tenancy_periods, NOT from
// houses.status/occupancy_date (which only ever reflects the CURRENT
// tenant) or the live tenants table (whose row is deleted on move-out).
// Without this, a report for a past month would silently drop any house
// whose tenant has since moved out or been replaced.
import { computeArrears, ArrearsPayment } from '../_shared/arrears.ts';

interface TenancyPeriod {
  house_id: string;
  tenant_name: string;
  tenant_phone: string | null;
  start_date: string; // 'yyyy-MM-dd'
  end_date: string | null;
}

const monthBounds = (targetMonth: string): { start: string; end: string } => {
  const [year, month] = targetMonth.split('-').map(Number);
  const start = `${targetMonth}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0]; // last day of targetMonth
  return { start, end };
};

// Of the periods overlapping targetMonth for one house, pick whichever
// tenancy was active at the END of the month — the closest match to
// computeArrears's single-continuous-occupancy model when a house changed
// tenants mid-month.
function pickPeriodForMonth(periods: TenancyPeriod[], targetMonth: string): TenancyPeriod | null {
  const { start, end } = monthBounds(targetMonth);
  const overlapping = periods.filter(
    (p) => p.start_date <= end && (p.end_date === null || p.end_date >= start),
  );
  if (overlapping.length === 0) return null;
  return overlapping.reduce((latest, p) => (p.start_date > latest.start_date ? p : latest));
}

export interface ExpenseRow {
  category: string;
  description: string | null;
  amount: number;
  expenseDate: string; // 'yyyy-MM-dd'
  isRecurring: boolean;
}

// Mirrors the Expenses tab on the Reports page: real logged expenses for the
// month, plus a virtual row per active recurring template (e.g. caretaker
// salary) that applies to it.
async function fetchMonthExpenses(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  landlordId: string,
  targetMonth: string,
): Promise<ExpenseRow[]> {
  const [year, month] = targetMonth.split('-').map(Number); // month is 1-12
  const { start: from, end: to } = monthBounds(targetMonth);

  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('category, description, amount, expense_date')
    .eq('landlord_id', landlordId)
    .gte('expense_date', from)
    .lte('expense_date', to);
  if (expensesError) throw expensesError;

  const { data: recurring, error: recurringError } = await supabase
    .from('recurring_expenses')
    .select('category, description, amount, day_of_month, start_month, active')
    .eq('landlord_id', landlordId);
  if (recurringError) throw recurringError;

  const monthEnd = new Date(Date.UTC(year, month, 0)); // last day of targetMonth, UTC
  // deno-lint-ignore no-explicit-any
  const recurringRows: ExpenseRow[] = (recurring || [])
    .filter((r: any) => r.active)
    .filter((r: any) => !r.start_month || new Date(r.start_month).getTime() <= monthEnd.getTime())
    .map((r: any) => {
      const day = Math.min(Number(r.day_of_month) || 1, 28);
      return {
        category: r.category,
        description: r.description ?? null,
        amount: Number(r.amount),
        expenseDate: new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0],
        isRecurring: true,
      };
    });

  // deno-lint-ignore no-explicit-any
  const manualRows: ExpenseRow[] = (expenses || []).map((e: any) => ({
    category: e.category,
    description: e.description ?? null,
    amount: Number(e.amount),
    expenseDate: e.expense_date,
    isRecurring: false,
  }));

  return [...recurringRows, ...manualRows].sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));
}

export interface HouseReportRow {
  houseNo: string;
  tenantName: string | null;
  tenantPhone: string | null;
  expectedRent: number;
  paidAmount: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  // Unpaid balance from months strictly before targetMonth (0 if none).
  priorArrears: number;
  // priorArrears + balance — everything owed as of the END of targetMonth
  // (a frozen historical snapshot — doesn't reflect payments made later).
  totalOwed: number;
  // What's still owed right now (as of the tenancy's end, or today if it's
  // still ongoing) — lets a report for a past month show whether someone who
  // was behind back then has since caught up.
  currentBalance: number;
}

export interface LandlordReport {
  rows: HouseReportRow[];
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  expenses: ExpenseRow[];
  totalExpenses: number;
  netIncome: number; // totalCollected - totalExpenses
}

export async function buildLandlordReport(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  landlordId: string,
  targetMonth: string,
): Promise<LandlordReport> {
  const { data: houses, error: housesError } = await supabase
    .from('houses')
    .select('id, house_no, expected_rent')
    .eq('landlord_id', landlordId);
  if (housesError) throw housesError;

  const { data: periods, error: periodsError } = await supabase
    .from('tenancy_periods')
    .select('house_id, tenant_name, tenant_phone, start_date, end_date')
    .eq('landlord_id', landlordId);
  if (periodsError) throw periodsError;

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

  for (const house of houses || []) {
    const housePeriods: TenancyPeriod[] = (periods || []).filter((p: TenancyPeriod) => p.house_id === house.id);
    const period = pickPeriodForMonth(housePeriods, targetMonth);
    if (!period) continue; // no tenancy overlapped targetMonth for this house

    const housePayments: ArrearsPayment[] = payments
      .filter((p) => p.house_id === house.id)
      .map((p) => ({ amount: Number(p.amount), payment_date: p.payment_date }));

    const arrears = computeArrears(period.start_date, Number(house.expected_rent), housePayments, targetMonth);

    const monthEntry = arrears?.monthlyBreakdown.find((m) => m.month === targetMonthKey);
    if (!monthEntry) continue;

    // Unpaid balance from every month before targetMonth — each month's
    // balance is already floored at >=0, so this sum is the real unsettled
    // debt regardless of how the waterfall allocated later payments.
    const priorArrears = (arrears?.monthlyBreakdown ?? [])
      .filter((m) => m.month !== targetMonthKey)
      .reduce((s, m) => s + m.balance, 0);

    // Re-run the same tenancy through to its actual end (their last month
    // there, or today if they're still the tenant) instead of stopping at
    // targetMonth, so we can tell whether arrears from that month were later
    // cleared. Scoped to this tenancy's own window only — a later tenant's
    // payments in the same house never get credited to this one.
    const asOfNow = period.end_date ? period.end_date.slice(0, 7) : undefined;
    const currentArrears = computeArrears(period.start_date, Number(house.expected_rent), housePayments, asOfNow);
    const currentBalance = currentArrears ? Math.max(0, currentArrears.arrears) : 0;

    rows.push({
      houseNo: house.house_no,
      tenantName: period.tenant_name,
      tenantPhone: period.tenant_phone,
      expectedRent: monthEntry.expectedRent,
      paidAmount: monthEntry.paidAmount,
      balance: monthEntry.balance,
      status: monthEntry.status,
      priorArrears,
      totalOwed: priorArrears + monthEntry.balance,
      currentBalance,
    });
  }

  const expenses = await fetchMonthExpenses(supabase, landlordId, targetMonth);
  const totalCollected = rows.reduce((s, r) => s + r.paidAmount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return {
    rows,
    totalExpected: rows.reduce((s, r) => s + r.expectedRent, 0),
    totalCollected,
    totalOutstanding: rows.reduce((s, r) => s + r.balance, 0),
    paidCount: rows.filter((r) => r.status === 'paid').length,
    partialCount: rows.filter((r) => r.status === 'partial').length,
    unpaidCount: rows.filter((r) => r.status === 'unpaid').length,
    expenses,
    totalExpenses,
    netIncome: totalCollected - totalExpenses,
  };
}
