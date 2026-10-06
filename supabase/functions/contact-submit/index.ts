// supabase/functions/contact-submit/index.ts
// Public endpoint behind the "Contact & Support" form on the marketing
// site. Validates input, stores the message, and emails support@kodipap.com
// with reply-to set to the submitter so replying goes straight to them.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { renderEmailLayout } from '../_shared/emailLayout.ts';

const SUPPORT_EMAIL = 'support@kodipap.com';
const NAME_MAX = 200;
const EMAIL_MAX = 320;
const TOPIC_MAX = 100;
const MESSAGE_MAX = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
  // Honeypot — real users never fill this in; bots usually do.
  website?: unknown;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: ContactPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  // Honeypot tripped — pretend success so the bot moves on, do nothing else.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return jsonResponse({ ok: true });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || name.length > NAME_MAX) {
    return jsonResponse({ error: 'Enter a valid name.' }, 400);
  }
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return jsonResponse({ error: 'Enter a valid email address.' }, 400);
  }
  if (topic.length > TOPIC_MAX) {
    return jsonResponse({ error: 'Topic is too long.' }, 400);
  }
  if (!message || message.length > MESSAGE_MAX) {
    return jsonResponse({ error: 'Enter a message (up to 5000 characters).' }, 400);
  }

  const supabase = createServiceClient();
  const { error: insertError } = await supabase.from('contact_messages').insert({
    name,
    email,
    topic: topic || null,
    message,
  });

  if (insertError) {
    console.error('contact_messages insert failed:', insertError);
    return jsonResponse({ error: 'Could not save your message. Please try again.' }, 500);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (resendApiKey) {
    const html = renderEmailLayout({
      preheader: `${name}: ${topic || message.slice(0, 80)}`,
      bodyHtml: `
        <h2 style="margin:0 0 16px;font-size:18px;color:#0F172A;">New contact form submission</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin:0 0 16px;">
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="padding:10px 16px;color:#64748B;width:90px;">Name</td><td style="padding:10px 16px;color:#0F172A;font-weight:600;">${escapeHtml(name)}</td></tr>
          <tr style="${topic ? 'border-bottom:1px solid #E2E8F0;' : ''}"><td style="padding:10px 16px;color:#64748B;">Email</td><td style="padding:10px 16px;color:#0F172A;">${escapeHtml(email)}</td></tr>
          ${topic ? `<tr><td style="padding:10px 16px;color:#64748B;">Topic</td><td style="padding:10px 16px;color:#0F172A;">${escapeHtml(topic)}</td></tr>` : ''}
        </table>
        <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.02em;margin:0 0 6px;">Message</div>
        <p style="white-space:pre-wrap;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;color:#0F172A;">${escapeHtml(message)}</p>
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
        subject: `Contact form: ${topic || 'New message'} — ${name}`,
        html,
      }),
    });

    // The message is already saved — don't fail the request just because
    // the notification email didn't send. Log it so it can be investigated.
    if (!res.ok) {
      console.error(`Resend send failed (${res.status}): ${await res.text()}`);
    }
  }

  return jsonResponse({ ok: true });
});
