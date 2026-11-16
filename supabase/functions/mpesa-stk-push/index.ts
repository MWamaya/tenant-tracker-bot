import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUser } from '../_shared/supabase.ts';
import { withCallbackToken } from '../_shared/mpesaCallbackAuth.ts';

// M-Pesa STK Push endpoints
const MPESA_STK_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
const MPESA_SANDBOX_STK_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

interface STKPushRequest {
  phone_number: string;
  amount: number;
  account_reference: string; // Usually house_no or invoice_number
  description?: string;
  tenant_id?: string;
  house_id?: string;
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

    const { phone_number, amount, account_reference, description, tenant_id, house_id }: STKPushRequest = await req.json();

    // Validate required fields
    if (typeof phone_number !== 'string' || typeof account_reference !== 'string' || !account_reference.trim() ||
        typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1 || !Number.isSafeInteger(Math.round(amount))) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phone_number, amount, account_reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceClient();
    let resolvedHouseId = house_id || null;
    let resolvedTenantId = tenant_id || null;
    if (resolvedTenantId) {
      const { data: tenant, error } = await supabase.from('tenants').select('id, house_id')
        .eq('id', resolvedTenantId).eq('landlord_id', auth.user.id).is('moved_out_at', null).maybeSingle();
      if (error || !tenant) return Response.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders });
      if (resolvedHouseId && tenant.house_id !== resolvedHouseId) {
        return Response.json({ error: 'Tenant does not belong to this house' }, { status: 400, headers: corsHeaders });
      }
      resolvedHouseId = tenant.house_id;
    }
    if (resolvedHouseId) {
      const { data: house, error } = await supabase.from('houses').select('id')
        .eq('id', resolvedHouseId).eq('landlord_id', auth.user.id).maybeSingle();
      if (error || !house) return Response.json({ error: 'House not found' }, { status: 404, headers: corsHeaders });
      if (!resolvedTenantId) {
        const { data: tenant } = await supabase.from('tenants').select('id')
          .eq('house_id', resolvedHouseId).eq('landlord_id', auth.user.id).is('moved_out_at', null).maybeSingle();
        resolvedTenantId = tenant?.id ?? null;
      }
    }

    // Get M-Pesa credentials
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const shortcode = Deno.env.get('MPESA_SHORTCODE');
    const passkey = Deno.env.get('MPESA_PASSKEY');
    const environment = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';
    const callbackUrl = Deno.env.get('MPESA_CALLBACK_URL');

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      return new Response(
        JSON.stringify({ error: 'M-Pesa credentials not fully configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth token
    const authUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${credentials}` },
    });

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to get M-Pesa access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await authResponse.json();

    // Generate timestamp (YYYYMMDDHHmmss)
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    // Generate password (base64 of Shortcode + Passkey + Timestamp)
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    // Format phone number (remove + and ensure 254 prefix)
    let formattedPhone = phone_number.replace(/\+/g, '').replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Build STK Push request
    const stkUrl = environment === 'production' ? MPESA_STK_URL : MPESA_SANDBOX_STK_URL;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const defaultCallbackUrl = `${supabaseUrl}/functions/v1/mpesa-callback`;

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: withCallbackToken(callbackUrl || defaultCallbackUrl),
      AccountReference: account_reference,
      TransactionDesc: description || `Payment for ${account_reference}`,
    };

    const stkResponse = await fetch(stkUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const stkResult = await stkResponse.json();

    // Log the STK Push request
    await supabase.from('webhooks_log').insert({
      landlord_id: auth.user.id,
      webhook_type: 'stk_push_request',
      endpoint: stkUrl,
      method: 'POST',
      payload: {
        ...stkPayload,
        Password: '[REDACTED]', // Don't log password
        tenant_id,
        house_id,
      },
      response_status: stkResponse.status,
      response_body: stkResult,
      processed: stkResponse.ok,
    });

    if (!stkResponse.ok || stkResult.errorCode) {
      return new Response(
        JSON.stringify({ 
          error: 'STK Push failed', 
          details: stkResult.errorMessage || stkResult 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stkResult.CheckoutRequestID) {
      return Response.json({ error: 'M-Pesa returned no checkout identity' }, { status: 502, headers: corsHeaders });
    }
    const { error: trackingError } = await supabase.from('rent_mpesa_requests').insert({
      landlord_id: auth.user.id, house_id: resolvedHouseId, tenant_id: resolvedTenantId,
      checkout_request_id: stkResult.CheckoutRequestID,
      account_reference, amount: Math.round(amount),
    });
    if (trackingError) {
      console.error('Rent checkout tracking failed:', trackingError.message);
      return Response.json({ error: 'Payment prompt sent, but checkout tracking failed. Contact support before retrying.' }, {
        status: 500, headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_request_id: stkResult.CheckoutRequestID,
        merchant_request_id: stkResult.MerchantRequestID,
        response_code: stkResult.ResponseCode,
        response_description: stkResult.ResponseDescription,
        customer_message: stkResult.CustomerMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in mpesa-stk-push:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
