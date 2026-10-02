import { supabase } from '@/integrations/supabase/client';
import { recomputeHouseBalanceForPaymentDate } from '@/lib/syncPayments';

// Mirrored in supabase/functions/_shared/depositAutoTag.ts for the server-side
// (M-Pesa webhook / inbound-email) insertion paths. Keep both in sync.
const MOVE_IN_WINDOW_DAYS = 14;

/**
 * After payments land on a house, auto-tag an exact-match deposit portion so
 * a new tenant's move-in payment(s) — a single "rent + deposit" lump sum, or
 * separate installments — don't get miscounted as rent. Only acts on exact
 * amount matches; anything ambiguous is left as ordinary rent for the
 * landlord to resolve via the "Mark Deposit" button.
 */
export async function autoTagDeposits(houseIds: Iterable<string>): Promise<void> {
  for (const houseId of new Set(houseIds)) {
    try {
      await autoTagDepositForHouse(houseId);
    } catch (e) {
      console.error('Deposit auto-tag failed for house', houseId, e);
    }
  }
}

async function autoTagDepositForHouse(houseId: string): Promise<void> {
  const { data: house } = await supabase
    .from('houses')
    .select('id, landlord_id, expected_rent, deposit, occupancy_date')
    .eq('id', houseId)
    .maybeSingle();
  if (!house || !house.occupancy_date) return;

  const depositOwed = Number(house.deposit || 0);
  if (depositOwed <= 0) return;

  const occ = new Date(house.occupancy_date).getTime();
  const windowStart = new Date(occ - MOVE_IN_WINDOW_DAYS * 86400000).toISOString();
  const windowEnd = new Date(occ + MOVE_IN_WINDOW_DAYS * 86400000).toISOString();

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, payment_type, payment_date, tenant_id, mpesa_ref, sender_name, sender_phone')
    .eq('house_id', houseId)
    .gte('payment_date', windowStart)
    .lte('payment_date', windowEnd)
    .order('payment_date', { ascending: true });
  if (!payments || payments.length === 0) return;

  let depositPaid = payments
    .filter((p) => p.payment_type === 'deposit')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const expectedRent = Number(house.expected_rent || 0);

  for (const p of payments) {
    if (p.payment_type === 'deposit') continue;
    const remaining = depositOwed - depositPaid;
    if (remaining <= 0) break;

    const amount = Number(p.amount);
    let depositPortion = 0;

    if (amount === depositOwed && depositPaid === 0) {
      depositPortion = amount;
    } else if (amount === expectedRent + depositOwed) {
      depositPortion = depositOwed;
    } else if (amount === remaining) {
      depositPortion = amount;
    } else {
      continue; // ambiguous — leave for the landlord to split manually
    }

    const rentPortion = amount - depositPortion;

    if (rentPortion <= 0) {
      await supabase.from('payments').update({ payment_type: 'deposit' }).eq('id', p.id);
    } else {
      await supabase.from('payments').update({ amount: rentPortion }).eq('id', p.id);
      await supabase.from('payments').insert({
        landlord_id: house.landlord_id,
        tenant_id: p.tenant_id,
        house_id: houseId,
        amount: depositPortion,
        mpesa_ref: `${p.mpesa_ref}-DEP`,
        payment_date: p.payment_date,
        sender_name: p.sender_name,
        sender_phone: p.sender_phone,
        payment_source: 'deposit_auto_tag',
        payment_type: 'deposit',
      });
    }

    depositPaid += depositPortion;
    await recomputeHouseBalanceForPaymentDate(house.landlord_id, houseId, p.payment_date);
  }
}
