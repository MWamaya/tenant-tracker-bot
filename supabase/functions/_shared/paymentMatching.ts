// supabase/functions/_shared/paymentMatching.ts

export interface MatchResult {
  house: { id: string; expected_rent: number } | null;
  tenant: { id: string; name: string; phone: string } | null;
  confidence: number;
}

export async function matchHouseAndTenant(
  supabase: any,
  input: { landlordId: string; houseNo?: string | null; phone?: string | null },
): Promise<MatchResult> {
  let house: MatchResult['house'] = null;
  let tenant: MatchResult['tenant'] = null;
  let confidence = 0;

  if (input.houseNo) {
    const { data: h } = await supabase
      .from('houses')
      .select('id, expected_rent')
      .eq('landlord_id', input.landlordId)
      .ilike('house_no', input.houseNo)
      .maybeSingle();

    if (h) {
      house = h;
      confidence = 90;

      const { data: t } = await supabase
        .from('tenants')
        .select('id, name, phone')
        .eq('house_id', h.id)
        .maybeSingle();

      if (t) {
        tenant = t;
        confidence = 95;
      }
    }
  }

  if (!tenant && input.phone) {
    let searchPhone = input.phone;
    if (searchPhone.startsWith('254')) {
      searchPhone = '0' + searchPhone.substring(3);
    }

    const { data: t } = await supabase
      .from('tenants')
      .select('id, name, phone, house_id')
      .eq('landlord_id', input.landlordId)
      .or(`phone.eq.${searchPhone},phone.eq.${input.phone},secondary_phone.eq.${searchPhone}`)
      .maybeSingle();

    if (t) {
      tenant = t;
      confidence = Math.max(confidence, 85);

      if (t.house_id && !house) {
        const { data: h } = await supabase
          .from('houses')
          .select('id, expected_rent')
          .eq('id', t.house_id)
          .maybeSingle();

        if (h) {
          house = h;
          confidence = 90;
        }
      }
    }
  }

  return { house, tenant, confidence };
}

export async function updateHouseBalance(
  supabase: any,
  landlordId: string,
  houseId: string,
  amount: number,
): Promise<void> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStr = monthStart.toISOString().split('T')[0];

  const { data: balance } = await supabase
    .from('balances')
    .select('*')
    .eq('landlord_id', landlordId)
    .eq('house_id', houseId)
    .eq('month', monthStr)
    .maybeSingle();

  if (balance) {
    const newPaidAmount = (balance.paid_amount || 0) + amount;
    const newBalance = balance.expected_rent - newPaidAmount + (balance.carry_forward || 0);

    await supabase
      .from('balances')
      .update({ paid_amount: newPaidAmount, balance: newBalance })
      .eq('id', balance.id);
    return;
  }

  const { data: house } = await supabase
    .from('houses')
    .select('expected_rent')
    .eq('id', houseId)
    .maybeSingle();

  if (!house) return;

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = prevMonth.toISOString().split('T')[0];

  const { data: prevBalance } = await supabase
    .from('balances')
    .select('balance')
    .eq('landlord_id', landlordId)
    .eq('house_id', houseId)
    .eq('month', prevMonthStr)
    .maybeSingle();

  const carryForward = prevBalance?.balance || 0;
  const newBalance = house.expected_rent - amount + carryForward;

  await supabase.from('balances').insert({
    landlord_id: landlordId,
    house_id: houseId,
    month: monthStr,
    expected_rent: house.expected_rent,
    paid_amount: amount,
    carry_forward: carryForward,
    balance: newBalance,
  });
}
