// supabase/functions/send-monthly-reports/report-data.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildLandlordReport } from './report-data.ts';

function createMockSupabase(queues: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        neq: () => chain,
        order: () => chain,
        gte: () => chain,
        lte: () => chain,
        range: async () => {
          const q = queues[table];
          const value = q && q.length ? q.shift() : [];
          return { data: value, error: null };
        },
      };
      // houses/tenancy_periods queries don't call .range(), only payments
      // does — give them a maybeSingle-less resolved-array shape by making
      // the chain itself awaitable for those two tables.
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
    houses: [[{ id: 'h1', house_no: 'A1', expected_rent: 5000 }]],
    // Ended right after July so currentBalance below is deterministic
    // (bounded by end_date) instead of drifting with the real wall-clock date.
    tenancy_periods: [[
      { house_id: 'h1', tenant_name: 'Jane Doe', tenant_phone: '0700000000', start_date: '2026-06-01', end_date: '2026-07-31' },
    ]],
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
    currentBalance: 0,
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
    houses: [[{ id: 'h1', house_no: 'A1', expected_rent: 5000 }]],
    tenancy_periods: [[
      { house_id: 'h1', tenant_name: 'Someone', tenant_phone: null, start_date: '2026-08-01', end_date: null },
    ]],
    payments: [[], []],
  });

  // Target month (July) is before the tenancy's start_date (August) — no
  // period overlaps July, so there's nothing to report for this house.
  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.rows.length, 0);
});

