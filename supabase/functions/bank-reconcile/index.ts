import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUser } from '../_shared/supabase.ts';

// Bank transaction reconciliation endpoint
// Matches imported bank transactions to tenants and houses

interface ReconcileRequest {
  transaction_ids?: string[]; // Specific transactions to reconcile
  auto_match?: boolean; // Whether to auto-match or just suggest
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify user is authenticated
    const auth = await getUser(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transaction_ids, auto_match = false }: ReconcileRequest = await req.json().catch(() => ({}));

    const supabase = createServiceClient();
    const landlordId = auth.user.id;

    // Get unmatched bank transactions
    let query = supabase
      .from('bank_transactions')
      .select('*')
      .eq('landlord_id', landlordId)
      .eq('match_status', 'unmatched')
      .gt('credit_amount', 0); // Only credit transactions (incoming payments)

    if (transaction_ids?.length) {
      query = query.in('id', transaction_ids);
    }

    const { data: transactions, error: txError } = await query.limit(100);

    if (txError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transactions', details: txError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get landlord's tenants and houses for matching
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, phone, secondary_phone, house_id')
      .eq('landlord_id', landlordId);

    const { data: houses } = await supabase
      .from('houses')
      .select('id, house_no, expected_rent')
      .eq('landlord_id', landlordId);

    const results: any[] = [];

    for (const tx of transactions || []) {
      const match = await findBestMatch(tx, tenants || [], houses || []);
      
      if (match.confidence > 0) {
        if (auto_match && match.confidence >= 80) {
          // Auto-match and create payment
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              landlord_id: landlordId,
              house_id: match.house_id,
              tenant_id: match.tenant_id,
              amount: tx.credit_amount,
              mpesa_ref: tx.reference || `BANK-${tx.id.slice(0, 8)}`,
              payment_date: tx.transaction_date,
              sender_name: match.matched_name,
              payment_source: 'bank',
              bank_transaction_id: tx.id,
            })
            .select()
            .single();

          if (!paymentError && payment) {
            // Update bank transaction
            await supabase
              .from('bank_transactions')
              .update({
                matched_payment_id: payment.id,
                matched_tenant_id: match.tenant_id,
                matched_house_id: match.house_id,
                match_status: 'auto_matched',
                match_notes: match.notes,
              })
              .eq('id', tx.id);

            results.push({
              transaction_id: tx.id,
              status: 'matched',
              payment_id: payment.id,
              confidence: match.confidence,
              match_reason: match.reason,
            });
          }
        } else {
          // Just suggest the match
          results.push({
            transaction_id: tx.id,
            status: 'suggested',
            suggested_tenant_id: match.tenant_id,
            suggested_house_id: match.house_id,
            confidence: match.confidence,
            match_reason: match.reason,
            amount: tx.credit_amount,
            reference: tx.reference,
            description: tx.description,
          });
        }
      } else {
        results.push({
          transaction_id: tx.id,
          status: 'no_match',
          amount: tx.credit_amount,
          reference: tx.reference,
          description: tx.description,
        });
      }
    }

    const matched = results.filter(r => r.status === 'matched').length;
    const suggested = results.filter(r => r.status === 'suggested').length;
    const noMatch = results.filter(r => r.status === 'no_match').length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_processed: results.length,
          matched,
          suggested,
          no_match: noMatch,
        },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in bank-reconcile:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface MatchResult {
  tenant_id: string | null;
  house_id: string | null;
  confidence: number;
  reason: string;
  notes: string;
  matched_name?: string;
}

function findBestMatch(
  transaction: any, 
  tenants: any[], 
  houses: any[]
): MatchResult {
  const description = (transaction.description || '').toLowerCase();
  const reference = (transaction.reference || '').toLowerCase();
  const searchText = `${description} ${reference}`;

  let bestMatch: MatchResult = {
    tenant_id: null,
    house_id: null,
    confidence: 0,
    reason: '',
    notes: '',
  };

  // Strategy 1: Match by house number in reference/description
  for (const house of houses) {
    const houseNo = house.house_no.toLowerCase();
    
    // Check for exact house number match
    if (searchText.includes(houseNo)) {
      const tenant = tenants.find(t => t.house_id === house.id);
      bestMatch = {
        tenant_id: tenant?.id || null,
        house_id: house.id,
        confidence: 90,
        reason: `House number "${house.house_no}" found in transaction`,
        notes: `Matched by house number in ${reference ? 'reference' : 'description'}`,
        matched_name: tenant?.name,
      };
      break;
    }
  }

  // Strategy 2: Match by tenant name
  if (bestMatch.confidence < 80) {
    for (const tenant of tenants) {
      const tenantName = tenant.name.toLowerCase();
      const nameParts = tenantName.split(' ');
      
      // Check if tenant name appears in transaction
      let nameMatchCount = 0;
      for (const part of nameParts) {
        if (part.length > 2 && searchText.includes(part)) {
          nameMatchCount++;
        }
      }

      if (nameMatchCount >= 2 || (nameParts.length === 1 && nameMatchCount === 1)) {
        const confidence = Math.min(70 + (nameMatchCount * 10), 85);
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            tenant_id: tenant.id,
            house_id: tenant.house_id,
            confidence,
            reason: `Tenant name "${tenant.name}" found in transaction`,
            notes: `Matched ${nameMatchCount} name parts`,
            matched_name: tenant.name,
          };
        }
      }
    }
  }

  // Strategy 3: Match by phone number
  if (bestMatch.confidence < 70) {
    for (const tenant of tenants) {
      const phones = [tenant.phone, tenant.secondary_phone].filter(Boolean);
      
      for (const phone of phones) {
        // Clean phone number for matching
        const cleanPhone = phone.replace(/\D/g, '');
        const last9 = cleanPhone.slice(-9);
        
        if (searchText.includes(last9)) {
          bestMatch = {
            tenant_id: tenant.id,
            house_id: tenant.house_id,
            confidence: 75,
            reason: `Phone number matching "${phone}"`,
            notes: 'Matched by phone number',
            matched_name: tenant.name,
          };
          break;
        }
      }
      
      if (bestMatch.confidence >= 75) break;
    }
  }

  return bestMatch;
}
