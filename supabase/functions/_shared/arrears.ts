// supabase/functions/_shared/arrears.ts
//
// Deno port of src/lib/arrears.ts. Kept as a verbatim copy rather than a
// shared module across the two runtimes (frontend bundler vs Deno) — see
// docs/superpowers/specs/2026-09-07-monthly-report-design.md for why.
// If you change the logic here, change it in src/lib/arrears.ts too (and
// vice versa) and keep both test suites in sync.

export type ArrearsStatus = 'paid' | 'partial' | 'unpaid';

export interface MonthlyStatementEntry {
  month: string; // 'yyyy-MM-01'
  expectedRent: number;
  paidAmount: number;
  balance: number;
  status: ArrearsStatus;
}

export interface ArrearsResult {
  totalExpected: number;
  totalPaid: number;
  arrears: number;
  status: ArrearsStatus;
  monthlyBreakdown: MonthlyStatementEntry[];
}

export interface ArrearsPayment {
  amount: number;
  payment_date: string;
}

const monthStartUTC = (dateStr: string): Date => {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

const monthKey = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;

const addMonths = (d: Date, n: number): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

export function computeArrears(
  occupancyDate: string | null,
  expectedRent: number,
  payments: ArrearsPayment[],
  asOfMonth?: string,
): ArrearsResult | null {
  if (!occupancyDate) return null;

  if (asOfMonth && !/^\d{4}-\d{2}$/.test(asOfMonth)) {
    throw new Error(`computeArrears: asOfMonth must be 'yyyy-MM', got "${asOfMonth}"`);
  }

  const start = monthStartUTC(occupancyDate);
  const now = new Date();
  const target = asOfMonth
    ? monthStartUTC(`${asOfMonth}-01`)
    : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  if (start.getTime() > target.getTime()) {
    return { totalExpected: 0, totalPaid: 0, arrears: 0, status: 'paid', monthlyBreakdown: [] };
  }

  const cutoff = addMonths(target, 1);

  const totalPaid = payments
    .filter((p) => {
      const t = new Date(p.payment_date).getTime();
      return t >= start.getTime() && t < cutoff.getTime();
    })
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const monthlyBreakdown: MonthlyStatementEntry[] = [];
  let remainingPool = totalPaid;
  let cursor = start;

  while (cursor.getTime() <= target.getTime()) {
    const due = expectedRent;
    let paidAmount = 0;
    let status: ArrearsStatus;

    if (due <= 0) {
      status = 'paid';
    } else if (remainingPool >= due) {
      paidAmount = due;
      status = 'paid';
      remainingPool -= due;
    } else if (remainingPool > 0) {
      paidAmount = remainingPool;
      status = 'partial';
      remainingPool = 0;
    } else {
      status = 'unpaid';
    }

    monthlyBreakdown.push({
      month: monthKey(cursor),
      expectedRent: due,
      paidAmount,
      balance: Math.max(0, due - paidAmount),
      status,
    });

    cursor = addMonths(cursor, 1);
  }

  const totalExpected = monthlyBreakdown.reduce((sum, m) => sum + m.expectedRent, 0);
  const arrears = totalExpected - totalPaid;

  let status: ArrearsStatus = 'unpaid';
  if (arrears <= 0) status = 'paid';
  else if (totalPaid > 0) status = 'partial';

  return { totalExpected, totalPaid, arrears, status, monthlyBreakdown };
}
