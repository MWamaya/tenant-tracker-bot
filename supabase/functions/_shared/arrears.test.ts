// supabase/functions/_shared/arrears.test.ts
import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { computeArrears } from './arrears.ts';

Deno.test('computeArrears: returns null for a vacant house (no occupancy date)', () => {
  assertEquals(computeArrears(null, 5000, []), null);
});

Deno.test('computeArrears: fully paid every month with exact monthly payments', () => {
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
  assertEquals(result?.arrears, 0);
  assertEquals(result?.status, 'paid');
  assertEquals(result?.monthlyBreakdown.length, 3);
  assertEquals(result?.monthlyBreakdown.every((m) => m.status === 'paid'), true);
});

Deno.test('computeArrears: reports a partial current-month payment with no prior arrears', () => {
  const result = computeArrears(
    '2026-08-01',
    5000,
    [{ amount: 2000, payment_date: '2026-08-10' }],
    '2026-08',
  );
  assertEquals(result?.totalExpected, 5000);
  assertEquals(result?.totalPaid, 2000);
  assertEquals(result?.arrears, 3000);
  assertEquals(result?.status, 'partial');
  assertEquals(result?.monthlyBreakdown, [
    { month: '2026-08-01', expectedRent: 5000, paidAmount: 2000, balance: 3000, status: 'partial' },
  ]);
});

Deno.test('computeArrears: accumulates pure arrears across multiple unpaid months', () => {
  const result = computeArrears('2026-06-01', 5000, [], '2026-08');
  assertEquals(result?.totalExpected, 15000);
  assertEquals(result?.totalPaid, 0);
  assertEquals(result?.arrears, 15000);
  assertEquals(result?.status, 'unpaid');
  assertEquals(result?.monthlyBreakdown.map((m) => m.status), ['unpaid', 'unpaid', 'unpaid']);
});

Deno.test('computeArrears: settles a lump sum across exactly N unpaid months with nothing left over', () => {
  const result = computeArrears(
    '2026-06-01',
    5000,
    [{ amount: 15000, payment_date: '2026-08-20' }],
    '2026-08',
  );
  assertEquals(result?.arrears, 0);
  assertEquals(result?.status, 'paid');
  assertEquals(result?.monthlyBreakdown.every((m) => m.status === 'paid'), true);
});

Deno.test('computeArrears: settles all arrears and leaves an overpayment credit as negative arrears', () => {
  const result = computeArrears(
    '2026-06-01',
    5000,
    [{ amount: 18000, payment_date: '2026-08-20' }],
    '2026-08',
  );
  assertEquals(result?.totalExpected, 15000);
  assertEquals(result?.totalPaid, 18000);
  assertEquals(result?.arrears, -3000);
  assertEquals(result?.status, 'paid');
  assertEquals(result?.monthlyBreakdown.every((m) => m.status === 'paid'), true);
});

Deno.test('computeArrears: settles the oldest months fully and leaves a partial + unpaid tail when the lump sum is too small', () => {
  const result = computeArrears(
    '2026-06-01',
    5000,
    [{ amount: 7000, payment_date: '2026-08-20' }],
    '2026-08',
  );
  assertEquals(result?.arrears, 8000);
  assertEquals(result?.status, 'partial');
  assertEquals(result?.monthlyBreakdown, [
    { month: '2026-06-01', expectedRent: 5000, paidAmount: 5000, balance: 0, status: 'paid' },
    { month: '2026-07-01', expectedRent: 5000, paidAmount: 2000, balance: 3000, status: 'partial' },
    { month: '2026-08-01', expectedRent: 5000, paidAmount: 0, balance: 5000, status: 'unpaid' },
  ]);
});

Deno.test('computeArrears: shows a single unpaid month for a tenant who moved in this month with no payment yet', () => {
  const result = computeArrears('2026-08-01', 5000, [], '2026-08');
  assertEquals(result?.monthlyBreakdown.length, 1);
  assertEquals(result?.arrears, 5000);
});

Deno.test('computeArrears: ignores payments made after asOfMonth for a point-in-time snapshot', () => {
  const result = computeArrears(
    '2026-06-01',
    5000,
    [
      { amount: 5000, payment_date: '2026-06-05' },
      { amount: 5000, payment_date: '2026-09-05' },
    ],
    '2026-07',
  );
  assertEquals(result?.monthlyBreakdown.length, 2);
  assertEquals(result?.totalPaid, 5000);
  assertEquals(result?.arrears, 5000);
});

Deno.test('computeArrears: a zero-rent house is always paid regardless of payments', () => {
  const result = computeArrears('2026-06-01', 0, [], '2026-08');
  assertEquals(result?.arrears, 0);
  assertEquals(result?.status, 'paid');
  assertEquals(result?.monthlyBreakdown.every((m) => m.status === 'paid'), true);
});

Deno.test('computeArrears: includes a payment made earlier in the same month as a mid-month move-in', () => {
  const result = computeArrears(
    '2026-08-15',
    5000,
    [{ amount: 5000, payment_date: '2026-08-03' }],
    '2026-08',
  );
  assertEquals(result?.totalPaid, 5000);
  assertEquals(result?.arrears, 0);
  assertEquals(result?.status, 'paid');
});

Deno.test('computeArrears: asOfMonth before occupancyDate returns the empty early-return result', () => {
  const result = computeArrears('2026-09-01', 5000, [], '2026-08');
  assertEquals(result, {
    totalExpected: 0,
    totalPaid: 0,
    arrears: 0,
    status: 'paid',
    monthlyBreakdown: [],
  });
});

Deno.test('computeArrears: sums multiple payments landing in the same month', () => {
  const result = computeArrears(
    '2026-08-01',
    5000,
    [
      { amount: 2000, payment_date: '2026-08-03' },
      { amount: 3000, payment_date: '2026-08-20' },
    ],
    '2026-08',
  );
  assertEquals(result?.totalPaid, 5000);
  assertEquals(result?.arrears, 0);
  assertEquals(result?.status, 'paid');
});

Deno.test('computeArrears: throws on a malformed asOfMonth instead of failing silently', () => {
  assertThrows(
    () => computeArrears('2026-06-01', 5000, [], '2026-08-01'),
    Error,
    "asOfMonth must be 'yyyy-MM'",
  );
});
