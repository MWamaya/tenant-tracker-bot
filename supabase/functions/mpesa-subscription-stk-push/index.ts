import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUser } from '../_shared/supabase.ts';
import { activateLandlordSubscription } from '../_shared/subscriptionActivation.ts';

// Landlord-initiated STK Push to pay for their own KODI PAP subscription
// (as opposed to mpesa-stk-push, which is a landlord collecting rent from
// a tenant). Same Safaricom paybill, different account reference scheme
// and a dedicated callback path so mpesa-callback can tell the two apart.
const MPESA_STK_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
const MPESA_SANDBOX_STK_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

const ALLOWED_MONTHS = [1, 3, 6, 12];

interface SubscriptionSTKRequest {
  plan_name: string;
  phone_number: string;
  /** Billing cycles to prepay at once — 1, 3, 6, or 12. Defaults to 1. */
  months?: number;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getUser(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { plan_name, phone_number, months: rawMonths }: SubscriptionSTKRequest = await req.json();

    if (!plan_name || !phone_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_name, phone_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const months = ALLOWED_MONTHS.includes(rawMonths as number) ? (rawMonths as number) : 1;

    const supabase = createServiceClient();

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', plan_name)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Unknown or inactive subscription plan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepaying multiple cycles only makes sense as a renewal of the plan
    // you're already on — switching plans stays a single-month action.
    if (months > 1) {
      const { data: currentSub } = await supabase
        .from('landlord_subscriptions')
        .select('plan_id')
        .eq('landlord_id', auth.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!currentSub || currentSub.plan_id !== plan.id) {
        return new Response(
          JSON.stringify({ error: 'Prepaying multiple months is only available when renewing your current plan.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Free plans activate immediately — no M-Pesa round trip needed.
    if (plan.price <= 0) {
      await activateLandlordSubscription(supabase, {
        landlordId: auth.user.id,
        planId: plan.id,
        paymentReference: 'free_plan',
        amountPaid: 0,
        months,
      });

      return new Response(
        JSON.stringify({ success: true, activated: true, plan_name: plan.name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    let formattedPhone = phone_number.replace(/\+/g, '').replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    const stkUrl = environment === 'production' ? MPESA_STK_URL : MPESA_SANDBOX_STK_URL;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const defaultCallbackUrl = `${supabaseUrl}/functions/v1/mpesa-callback`;

    // Short, alphanumeric account reference — Safaricom caps this at 12 chars.
    const accountReference = `SUB${plan.name}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const totalAmount = plan.price * months;

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(totalAmount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl || defaultCallbackUrl,
      AccountReference: accountReference,
      TransactionDesc: months > 1
        ? `KODI PAP ${plan.name} subscription (${months} months)`
        : `KODI PAP ${plan.name} subscription`,
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

    await supabase.from('webhooks_log').insert({
      landlord_id: auth.user.id,
      webhook_type: 'subscription_stk_push_request',
      endpoint: stkUrl,
      method: 'POST',
      payload: {
        ...stkPayload,
        Password: '[REDACTED]',
        plan_id: plan.id,
      },
      response_status: stkResponse.status,
      response_body: stkResult,
      processed: stkResponse.ok,
    });

    if (!stkResponse.ok || stkResult.errorCode) {
      return new Response(
        JSON.stringify({
          error: 'STK Push failed',
          details: stkResult.errorMessage || stkResult,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: insertError } = await supabase.from('subscription_mpesa_requests').insert({
      landlord_id: auth.user.id,
      plan_id: plan.id,
      checkout_request_id: stkResult.CheckoutRequestID,
      merchant_request_id: stkResult.MerchantRequestID,
      phone: formattedPhone,
      amount: totalAmount,
      months,
      status: 'pending',
    });

    if (insertError) {
      console.error('Failed to record subscription STK request:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        activated: false,
        checkout_request_id: stkResult.CheckoutRequestID,
        merchant_request_id: stkResult.MerchantRequestID,
        response_code: stkResult.ResponseCode,
        response_description: stkResult.ResponseDescription,
        customer_message: stkResult.CustomerMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in mpesa-subscription-stk-push:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
