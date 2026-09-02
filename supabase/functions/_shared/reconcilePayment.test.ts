// supabase/functions/_shared/reconcilePayment.test.ts
import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { reconcilePayment, ReconcileError } from './reconcilePayment.ts';

// Same chainable mock shape as paymentMatching.test.ts, extended with `is()`
// (used by the email_log lookup's `.is('payment_id', null)`) and per-table
// maybeSingle() queues consumed in call order.
function createMockSupabase(
  queues: Record<string, unknown[]> = {},
  captures: { insert: { table: string; row: any }[]; update: { table: string; row: any }[] } = {
    insert: [],
    update: [],
  },
) {
  const supabase = {
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: async () => {
          const q = queues[table];
          const value = q && q.length ? q.shift() : null;
          return { data: value ?? null, error: null };
        },
        insert: (row: any) => {
          captures.insert.push({ table, row });
          const resultRow = { id: `generated-${table}-id`, ...row };
          return {
            select: () => ({
              single: async () => ({ data: resultRow, error: null }),
            }),
          };
        },
        update: (row: any) => {
          captures.update.push({ table, row });
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: { ...row }, error: null }),
              }),
              // plain `await ...update().eq()` path (email_logs update)
              then: (resolve: any) => resolve({ data: null, error: null }),
            }),
          };
        },
      };
      return chain;
    },
  };
  return { supabase, captures };
}

const OWN_HOUSE = { id: 'h1', expected_rent: 5000 };
const NO_TENANT = null;

Deno.test('reconcilePayment: rejects an invalid type', async () => {
  const { supabase } = createMockSupabase();
  await assertRejects(
    () => reconcilePayment(supabase, 'L1', { type: 'bogus' as any, id: 'x', houseId: 'h1' }),
    ReconcileError,
    'type must be',
  );
});

Deno.test('reconcilePayment: rejects when id or houseId is missing', async () => {
  const { supabase } = createMockSupabase();
  await assertRejects(
    () => reconcilePayment(supabase, 'L1', { type: 'payment', id: '', houseId: 'h1' }),
    ReconcileError,
    'required',
  );
});

Deno.test('reconcilePayment: rejects when the house does not belong to the caller', async () => {
  const { supabase } = createMockSupabase({ houses: [null] });
  await assertRejects(
    () => reconcilePayment(supabase, 'L1', { type: 'payment', id: 'pay1', houseId: 'not-mine' }),
    ReconcileError,
    'House not found',
  );
});

Deno.test('reconcilePayment: rejects when the payment does not belong to the caller', async () => {
  const { supabase } = createMockSupabase({
    houses: [OWN_HOUSE],
    tenants: [NO_TENANT],
    payments: [null],
  });
  await assertRejects(
    () => reconcilePayment(supabase, 'L1', { type: 'payment', id: 'not-mine', houseId: 'h1' }),
    ReconcileError,
    'Payment not found',
  );
});

Deno.test('reconcilePayment: assigns an owned payment to the chosen house and its tenant, and updates the balance', async () => {
  const { supabase, captures } = createMockSupabase({
    // consumed twice: once for the ownership check, once inside updateHouseBalance
    houses: [OWN_HOUSE, OWN_HOUSE],
    tenants: [{ id: 't1' }],
    payments: [{ id: 'pay1', amount: 3000 }],
    balances: [null, null],
  });

  const result = await reconcilePayment(supabase, 'L1', { type: 'payment', id: 'pay1', houseId: 'h1' });

  assertEquals(captures.update.find((u) => u.table === 'payments')?.row, {
    house_id: 'h1',
    tenant_id: 't1',
  });
  assertEquals(captures.insert.some((i) => i.table === 'balances'), true);
  assertEquals(typeof result.payment, 'object');
});

Deno.test('reconcilePayment: rejects an already-reconciled or foreign email_log', async () => {
  const { supabase } = createMockSupabase({
    houses: [OWN_HOUSE],
    tenants: [NO_TENANT],
    email_logs: [null],
  });
  await assertRejects(
    () => reconcilePayment(supabase, 'L1', { type: 'email_log', id: 'log1', houseId: 'h1' }),
    ReconcileError,
    'already reconciled',
  );
});

Deno.test('reconcilePayment: rejects an email_log missing amount/reference', async () => {
  const { supabase } = createMockSupabase({
    houses: [OWN_HOUSE],
    tenants: [NO_TENANT],
    email_logs: [{ id: 'log1', parsed_amount: null, parsed_mpesa_ref: null }],
  });
  await assertRejects(
    () => reconcilePayment(supabase, 'L1', { type: 'email_log', id: 'log1', houseId: 'h1' }),
    ReconcileError,
    'missing amount or reference',
  );
});

Deno.test('reconcilePayment: creates a payment from an unmatched email_log and marks it processed', async () => {
  const { supabase, captures } = createMockSupabase({
    // consumed twice: once for the ownership check, once inside updateHouseBalance
    houses: [OWN_HOUSE, OWN_HOUSE],
    tenants: [{ id: 't1' }],
    email_logs: [
      {
        id: 'log1',
        parsed_amount: 2500,
        parsed_mpesa_ref: 'ABC123',
        parsed_date: '2026-08-01T00:00:00.000Z',
        parsed_tenant_name: 'Jane Doe',
      },
    ],
    balances: [null, null],
  });

  const result = await reconcilePayment(supabase, 'L1', { type: 'email_log', id: 'log1', houseId: 'h1' });

  const insertedPayment = captures.insert.find((i) => i.table === 'payments')?.row;
  assertEquals(insertedPayment?.landlord_id, 'L1');
  assertEquals(insertedPayment?.house_id, 'h1');
  assertEquals(insertedPayment?.tenant_id, 't1');
  assertEquals(insertedPayment?.amount, 2500);
  assertEquals(insertedPayment?.mpesa_ref, 'ABC123');
  assertEquals(insertedPayment?.payment_source, 'email');

  const emailLogUpdate = captures.update.find((u) => u.table === 'email_logs')?.row;
  assertEquals(emailLogUpdate?.status, 'processed');
  assertEquals(typeof emailLogUpdate?.payment_id, 'string');

  assertEquals(captures.insert.some((i) => i.table === 'balances'), true);
  assertEquals(typeof result.payment, 'object');
});
