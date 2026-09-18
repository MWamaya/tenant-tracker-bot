// supabase/functions/send-monthly-reports/report-data.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildLandlordReport } from './report-data.ts';

function createMockSupabase(queues: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: async () => {
          const q = queues[table];
          const value = q && q.length ? q.shift() : [];
          return { data: value, error: null };
        },
      };
      // houses/tenants queries don't call .range(), only payments does —
      // give them a maybeSingle-less resolved-array shape by making the
      // chain itself awaitable for those two tables.
      if (table !== 'payments') {
        chain.then = (resolve: any) => {
          const q = queues[table];
          const value = q && q.length ? q.shift() : [];
          resolve({ data: value, error: null });
        };
      }
      return chain;
    },
  };
}

Deno.test('buildLandlordReport: builds one row per house using only the target month\'s breakdown entry', async () => {
  const supabase = createMockSupabase({
    houses: [[
      { id: 'h1', house_no: 'A1', expected_rent: 5000, status: 'occupied', occupancy_date: '2026-06-01' },
    ]],
    tenants: [[{ id: 't1', name: 'Jane Doe', phone: '0700000000', house_id: 'h1' }]],
    payments: [
      [
        { amount: 5000, house_id: 'h1', payment_date: '2026-06-05' },
        { amount: 5000, house_id: 'h1', payment_date: '2026-07-05' },
      ],
      [], // second .range() page: empty, ends pagination
    ],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.rows.length, 1);
  assertEquals(report.rows[0], {
    houseNo: 'A1',
    tenantName: 'Jane Doe',
    tenantPhone: '0700000000',
    expectedRent: 5000,
    paidAmount: 5000,
    balance: 0,
    status: 'paid',
    priorArrears: 0,
    totalOwed: 0,
  });
  assertEquals(report.totalExpected, 5000);
  assertEquals(report.totalCollected, 5000);
  assertEquals(report.totalOutstanding, 0);
  assertEquals(report.paidCount, 1);
  assertEquals(report.partialCount, 0);
  assertEquals(report.unpaidCount, 0);
});

Deno.test('buildLandlordReport: excludes a house that had no tenancy during the target month', async () => {
  const supabase = createMockSupabase({
    houses: [[
      { id: 'h1', house_no: 'A1', expected_rent: 5000, status: 'occupied', occupancy_date: '2026-08-01' },
    ]],
    tenants: [[]],
    payments: [[], []],
  });

  // Target month (July) is before the house's occupancy_date (August) —
  // computeArrears's early-return gives an empty monthlyBreakdown, so
  // there's no July entry to report.
  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.rows.length, 0);
});

Deno.test('buildLandlordReport: excludes a vacant house entirely', async () => {
  const supabase = createMockSupabase({
    houses: [[
      { id: 'h1', house_no: 'A1', expected_rent: 5000, status: 'vacant', occupancy_date: null },
    ]],
    tenants: [[]],
    payments: [[], []],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.rows.length, 0);
});

Deno.test('buildLandlordReport: reflects an unpaid month correctly', async () => {
  const supabase = createMockSupabase({
    houses: [[
      { id: 'h1', house_no: 'B2', expected_rent: 3500, status: 'occupied', occupancy_date: '2026-06-01' },
    ]],
    tenants: [[{ id: 't2', name: 'John Roe', phone: '0711111111', house_id: 'h1' }]],
    payments: [[], []],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.rows[0].status, 'unpaid');
  assertEquals(report.rows[0].paidAmount, 0);
  assertEquals(report.rows[0].balance, 3500);
  assertEquals(report.unpaidCount, 1);
});

Deno.test('buildLandlordReport: surfaces prior-month arrears on top of the target month\'s own balance', async () => {
  const supabase = createMockSupabase({
    houses: [[
      { id: 'h1', house_no: 'C3', expected_rent: 5000, status: 'occupied', occupancy_date: '2026-05-01' },
    ]],
    tenants: [[{ id: 't3', name: 'Amina Otieno', phone: '0722222222', house_id: 'h1' }]],
    payments: [
      // May (5000 due) paid in full; June (5000 due) gets a 2000 partial
      // payment; July (5000 due, the target month) gets nothing — the
      // waterfall applies this single lump sum oldest-first.
      [{ amount: 7000, house_id: 'h1', payment_date: '2026-07-05' }],
      [],
    ],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.rows[0].status, 'unpaid');
  assertEquals(report.rows[0].balance, 5000); // July's own unpaid balance
  assertEquals(report.rows[0].priorArrears, 3000); // June's unpaid remainder (May is fully paid)
  assertEquals(report.rows[0].totalOwed, 8000);
});
