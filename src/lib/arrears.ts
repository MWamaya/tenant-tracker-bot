// src/lib/arrears.ts

export type ArrearsStatus = 'paid' | 'partial' | 'unpaid';

export interface MonthlyPaymentContribution {
  date: string; // payment_date of the source payment
  amount: number; // portion of that payment drawn into this month
  ref?: string;
  paymentTotal: number; // full amount of the source payment (> amount when it's split across months)
}

export interface MonthlyStatementEntry {
  month: string; // 'yyyy-MM-01'
  expectedRent: number;
  paidAmount: number;
  balance: number;
  status: ArrearsStatus;
  refs: string[]; // mpesaRefs of payments that funded this month, in application order
  payments: MonthlyPaymentContribution[]; // per-payment breakdown, in application order
  receivedThisMonth: number; // total of any real payments dated within this calendar month, regardless of which months they settled
}

export interface ArrearsResult {
  totalExpected: number;
  totalPaid: number;
  arrears: number;
  status: ArrearsStatus;
  monthlyBreakdown: MonthlyStatementEntry[];
  futureCredit: MonthlyStatementEntry[]; // months after asOfMonth pre-paid from leftover credit
}

export interface ArrearsPayment {
  amount: number;
  payment_date: string;
  mpesaRef?: string;
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
    return { totalExpected: 0, totalPaid: 0, arrears: 0, status: 'paid', monthlyBreakdown: [], futureCredit: [] };
  }

  // Exclusive upper bound: start of the month after the target month, so a
  // point-in-time snapshot (asOfMonth in the past) ignores later payments.
  const cutoff = addMonths(target, 1);

  const relevantPayments = payments.filter((p) => {
    const t = new Date(p.payment_date).getTime();
    return t >= start.getTime() && t < cutoff.getTime();
  });

  const totalPaid = relevantPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Total actually received in each calendar month, keyed by that month —
  // used to show the real payment amount on the month it happened in,
  // separate from paidAmount (the portion applied to that month's rent).
  const receivedByMonth = new Map<string, number>();
  for (const p of relevantPayments) {
    const key = monthKey(monthStartUTC(p.payment_date));
    receivedByMonth.set(key, (receivedByMonth.get(key) ?? 0) + Number(p.amount));
  }

  // FIFO queue of payments (earliest first) to draw down per month, so refs
  // attribute to the same months the pooled total already settles.
  const pool = relevantPayments
    .slice()
    .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
    .map((p) => ({ remaining: Number(p.amount), total: Number(p.amount), ref: p.mpesaRef, date: p.payment_date }));

  const monthlyBreakdown: MonthlyStatementEntry[] = [];
  let cursor = start;

  while (cursor.getTime() <= target.getTime()) {
    const due = expectedRent;
    let paidAmount = 0;
    let needed = due > 0 ? due : 0;
    const refs: string[] = [];
    const monthPayments: MonthlyPaymentContribution[] = [];
    let status: ArrearsStatus;

    if (due <= 0) {
      status = 'paid';
    } else {
      for (const entry of pool) {
        if (needed <= 0) break;
        if (entry.remaining <= 0) continue;
        const drawn = Math.min(entry.remaining, needed);
        entry.remaining -= drawn;
        needed -= drawn;
        paidAmount += drawn;
        if (entry.ref && !refs.includes(entry.ref)) refs.push(entry.ref);
        monthPayments.push({ date: entry.date, amount: drawn, ref: entry.ref, paymentTotal: entry.total });
      }
      status = paidAmount >= due ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
    }

    monthlyBreakdown.push({
      month: monthKey(cursor),
      expectedRent: due,
      paidAmount,
      balance: Math.max(0, due - paidAmount),
      status,
      refs,
      payments: monthPayments,
      receivedThisMonth: receivedByMonth.get(monthKey(cursor)) ?? 0,
    });

    cursor = addMonths(cursor, 1);
  }

  const totalExpected = monthlyBreakdown.reduce((sum, m) => sum + m.expectedRent, 0);
  const arrears = totalExpected - totalPaid;

  let status: ArrearsStatus = 'unpaid';
  if (arrears <= 0) status = 'paid';
  else if (totalPaid > 0) status = 'partial';

  // Any leftover pool after the target month is a credit: project it forward
  // onto the months it actually prepays, so "Ksh 30,000 today" can be shown
  // as this month's rent plus next month's (or more), not just a lump sum.
  const futureCredit: MonthlyStatementEntry[] = [];
  if (expectedRent > 0) {
    const maxFutureMonths = 24; // safety cap against runaway credit balances
    let futureCursor = addMonths(target, 1);
    for (let i = 0; i < maxFutureMonths; i++) {
      if (!pool.some((entry) => entry.remaining > 0)) break;

      const due = expectedRent;
      let paidAmount = 0;
      let needed = due;
      const refs: string[] = [];
      const monthPayments: MonthlyPaymentContribution[] = [];

      for (const entry of pool) {
        if (needed <= 0) break;
        if (entry.remaining <= 0) continue;
        const drawn = Math.min(entry.remaining, needed);
        entry.remaining -= drawn;
        needed -= drawn;
        paidAmount += drawn;
        if (entry.ref && !refs.includes(entry.ref)) refs.push(entry.ref);
        monthPayments.push({ date: entry.date, amount: drawn, ref: entry.ref, paymentTotal: entry.total });
      }

      if (paidAmount <= 0) break;

      futureCredit.push({
        month: monthKey(futureCursor),
        expectedRent: due,
        paidAmount,
        balance: Math.max(0, due - paidAmount),
        status: paidAmount >= due ? 'paid' : 'partial',
        refs,
        payments: monthPayments,
        receivedThisMonth: 0, // future months, by construction, hold no payments dated within them
      });

      futureCursor = addMonths(futureCursor, 1);
    }
  }

  return { totalExpected, totalPaid, arrears, status, monthlyBreakdown, futureCredit };
}