Deno.test('buildLandlordReport: excludes a vacant house entirely', async () => {
  const supabase = createMockSupabase({
    houses: [[{ id: 'h1', house_no: 'A1', expected_rent: 5000 }]],
    tenancy_periods: [[]],
    payments: [[], []],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.rows.length, 0);
});

Deno.test('buildLandlordReport: reflects an unpaid month correctly', async () => {
  const supabase = createMockSupabase({
    houses: [[{ id: 'h1', house_no: 'B2', expected_rent: 3500 }]],
    tenancy_periods: [[
      { house_id: 'h1', tenant_name: 'John Roe', tenant_phone: '0711111111', start_date: '2026-06-01', end_date: null },
    ]],
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
    houses: [[{ id: 'h1', house_no: 'C3', expected_rent: 5000 }]],
    tenancy_periods: [[
      { house_id: 'h1', tenant_name: 'Amina Otieno', tenant_phone: '0722222222', start_date: '2026-05-01', end_date: null },
    ]],
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

Deno.test('buildLandlordReport: still reports a house whose tenant has since moved out, using the snapshotted name/phone', async () => {
  const supabase = createMockSupabase({
    houses: [[{ id: 'h1', house_no: 'D4', expected_rent: 4000 }]],
    tenancy_periods: [[
      // Tenant occupied from July, then moved out in August (end_date set).
      // The tenants row itself is gone by now — only this snapshot remains.
      { house_id: 'h1', tenant_name: 'Peter Kamau', tenant_phone: '0733333333', start_date: '2026-07-01', end_date: '2026-08-01' },
    ]],
    payments: [[{ amount: 4000, house_id: 'h1', payment_date: '2026-07-03' }], []],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.rows.length, 1);
  assertEquals(report.rows[0].tenantName, 'Peter Kamau');
  assertEquals(report.rows[0].tenantPhone, '0733333333');
  assertEquals(report.rows[0].status, 'paid');
});

Deno.test('buildLandlordReport: combines manual and active recurring expenses for the target month, and computes net income', async () => {
  const supabase = createMockSupabase({
    houses: [[{ id: 'h1', house_no: 'A1', expected_rent: 5000 }]],
    tenancy_periods: [[
      { house_id: 'h1', tenant_name: 'Jane Doe', tenant_phone: '0700000000', start_date: '2026-07-01', end_date: null },
    ]],
    payments: [[{ amount: 5000, house_id: 'h1', payment_date: '2026-07-05' }], []],
    expenses: [[
      { category: 'Repairs', description: 'Fixed leaking pipe', amount: 1500, expense_date: '2026-07-10' },
    ]],
    recurring_expenses: [[
      { category: 'Caretaker', description: null, amount: 3000, day_of_month: 1, start_month: '2026-06-01', active: true },
      // Not yet started as of July — should be excluded.
      { category: 'Security', description: null, amount: 2000, day_of_month: 1, start_month: '2026-09-01', active: true },
      // Inactive — should be excluded regardless of start_month.
      { category: 'Old Contract', description: null, amount: 500, day_of_month: 1, start_month: null, active: false },
    ]],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.expenses.length, 2);
  assertEquals(report.expenses.map((e) => [e.category, e.amount, e.isRecurring]).sort(), [
    ['Caretaker', 3000, true],
    ['Repairs', 1500, false],
  ]);
  assertEquals(report.totalExpenses, 4500);
  assertEquals(report.totalCollected, 5000);
  assertEquals(report.netIncome, 500);
});

Deno.test('buildLandlordReport: picks the tenant active at month-end when a house changed tenants mid-month', async () => {
  const supabase = createMockSupabase({
    houses: [[{ id: 'h1', house_no: 'E5', expected_rent: 5000 }]],
    tenancy_periods: [[
      { house_id: 'h1', tenant_name: 'Old Tenant', tenant_phone: '0700000001', start_date: '2026-05-01', end_date: '2026-07-10' },
      { house_id: 'h1', tenant_name: 'New Tenant', tenant_phone: '0700000002', start_date: '2026-07-15', end_date: null },
    ]],
    payments: [[], []],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-07');

  assertEquals(report.rows.length, 1);
  assertEquals(report.rows[0].tenantName, 'New Tenant');
});

Deno.test('buildLandlordReport: currentBalance shows a defaulter has since caught up, without changing the frozen totalOwed', async () => {
  const supabase = createMockSupabase({
    houses: [[{ id: 'h1', house_no: 'A7', expected_rent: 6500 }]],
    // Tenancy ended in September, so currentBalance is bounded by end_date
    // instead of the real wall-clock date — deterministic for this test.
    tenancy_periods: [[
      { house_id: 'h1', tenant_name: 'Joseph Okoth Ochieng', tenant_phone: '254768737541', start_date: '2026-05-01', end_date: '2026-09-30' },
    ]],
    payments: [
      [
        { amount: 6500, house_id: 'h1', payment_date: '2026-05-11' },
        { amount: 6500, house_id: 'h1', payment_date: '2026-06-14' },
        { amount: 6500, house_id: 'h1', payment_date: '2026-07-12' },
        { amount: 3000, house_id: 'h1', payment_date: '2026-08-09' },
        { amount: 3000, house_id: 'h1', payment_date: '2026-08-16' },
        // Aug fell Ksh 500 short as of end of August — settled a week into
        // September, then September's own rent was paid on time too.
        { amount: 500, house_id: 'h1', payment_date: '2026-09-08' },
        { amount: 6500, house_id: 'h1', payment_date: '2026-09-20' },
      ],
      [],
    ],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-08');

  assertEquals(report.rows.length, 1);
  const row = report.rows[0];
  assertEquals(row.status, 'partial');
  assertEquals(row.balance, 500);
  assertEquals(row.totalOwed, 500); // frozen as of end of August — unaffected by the September payments
  assertEquals(row.currentBalance, 0); // but they've since paid it off (Aug shortfall + Sep rent)
});

Deno.test('buildLandlordReport: currentBalance stays positive for a defaulter who has NOT caught up', async () => {
  const supabase = createMockSupabase({
    houses: [[{ id: 'h1', house_no: 'B1', expected_rent: 5000 }]],
    tenancy_periods: [[
      { house_id: 'h1', tenant_name: 'Victor Ochieng', tenant_phone: '0742529252', start_date: '2026-08-01', end_date: '2026-08-31' },
    ]],
    payments: [[{ amount: 3000, house_id: 'h1', payment_date: '2026-08-05' }], []],
  });

  const report = await buildLandlordReport(supabase, 'L1', '2026-08');

  assertEquals(report.rows[0].balance, 2000);
  assertEquals(report.rows[0].currentBalance, 2000);
});
