import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

// M-Pesa C2B and STK Push callback handler
// This endpoint receives payment notifications from Safaricom

// Safaricom's known IP ranges for M-Pesa callbacks
// These are the official Safaricom data center IP ranges
const SAFARICOM_IP_RANGES = [
  '196.201.214.',  // Safaricom data center
  '196.201.212.',  // Safaricom data center
  '196.201.213.',  // Safaricom data center
  '41.215.129.',   // Safaricom data center
  '196.207.40.',   // Safaricom additional range
  '102.133.143.',  // Azure East Africa (Safaricom cloud)
];

// For development/testing, allow these IPs
const ALLOWED_TEST_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
];

function isAllowedIP(ip: string | null): boolean {
  if (!ip) return false;
  
  // Allow test IPs in non-production
  const environment = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';
  if (environment === 'sandbox') {
    if (ALLOWED_TEST_IPS.includes(ip)) return true;
  }
  
  // Check against Safaricom IP ranges
  for (const range of SAFARICOM_IP_RANGES) {
    if (ip.startsWith(range)) return true;
  }
  
  return false;
}

function getClientIP(req: Request): string | null {
  // Check various headers that might contain the real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;
  
  return null;
}

interface C2BPayload {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: string;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

interface STKCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value: string | number }>;
      };
    };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // IP Whitelisting - Only allow Safaricom IPs
  const clientIP = getClientIP(req);
  if (!isAllowedIP(clientIP)) {
    console.warn(`Rejected request from unauthorized IP: ${clientIP}`);
    
    // Log the rejected attempt for security monitoring
    const supabaseForLog = createServiceClient();
    await supabaseForLog.from('webhooks_log').insert({
      webhook_type: 'mpesa_callback_rejected',
      endpoint: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      payload: { rejected_ip: clientIP, reason: 'IP not whitelisted' },
      processed: false,
      error_message: `Rejected: IP ${clientIP} not in Safaricom whitelist`,
    });

    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createServiceClient();

  try {
    const payload = await req.json();
    
    // Log incoming webhook
    await supabase.from('webhooks_log').insert({
      webhook_type: 'mpesa_callback',
      endpoint: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      payload,
      processed: false,
    });

    // Determine callback type
    if (payload.Body?.stkCallback) {
      // STK Push callback
      return await handleSTKCallback(supabase, payload as STKCallbackPayload);
    } else if (payload.TransID) {
      // C2B callback
      return await handleC2BCallback(supabase, payload as C2BPayload);
    } else {
      console.log('Unknown callback format:', payload);
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in mpesa-callback:', error);
    // Always return success to M-Pesa to prevent retries
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSTKCallback(supabase: any, payload: STKCallbackPayload) {
  const callback = payload.Body.stkCallback;
  
  if (callback.ResultCode !== 0) {
    // Payment failed or cancelled
    console.log('STK Push failed:', callback.ResultDesc);
    
    // Update webhook log
    await supabase.from('webhooks_log')
      .update({ 
        processed: true, 
        error_message: callback.ResultDesc 
      })
      .eq('payload->Body->stkCallback->CheckoutRequestID', callback.CheckoutRequestID);

    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Extract payment details from metadata
  const metadata = callback.CallbackMetadata?.Item || [];
  const getMetaValue = (name: string) => 
    metadata.find(item => item.Name === name)?.Value;

  const transactionId = getMetaValue('MpesaReceiptNumber') as string;
  const amount = getMetaValue('Amount') as number;
  const phone = getMetaValue('PhoneNumber') as string;

  if (transactionId && amount) {
    // Process the successful payment
    await processPayment(supabase, {
      transaction_type: 'stk_push',
      transaction_id: transactionId,
      amount,
      phone: phone?.toString(),
      bill_ref_number: callback.CheckoutRequestID,
      raw_payload: payload,
    });
  }

  return new Response(
    JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleC2BCallback(supabase: any, payload: C2BPayload) {
  await processPayment(supabase, {
    transaction_type: 'c2b',
    transaction_id: payload.TransID,
    amount: parseFloat(payload.TransAmount),
    phone: payload.MSISDN,
    business_short_code: payload.BusinessShortCode,
    bill_ref_number: payload.BillRefNumber,
    invoice_number: payload.InvoiceNumber,
    org_account_balance: payload.OrgAccountBalance ? parseFloat(payload.OrgAccountBalance) : null,
    third_party_trans_id: payload.ThirdPartyTransID,
    first_name: payload.FirstName,
    middle_name: payload.MiddleName,
    last_name: payload.LastName,
    trans_time: parseTransTime(payload.TransTime),
    raw_payload: payload,
  });

  return new Response(
    JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function parseTransTime(transTime: string): Date {
  // M-Pesa format: YYYYMMDDHHmmss
  const year = parseInt(transTime.substring(0, 4));
  const month = parseInt(transTime.substring(4, 6)) - 1;
  const day = parseInt(transTime.substring(6, 8));
  const hour = parseInt(transTime.substring(8, 10));
  const minute = parseInt(transTime.substring(10, 12));
  const second = parseInt(transTime.substring(12, 14));
  
  return new Date(year, month, day, hour, minute, second);
}

async function processPayment(supabase: any, data: {
  transaction_type: string;
  transaction_id: string;
  amount: number;
  phone?: string;
  business_short_code?: string;
  bill_ref_number?: string;
  invoice_number?: string;
  org_account_balance?: number | null;
  third_party_trans_id?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  trans_time?: Date;
  raw_payload: any;
}) {
  // Check for duplicate transaction
  const { data: existing } = await supabase
    .from('mpesa_transactions')
    .select('id')
    .eq('transaction_id', data.transaction_id)
    .single();

  if (existing) {
    console.log('Duplicate transaction:', data.transaction_id);
    return;
  }

  // Try to match to a landlord using payment source
  let landlordId: string | null = null;
  
  if (data.business_short_code) {
    const { data: source } = await supabase
      .from('payment_sources')
      .select('landlord_id')
      .or(`paybill_number.eq.${data.business_short_code},till_number.eq.${data.business_short_code}`)
      .eq('is_active', true)
      .single();
    
    if (source) {
      landlordId = source.landlord_id;
    }
  }

  // If no landlord found by shortcode, try matching by bill reference (house number)
  if (!landlordId && data.bill_ref_number) {
    const { data: house } = await supabase
      .from('houses')
      .select('landlord_id, id')
      .ilike('house_no', data.bill_ref_number)
      .single();
    
    if (house) {
      landlordId = house.landlord_id;
    }
  }

  // Get first active landlord as fallback (for testing)
  if (!landlordId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('account_status', 'active')
      .limit(1)
      .single();
    
    if (profile) {
      landlordId = profile.id;
    }
  }

  if (!landlordId) {
    console.error('Could not determine landlord for transaction:', data.transaction_id);
    return;
  }

  // Insert M-Pesa transaction
  const { data: mpesaTx, error: insertError } = await supabase
    .from('mpesa_transactions')
    .insert({
      landlord_id: landlordId,
      transaction_type: data.transaction_type,
      transaction_id: data.transaction_id,
      trans_time: data.trans_time || new Date().toISOString(),
      trans_amount: data.amount,
      business_short_code: data.business_short_code,
      bill_ref_number: data.bill_ref_number,
      invoice_number: data.invoice_number,
      org_account_balance: data.org_account_balance,
      third_party_trans_id: data.third_party_trans_id,
      msisdn: data.phone,
      first_name: data.first_name,
      middle_name: data.middle_name,
      last_name: data.last_name,
      match_status: 'unmatched',
      raw_payload: data.raw_payload,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to insert mpesa transaction:', insertError);
    return;
  }

  // Attempt auto-matching
  await attemptAutoMatch(supabase, mpesaTx);

  // Update webhook log as processed
  await supabase.from('webhooks_log')
    .update({ processed: true })
    .eq('payload->TransID', data.transaction_id);
}

async function attemptAutoMatch(supabase: any, mpesaTx: any) {
  let matchedHouse = null;
  let matchedTenant = null;
  let matchConfidence = 0;

  // Strategy 1: Match by bill reference number (house number)
  if (mpesaTx.bill_ref_number) {
    const { data: house } = await supabase
      .from('houses')
      .select('id, landlord_id, expected_rent')
      .eq('landlord_id', mpesaTx.landlord_id)
      .ilike('house_no', mpesaTx.bill_ref_number)
      .single();

    if (house) {
      matchedHouse = house;
      matchConfidence = 90;

      // Find active tenant for this house
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, phone')
        .eq('house_id', house.id)
        .single();

      if (tenant) {
        matchedTenant = tenant;
        matchConfidence = 95;
      }
    }
  }

  // Strategy 2: Match by phone number
  if (!matchedTenant && mpesaTx.msisdn) {
    // Format phone for matching
    let searchPhone = mpesaTx.msisdn;
    if (searchPhone.startsWith('254')) {
      searchPhone = '0' + searchPhone.substring(3);
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, phone, house_id')
      .eq('landlord_id', mpesaTx.landlord_id)
      .or(`phone.eq.${searchPhone},phone.eq.${mpesaTx.msisdn},secondary_phone.eq.${searchPhone}`)
      .single();

    if (tenant) {
      matchedTenant = tenant;
      matchConfidence = Math.max(matchConfidence, 85);

      if (tenant.house_id && !matchedHouse) {
        const { data: house } = await supabase
          .from('houses')
          .select('id, expected_rent')
          .eq('id', tenant.house_id)
          .single();

        if (house) {
          matchedHouse = house;
          matchConfidence = 90;
        }
      }
    }
  }

  // If matched, create payment record and update transaction
  if (matchedHouse || matchedTenant) {
    // Create payment record
    const senderName = [mpesaTx.first_name, mpesaTx.middle_name, mpesaTx.last_name]
      .filter(Boolean)
      .join(' ') || null;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        landlord_id: mpesaTx.landlord_id,
        house_id: matchedHouse?.id,
        tenant_id: matchedTenant?.id,
        amount: mpesaTx.trans_amount,
        mpesa_ref: mpesaTx.transaction_id,
        payment_date: mpesaTx.trans_time,
        sender_name: senderName,
        sender_phone: mpesaTx.msisdn,
        payment_source: 'mpesa',
        mpesa_transaction_id: mpesaTx.id,
      })
      .select()
      .single();

    if (!paymentError && payment) {
      // Update mpesa transaction with match info
      await supabase
        .from('mpesa_transactions')
        .update({
          matched_payment_id: payment.id,
          matched_tenant_id: matchedTenant?.id,
          matched_house_id: matchedHouse?.id,
          match_status: 'auto_matched',
          match_confidence: matchConfidence,
        })
        .eq('id', mpesaTx.id);

      // Update house balance if matched
      if (matchedHouse) {
        await updateHouseBalance(supabase, mpesaTx.landlord_id, matchedHouse.id, mpesaTx.trans_amount);
      }
    }
  }
}

async function updateHouseBalance(supabase: any, landlordId: string, houseId: string, amount: number) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStr = monthStart.toISOString().split('T')[0];

  // Get current balance record
  const { data: balance } = await supabase
    .from('balances')
    .select('*')
    .eq('landlord_id', landlordId)
    .eq('house_id', houseId)
    .eq('month', monthStr)
    .single();

  if (balance) {
    // Update existing balance
    const newPaidAmount = (balance.paid_amount || 0) + amount;
    const newBalance = balance.expected_rent - newPaidAmount + (balance.carry_forward || 0);

    await supabase
      .from('balances')
      .update({
        paid_amount: newPaidAmount,
        balance: newBalance,
      })
      .eq('id', balance.id);
  } else {
    // Get house expected rent
    const { data: house } = await supabase
      .from('houses')
      .select('expected_rent')
      .eq('id', houseId)
      .single();

    if (house) {
      // Get previous month's balance for carry forward
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthStr = prevMonth.toISOString().split('T')[0];

      const { data: prevBalance } = await supabase
        .from('balances')
        .select('balance')
        .eq('landlord_id', landlordId)
        .eq('house_id', houseId)
        .eq('month', prevMonthStr)
        .single();

      const carryForward = prevBalance?.balance || 0;
      const newBalance = house.expected_rent - amount + carryForward;

      await supabase
        .from('balances')
        .insert({
          landlord_id: landlordId,
          house_id: houseId,
          month: monthStr,
          expected_rent: house.expected_rent,
          paid_amount: amount,
          carry_forward: carryForward,
          balance: newBalance,
        });
    }
  }
}
