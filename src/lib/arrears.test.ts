import { describe, it, expect } from 'vitest';
import { computeArrears } from './arrears';

describe('computeArrears', () => {
  it('returns null for a vacant house (no occupancy date)', () => {
    expect(computeArrears(null, 5000, [])).toBeNull();
  });

  it('is fully paid every month with exact monthly payments', () => {
    const result = computeArrears(
      '2026-06-01',
      5000,
      [
        { amount: 5000, payment_date: '2026-06-05' },
        { amount: 5000, payment_date: '2026-07-05' },
        { amount: 5000, payment_date: '2026-08-05' },
      ],
      '2026-08',
    );
    expect(result?.arrears).toBe(0);
    expect(result?.status).toBe('paid');
    expect(result?.monthlyBreakdown).toHaveLength(3);
    expect(result?.monthlyBreakdown.every((m) => m.status === 'paid')).toBe(true);
  });

  it('reports a partial current-month payment with no prior arrears', () => {
    const result = computeArrears(
      '2026-08-01',
      5000,
      [{ amount: 2000, payment_date: '2026-08-10' }],
      '2026-08',
    );
    expect(result?.totalExpected).toBe(5000);
    expect(result?.totalPaid).toBe(2000);
    expect(result?.arrears).toBe(3000);
    expect(result?.status).toBe('partial');
    expect(result?.monthlyBreakdown).toEqual([
      { month: '2026-08-01', expectedRent: 5000, paidAmount: 2000, balance: 3000, status: 'partial', refs: [] },
    ]);
  });

  it('accumulates pure arrears across multiple unpaid months', () => {
    const result = computeArrears('2026-06-01', 5000, [], '2026-08');
    expect(result?.totalExpected).toBe(15000);
    expect(result?.totalPaid).toBe(0);
    expect(result?.arrears).toBe(15000);
    expect(result?.status).toBe('unpaid');
    expect(result?.monthlyBreakdown.map((m) => m.status)).toEqual(['unpaid', 'unpaid', 'unpaid']);
  });

  it('settles a lump sum across exactly N unpaid months with nothing left over', () => {
    const result = computeArrears(
      '2026-06-01',
      5000,
      [{ amount: 15000, payment_date: '2026-08-20' }],
      '2026-08',
    );
    expect(result?.arrears).toBe(0);
    expect(result?.status).toBe('paid');
    expect(result?.monthlyBreakdown.every((m) => m.status === 'paid')).toBe(true);
  });

  it('settles all arrears and leaves an overpayment credit as negative arrears', () => {
    const result = computeArrears(
      '2026-06-01',
      5000,
      [{ amount: 18000, payment_date: '2026-08-20' }],
      '2026-08',
    );
    expect(result?.totalExpected).toBe(15000);
    expect(result?.totalPaid).toBe(18000);
    expect(result?.arrears).toBe(-3000);
    expect(result?.status).toBe('paid');
    expect(result?.monthlyBreakdown.every((m) => m.status === 'paid')).toBe(true);
  });

  it('settles the oldest months fully and leaves a partial + unpaid tail when the lump sum is too small', () => {
    const result = computeArrears(
      '2026-06-01',
      5000,
      [{ amount: 7000, payment_date: '2026-08-20' }],
      '2026-08',
    );
    expect(result?.arrears).toBe(8000);
    expect(result?.status).toBe('partial');
    expect(result?.monthlyBreakdown).toEqual([
      { month: '2026-06-01', expectedRent: 5000, paidAmount: 5000, balance: 0, status: 'paid', refs: [] },
      { month: '2026-07-01', expectedRent: 5000, paidAmount: 2000, balance: 3000, status: 'partial', refs: [] },
      { month: '2026-08-01', expectedRent: 5000, paidAmount: 0, balance: 5000, status: 'unpaid', refs: [] },
    ]);
  });

  it('shows a single unpaid month for a tenant who moved in this month with no payment yet', () => {
    const result = computeArrears('2026-08-01', 5000, [], '2026-08');
    expect(result?.monthlyBreakdown).toHaveLength(1);
    expect(result?.arrears).toBe(5000);
  });

  it('ignores payments made after asOfMonth for a point-in-time snapshot', () => {
    const result = computeArrears(
      '2026-06-01',
      5000,
      [
        { amount: 5000, payment_date: '2026-06-05' },
        { amount: 5000, payment_date: '2026-09-05' }, // after the snapshot month
      ],
      '2026-07',
    );
    expect(result?.monthlyBreakdown).toHaveLength(2);
    expect(result?.totalPaid).toBe(5000);
    expect(result?.arrears).toBe(5000);
  });

  it('is always paid with zero arrears when expectedRent is 0, regardless of payments', () => {
    const result = computeArrears('2026-06-01', 0, [], '2026-08');
    expect(result?.totalExpected).toBe(0);
    expect(result?.arrears).toBe(0);
    expect(result?.status).toBe('paid');
    expect(result?.monthlyBreakdown.every((m) => m.status === 'paid')).toBe(true);
  });

  it('includes a payment made earlier in the same month as a mid-month occupancy date', () => {
    const result = computeArrears(
      '2026-08-15',
      5000,
      [{ amount: 5000, payment_date: '2026-08-03' }],
      '2026-08',
    );
    expect(result?.totalPaid).toBe(5000);
    expect(result?.arrears).toBe(0);
    expect(result?.status).toBe('paid');
  });

  it('returns the all-zero early-return result when asOfMonth is before occupancyDate', () => {
    const result = computeArrears('2026-09-01', 5000, [], '2026-08');
    expect(result).toEqual({
      totalExpected: 0,
      totalPaid: 0,
      arrears: 0,
      status: 'paid',
      monthlyBreakdown: [],
    });
  });

  it('sums two payments landing in the same month into that month pool', () => {
    const result = computeArrears(
      '2026-08-01',
      5000,
      [
        { amount: 2000, payment_date: '2026-08-03' },
        { amount: 3000, payment_date: '2026-08-20' },
      ],
      '2026-08',
    );
    expect(result?.totalPaid).toBe(5000);
    expect(result?.arrears).toBe(0);
    expect(result?.status).toBe('paid');
  });

  it('attributes a single payment\'s ref to the month it fully covers', () => {
    const result = computeArrears(
      '2026-08-01',
      5000,
      [{ amount: 5000, payment_date: '2026-08-05', mpesaRef: 'ABC123' }],
      '2026-08',
    );
    expect(result?.monthlyBreakdown[0].refs).toEqual(['ABC123']);
  });

  it('lists every ref that contributed to a month funded by multiple payments', () => {
    const result = computeArrears(
      '2026-08-01',
      5000,
      [
        { amount: 2000, payment_date: '2026-08-03', mpesaRef: 'REF1' },
        { amount: 3000, payment_date: '2026-08-20', mpesaRef: 'REF2' },
      ],
      '2026-08',
    );
    expect(result?.monthlyBreakdown[0].refs).toEqual(['REF1', 'REF2']);
  });

  it('spreads one lump-sum payment\'s ref across every month it settles', () => {
    const result = computeArrears(
      '2026-06-01',
      5000,
      [{ amount: 15000, payment_date: '2026-08-20', mpesaRef: 'LUMP1' }],
      '2026-08',
    );
    expect(result?.monthlyBreakdown.map((m) => m.refs)).toEqual([['LUMP1'], ['LUMP1'], ['LUMP1']]);
  });

  it('leaves refs empty for an unpaid month', () => {
    const result = computeArrears('2026-06-01', 5000, [], '2026-08');
    expect(result?.monthlyBreakdown.every((m) => m.refs.length === 0)).toBe(true);
  });
});
