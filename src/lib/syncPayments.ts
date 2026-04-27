import { supabase } from '@/integrations/supabase/client';

const normName = (s: string) =>
  s.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

export interface SyncResult {
  linked: number;
  recomputed: number;
  unmatched: number;
}

/**
 * Backfill house_id / tenant_id on existing payments by matching:
 *   1) sender_name → tenant name (token overlap)
 *   2) house_no on the payment (if any) → house
 * Then recompute monthly balances for every affected (house, month) pair.
 */
export async function syncPaymentsToTenants(landlordId: string): Promise<SyncResult> {
  // 1. Load houses + tenants
  const [{ data: houses }, { data: tenants }, { data: unlinkedPayments }] = await Promise.all([
    supabase.from('houses').select('id, house_no, expected_rent').eq('landlord_id', landlordId),
    supabase.from('tenants').select('id, name, house_id').eq('landlord_id', landlordId),
    supabase
      .from('payments')
      .select('id, sender_name, payment_date, amount, house_id')
      .eq('landlord_id', landlordId)
      .is('house_id', null),
  ]);

  const tenantsWithHouse = (tenants || []).filter((t) => t.house_id);
  const tenantByHouse = new Map(tenantsWithHouse.map((t) => [t.house_id as string, t.id]));

  const matchByName = (sender: string | null) => {
    if (!sender) return null;
    const senderTokens = new Set(normName(sender).split(' ').filter((w) => w.length >= 3));
    if (senderTokens.size === 0) return null;
    let best: { score: number; tenant: typeof tenantsWithHouse[number] | null } = { score: 0, tenant: null };
    for (const t of tenantsWithHouse) {
      const tTokens = new Set(normName(t.name).split(' ').filter((w) => w.length >= 3));
      let overlap = 0;
      tTokens.forEach((tok) => { if (senderTokens.has(tok)) overlap++; });
      if (overlap > best.score) best = { score: overlap, tenant: t };
    }
    if (best.score >= 2 || (best.score === 1 && best.tenant && normName(best.tenant.name).split(' ').length <= 2)) {
      return best.tenant;
    }
    return null;
  };

  // 2. Update unlinked payments with matches
  let linked = 0;
  const affected = new Map<string, { houseId: string; month: string }>();
  for (const p of unlinkedPayments || []) {
    const matched = matchByName(p.sender_name);
    if (!matched) continue;
    const houseId = matched.house_id as string;
    const tenantId = tenantByHouse.get(houseId) || matched.id;
    const { error } = await supabase
      .from('payments')
      .update({ house_id: houseId, tenant_id: tenantId })
      .eq('id', p.id);
    if (error) {
      console.error('Failed to update payment', p.id, error);
      continue;
    }
    linked++;
    const d = new Date(p.payment_date);
    if (!isNaN(d.getTime())) {
      const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      affected.set(`${houseId}_${month}`, { houseId, month });
    }
  }

  // Also include all (house, month) pairs from already-linked payments so existing data syncs balances too
  const { data: linkedPayments } = await supabase
    .from('payments')
    .select('house_id, payment_date')
    .eq('landlord_id', landlordId)
    .not('house_id', 'is', null);
  for (const p of linkedPayments || []) {
    if (!p.house_id) continue;
    const d = new Date(p.payment_date);
    if (isNaN(d.getTime())) continue;
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    affected.set(`${p.house_id}_${month}`, { houseId: p.house_id, month });
  }

  const rentByHouse = new Map((houses || []).map((h) => [h.id, Number(h.expected_rent)]));

  // 3. Recompute balances
  let recomputed = 0;
  // Sort by month ascending so prev-month carry-forward is up-to-date
  const sorted = Array.from(affected.values()).sort((a, b) => a.month.localeCompare(b.month));
  for (const { houseId, month } of sorted) {
    try {
      const expectedRent = rentByHouse.get(houseId) ?? 0;
      const prev = new Date(month);
      prev.setUTCMonth(prev.getUTCMonth() - 1);
      const prevMonthStr = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const { data: prevBalance } = await supabase
        .from('balances')
        .select('balance')
        .eq('house_id', houseId)
        .eq('month', prevMonthStr)
        .maybeSingle();
      const carryForward = Number(prevBalance?.balance || 0);

      const monthStart = new Date(month);
      const monthEnd = new Date(month);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('house_id', houseId)
        .gte('payment_date', monthStart.toISOString())
        .lt('payment_date', monthEnd.toISOString());
      const paidAmount = (monthPayments || []).reduce((s, p) => s + Number(p.amount), 0);
      const balance = expectedRent + carryForward - paidAmount;

      await supabase
        .from('balances')
        .upsert(
          {
            landlord_id: landlordId,
            house_id: houseId,
            month,
            expected_rent: expectedRent,
            paid_amount: paidAmount,
            carry_forward: carryForward,
            balance,
          },
          { onConflict: 'house_id,month' }
        );
      recomputed++;
    } catch (e) {
      console.error('Balance recompute failed for', houseId, month, e);
    }
  }

  const unmatched = (unlinkedPayments || []).length - linked;
  return { linked, recomputed, unmatched };
}
