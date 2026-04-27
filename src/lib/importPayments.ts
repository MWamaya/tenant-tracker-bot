import { supabase } from '@/integrations/supabase/client';

export interface ImportablePaymentRow {
  payment_date: string; // ISO
  amount: number;
  mpesa_ref: string;
  sender_name: string | null;
  sender_phone: string | null;
  house_no: string | null;
}

export interface ImportPaymentsResult {
  inserted: number;
  matched: number;
  unmatched: number;
  recomputed: number;
}

/**
 * Inserts payment rows for a landlord, attempts house/tenant auto-matching
 * (via house code first, then fuzzy sender name), and recomputes monthly
 * balances for affected (house, month) pairs so the Tenants page stays in sync.
 */
export async function importPaymentRows(
  landlordId: string,
  rows: ImportablePaymentRow[],
  paymentSource: string = 'manual_paste'
): Promise<ImportPaymentsResult> {
  if (rows.length === 0) {
    return { inserted: 0, matched: 0, unmatched: 0, recomputed: 0 };
  }

  // Lookup houses for matching
  const { data: houses } = await supabase
    .from('houses')
    .select('id, house_no, expected_rent')
    .eq('landlord_id', landlordId);
  const houseMap = new Map((houses || []).map((h) => [h.house_no.toLowerCase().trim(), h.id]));
  const rentByHouse = new Map((houses || []).map((h) => [h.id, Number(h.expected_rent)]));

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, house_id')
    .eq('landlord_id', landlordId);
  const tenantByHouse = new Map(
    (tenants || []).filter((t) => t.house_id).map((t) => [t.house_id, t.id])
  );

  const normName = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const tenantsWithHouse = (tenants || []).filter((t) => t.house_id);
  const matchByName = (sender: string | null) => {
    if (!sender) return { houseId: null as string | null, tenantId: null as string | null };
    const senderTokens = new Set(normName(sender).split(' ').filter((w) => w.length >= 3));
    if (senderTokens.size === 0) return { houseId: null, tenantId: null };
    let best: { score: number; tenant: typeof tenantsWithHouse[number] | null } = { score: 0, tenant: null };
    for (const t of tenantsWithHouse) {
      const tTokens = new Set(normName(t.name).split(' ').filter((w) => w.length >= 3));
      let overlap = 0;
      tTokens.forEach((tok) => { if (senderTokens.has(tok)) overlap++; });
      if (overlap > best.score) best = { score: overlap, tenant: t };
    }
    if (best.score >= 2 || (best.score === 1 && best.tenant && normName(best.tenant.name).split(' ').length <= 2)) {
      return { houseId: best.tenant!.house_id as string, tenantId: best.tenant!.id };
    }
    return { houseId: null, tenantId: null };
  };

  const inserts = rows.map((r) => {
    let houseId = r.house_no ? houseMap.get(r.house_no.toLowerCase().trim()) || null : null;
    let tenantId = houseId ? tenantByHouse.get(houseId) || null : null;
    if (!houseId) {
      const fuzzy = matchByName(r.sender_name);
      houseId = fuzzy.houseId;
      tenantId = fuzzy.tenantId;
    }
    return {
      landlord_id: landlordId,
      payment_date: r.payment_date,
      amount: r.amount,
      mpesa_ref: r.mpesa_ref,
      sender_name: r.sender_name,
      sender_phone: r.sender_phone,
      house_id: houseId,
      tenant_id: tenantId,
      payment_source: paymentSource,
    };
  });

  const { error } = await supabase.from('payments').insert(inserts);
  if (error) throw error;

  const matchedInserts = inserts.filter((i) => i.house_id);

  // Recompute affected monthly balances
  const houseMonthPairs = new Map<string, { houseId: string; month: string }>();
  for (const ins of inserts) {
    if (!ins.house_id || !ins.payment_date) continue;
    const d = new Date(ins.payment_date);
    if (isNaN(d.getTime())) continue;
    const monthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    houseMonthPairs.set(`${ins.house_id}_${monthStr}`, { houseId: ins.house_id, month: monthStr });
  }

  let recomputed = 0;
  for (const { houseId, month } of houseMonthPairs.values()) {
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

  return {
    inserted: inserts.length,
    matched: matchedInserts.length,
    unmatched: inserts.length - matchedInserts.length,
    recomputed,
  };
}
