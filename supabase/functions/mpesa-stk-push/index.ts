import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUser } from '../_shared/supabase.ts';

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
    if (!phone_number || !amount || !account_reference) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phone_number, amount, account_reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      CallBackURL: callbackUrl || defaultCallbackUrl,
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
    const supabase = createServiceClient();
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
