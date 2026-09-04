// src/lib/arrears.ts

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

/**
 * Computes cumulative rent arrears for one house from its occupancy_date
 * through asOfMonth (defaulting to the current month). All payments ever
 * recorded for the house are pooled into one total and applied to months
 * oldest-first: a lump sum clears the oldest unpaid months before touching
 * newer ones. Leftover pool after the last month becomes negative arrears
 * (a credit). Returns null when occupancyDate is null (vacant house).
 */
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

  // Exclusive upper bound: start of the month after the target month, so a
  // point-in-time snapshot (asOfMonth in the past) ignores later payments.
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
