import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { verifyResendWebhook } from '../_shared/verifyResendWebhook.ts';
import { htmlToText, extractForwardedFrom } from '../_shared/emailText.ts';
import { parseBankEmail } from '../_shared/bankParsers.ts';
import { matchHouseAndTenant, updateHouseBalance } from '../_shared/paymentMatching.ts';
import { autoTagDeposits } from '../_shared/depositAutoTag.ts';

interface ResendReceivedWebhook {
  type: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const rawBody = await req.text();
  const supabase = createServiceClient();

  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('RESEND_WEBHOOK_SECRET not configured');
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const isValid = await verifyResendWebhook(rawBody, req.headers, webhookSecret);
  if (!isValid) {
    await supabase.from('webhooks_log').insert({
      webhook_type: 'resend_inbound_rejected',
      endpoint: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      payload: { reason: 'Invalid Svix signature' },
      processed: false,
      error_message: 'Rejected: invalid webhook signature',
    });
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let payload: ResendReceivedWebhook;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { data: webhookLog } = await supabase
    .from('webhooks_log')
    .insert({
      webhook_type: 'resend_inbound',
      endpoint: req.url,
      method: req.method,
      payload,
      processed: false,
    })
    .select()
    .single();

  // Marks the base webhooks_log row processed — used on every exit path
  // below that isn't itself a distinct, actionable failure. Resend fires
  // several event types (delivered, bounced, opened, ...) at this same
  // endpoint besides "email.received", and duplicate/malformed deliveries
  // happen in normal operation; none of those need admin follow-up, so
  // they shouldn't pile up in the unprocessed count.
  const markBaseLogProcessed = async (errorMessage?: string) => {
    if (!webhookLog?.id) return;
    await supabase
      .from('webhooks_log')
      .update({ processed: true, ...(errorMessage ? { error_message: errorMessage } : {}) })
      .eq('id', webhookLog.id);
  };

  if (payload.type !== 'email.received') {
    await markBaseLogProcessed();
    return jsonResponse({ received: true });
  }

  const emailId = payload.data?.email_id;
  const toAddress = payload.data?.to?.[0]?.toLowerCase();

  if (!emailId || !toAddress) {
    await markBaseLogProcessed('email.received payload missing email_id or to address');
    return jsonResponse({ received: true });
  }

  const { data: existingLog } = await supabase
    .from('email_logs')
    .select('id')
    .eq('resend_message_id', emailId)
    .maybeSingle();

  if (existingLog) {
    await markBaseLogProcessed();
    return jsonResponse({ received: true, duplicate: true });
  }

  const { data: landlord } = await supabase
    .from('profiles')
    .select('id')
    .eq('inbound_email', toAddress)
    .maybeSingle();

  if (!landlord) {
    // The dedicated row below is the actionable one (stays unprocessed —
    // someone's forwarding bank emails to an address no landlord owns).
    // The base row above already did its job logging the raw delivery.
    await markBaseLogProcessed();
    await supabase.from('webhooks_log').insert({
      webhook_type: 'resend_inbound_unmatched_recipient',
      endpoint: req.url,
      method: req.method,
      payload: { to: toAddress, email_id: emailId },
      processed: false,
      error_message: `No landlord found for recipient ${toAddress}`,
    });
    return jsonResponse({ received: true });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    await markBaseLogProcessed('RESEND_API_KEY not configured');
    return jsonResponse({ received: true });
  }

  const emailResponse = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${resendApiKey}` },
  });

  if (!emailResponse.ok) {
    const fetchError = await emailResponse.text();
    console.error('Failed to fetch email from Resend:', fetchError);
    await markBaseLogProcessed(`Failed to fetch email from Resend: ${fetchError.slice(0, 500)}`);
    return jsonResponse({ received: true });
  }

  const email = await emailResponse.json();
  const rawContent = email.html || email.text || '';
  const text = htmlToText(rawContent);
  const originalFrom = extractForwardedFrom(text);
  const parsed = parseBankEmail(text, originalFrom);

  await markBaseLogProcessed();

  if (!parsed) {
    await supabase.from('email_logs').insert({
      landlord_id: landlord.id,
      raw_message: text,
      status: 'failed',
      error_message: 'Could not parse required fields from forwarded email',
      resend_message_id: emailId,
    });
    return jsonResponse({ received: true });
  }

  const { data: emailLog, error: insertError } = await supabase
    .from('email_logs')
    .insert({
      landlord_id: landlord.id,
      raw_message: text,
      parsed_amount: parsed.amount,
      parsed_house_no: parsed.houseNo,
      parsed_tenant_name: parsed.tenantName,
      parsed_mpesa_ref: parsed.reference,
      parsed_date: parsed.paymentDate,
      status: 'pending',
      resend_message_id: emailId,
    })
    .select()
    .single();

  if (insertError || !emailLog) {
    console.error('Failed to insert email log:', insertError);
    return jsonResponse({ received: true });
  }

  const match = await matchHouseAndTenant(supabase, {
    landlordId: landlord.id,
    houseNo: parsed.houseNo,
  });

  if (match.house || match.tenant) {
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        landlord_id: landlord.id,
        house_id: match.house?.id,
        tenant_id: match.tenant?.id,
        amount: parsed.amount,
        mpesa_ref: parsed.reference,
        payment_date: parsed.paymentDate || new Date().toISOString(),
        sender_name: parsed.tenantName,
        payment_source: 'email',
      })
      .select()
      .single();

    if (!paymentError && payment) {
      await supabase
        .from('email_logs')
        .update({ status: 'processed', payment_id: payment.id })
        .eq('id', emailLog.id);

      if (match.house) {
        await updateHouseBalance(supabase, landlord.id, match.house.id, parsed.amount);
        await autoTagDeposits(supabase, [match.house.id]);
      }
    }
  }

  return jsonResponse({ received: true });
});
