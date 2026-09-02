// supabase/functions/_shared/paymentMatching.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { matchHouseAndTenant, updateHouseBalance } from './paymentMatching.ts';

// Minimal chainable mock of the subset of the Supabase query builder these
// functions use. `queues[table]` is consumed in call order by maybeSingle();
// `captures` records what insert()/update()/or() were called with so tests
// can assert on the write side and on filter construction, not just reads.
function createMockSupabase(
  queues: Record<string, unknown[]> = {},
  captures: { insert: { table: string; row: any }[]; update: { table: string; row: any }[]; or: string[] } = {
    insert: [],
    update: [],
    or: [],
  },
) {
  const supabase = {
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        ilike: () => chain,
        or: (filter: string) => {
          captures.or.push(filter);
          return chain;
        },
        maybeSingle: async () => {
          const q = queues[table];
          const value = q && q.length ? q.shift() : null;
          return { data: value ?? null };
        },
        insert: (row: any) => {
          captures.insert.push({ table, row });
          const resultRow = { id: `generated-${table}-id`, ...row };
          const awaitable: any = Promise.resolve({ data: resultRow, error: null });
          awaitable.select = () => ({
            single: async () => ({ data: resultRow, error: null }),
          });
          return awaitable;
        },
        update: (row: any) => {
          captures.update.push({ table, row });
          return { eq: async () => ({ data: null, error: null }) };
        },
      };
      return chain;
    },
  };
  return { supabase, captures };
}

Deno.test('matchHouseAndTenant: exact house match with a resident tenant scores 95', async () => {
  const { supabase } = createMockSupabase({
    houses: [{ id: 'h1', expected_rent: 5000 }],
    tenants: [{ id: 't1', name: 'Jane Doe', phone: '0712345678' }],
  });

  const result = await matchHouseAndTenant(supabase, { landlordId: 'L1', houseNo: 'B13' });

  assertEquals(result.house?.id, 'h1');
  assertEquals(result.tenant?.id, 't1');
  assertEquals(result.confidence, 95);
});

Deno.test('matchHouseAndTenant: house match with no resident tenant scores 90 and leaves tenant null', async () => {
  const { supabase } = createMockSupabase({
    houses: [{ id: 'h1', expected_rent: 5000 }],
    tenants: [null],
  });

  const result = await matchHouseAndTenant(supabase, { landlordId: 'L1', houseNo: 'B13' });

  assertEquals(result.house?.id, 'h1');
  assertEquals(result.tenant, null);
  assertEquals(result.confidence, 90);
});

Deno.test('matchHouseAndTenant: falls back to phone match and resolves the tenant\'s house', async () => {
  const { supabase } = createMockSupabase({
    tenants: [{ id: 't1', name: 'Jane Doe', phone: '0712345678', house_id: 'h1' }],
    houses: [{ id: 'h1', expected_rent: 5000 }],
  });

  const result = await matchHouseAndTenant(supabase, { landlordId: 'L1', phone: '0712345678' });

  assertEquals(result.tenant?.id, 't1');
  assertEquals(result.house?.id, 'h1');
  assertEquals(result.confidence, 90);
});

Deno.test('matchHouseAndTenant: normalizes a 254-prefixed phone into the OR filter alongside the raw value', async () => {
  const { supabase, captures } = createMockSupabase({ tenants: [null] });

  await matchHouseAndTenant(supabase, { landlordId: 'L1', phone: '254712345678' });

  assertEquals(
    captures.or[0],
    'phone.eq.0712345678,phone.eq.254712345678,secondary_phone.eq.0712345678',
  );
});

Deno.test('matchHouseAndTenant: no house and no phone match returns zero confidence', async () => {
  const { supabase } = createMockSupabase({ houses: [null] });

  const result = await matchHouseAndTenant(supabase, { landlordId: 'L1', houseNo: 'Z99' });

  assertEquals(result.house, null);
  assertEquals(result.tenant, null);
  assertEquals(result.confidence, 0);
});

Deno.test('updateHouseBalance: adds to an existing month balance', async () => {
  const { supabase, captures } = createMockSupabase({
    balances: [{ id: 'bal1', paid_amount: 1000, expected_rent: 5000, balance: 4000, carry_forward: 0 }],
  });

  await updateHouseBalance(supabase, 'L1', 'h1', 500);

  assertEquals(captures.update.length, 1);
  assertEquals(captures.update[0].table, 'balances');
  assertEquals(captures.update[0].row, { paid_amount: 1500, balance: 3500 });
});

Deno.test('updateHouseBalance: creates a new month balance with zero carry-forward when no prior month exists', async () => {
  const { supabase, captures } = createMockSupabase({
    balances: [null, null],
    houses: [{ expected_rent: 5000 }],
  });

  await updateHouseBalance(supabase, 'L1', 'h1', 2000);

  assertEquals(captures.insert.length, 1);
  const inserted = captures.insert[0];
  assertEquals(inserted.table, 'balances');
  assertEquals(inserted.row.landlord_id, 'L1');
  assertEquals(inserted.row.house_id, 'h1');
  assertEquals(inserted.row.expected_rent, 5000);
  assertEquals(inserted.row.paid_amount, 2000);
  assertEquals(inserted.row.carry_forward, 0);
  assertEquals(inserted.row.balance, 3000);
});

Deno.test('updateHouseBalance: carries forward the previous month\'s balance into a new month row', async () => {
  const { supabase, captures } = createMockSupabase({
    balances: [null, { balance: 1000 }],
    houses: [{ expected_rent: 5000 }],
  });

  await updateHouseBalance(supabase, 'L1', 'h1', 2000);

  const inserted = captures.insert[0];
  assertEquals(inserted.row.carry_forward, 1000);
  assertEquals(inserted.row.balance, 4000);
});

Deno.test('updateHouseBalance: no-ops when the house cannot be found', async () => {
  const { supabase, captures } = createMockSupabase({
    balances: [null],
    houses: [null],
  });

  await updateHouseBalance(supabase, 'L1', 'missing-house', 2000);

  assertEquals(captures.insert.length, 0);
  assertEquals(captures.update.length, 0);
});
