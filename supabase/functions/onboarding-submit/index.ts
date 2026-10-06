// supabase/functions/onboarding-submit/index.ts
// Public endpoint behind the "Get started" lead form on the marketing site.
// Validates input, stores the request, and emails support@kodipap.com so a
// super admin can follow up and onboard the client.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { renderEmailLayout } from '../_shared/emailLayout.ts';

const SUPPORT_EMAIL = 'support@kodipap.com';
const NAME_MAX = 200;
const EMAIL_MAX = 320;
const PHONE_MAX = 32;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PLANS = new Set(['Starter', 'Pro', 'Premium']);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface OnboardingPayload {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  plan?: unknown;
  // Honeypot — real users never fill this in; bots usually do.
  website?: unknown;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: OnboardingPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  // Honeypot tripped — pretend success so the bot moves on, do nothing else.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return jsonResponse({ ok: true });
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const plan = typeof body.plan === 'string' ? body.plan.trim() : '';

  if (!fullName || fullName.length > NAME_MAX) {
    return jsonResponse({ error: 'Enter a valid full name.' }, 400);
  }
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return jsonResponse({ error: 'Enter a valid email address.' }, 400);
  }
  if (!phone || phone.length > PHONE_MAX) {
    return jsonResponse({ error: 'Enter a valid phone number.' }, 400);
  }
  if (!VALID_PLANS.has(plan)) {
    return jsonResponse({ error: 'Choose a plan.' }, 400);
  }

  const supabase = createServiceClient();
  const { error: insertError } = await supabase.from('onboarding_requests').insert({
    full_name: fullName,
    email,
    phone,
    plan,
  });

  if (insertError) {
    console.error('onboarding_requests insert failed:', insertError);
    return jsonResponse({ error: 'Could not submit your request. Please try again.' }, 500);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (resendApiKey) {
    const html = renderEmailLayout({
      preheader: `New onboarding request from ${fullName} (${plan})`,
      bodyHtml: `
        <h2 style="margin:0 0 16px;font-size:18px;color:#0F172A;">New onboarding request</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:10px 16px;color:#64748B;width:90px;">Name</td><td style="padding:10px 16px;color:#0F172A;font-weight:600;">${escapeHtml(fullName)}</td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:10px 16px;color:#64748B;">Email</td><td style="padding:10px 16px;color:#0F172A;">${escapeHtml(email)}</td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:10px 16px;color:#64748B;">Phone</td><td style="padding:10px 16px;color:#0F172A;">${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:10px 16px;color:#64748B;">Plan</td><td style="padding:10px 16px;"><span style="background-color:#0F766E1A;border:1px solid #0F766E40;color:#0F766E;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;">${escapeHtml(plan)}</span></td></tr>
        </table>
        <p style="margin:20px 0 0;color:#64748B;font-size:13px;">Review and follow up from Super Admin → Onboarding Requests.</p>
      `,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'KODI PAP <noreply@kodipap.com>',
        to: [SUPPORT_EMAIL],
        reply_to: email,
        subject: `New onboarding request: ${fullName} (${plan})`,
        html,
      }),
    });

    // The request is already saved — don't fail just because the
    // notification email didn't send. Log it for investigation.
    if (!res.ok) {
      console.error(`Resend send failed (${res.status}): ${await res.text()}`);
    }
  }

  return jsonResponse({ ok: true });
});
