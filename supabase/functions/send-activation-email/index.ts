// supabase/functions/send-activation-email/index.ts
// Fired by a Postgres trigger (via pg_net, using the service_role key from
// Vault — same pattern as send-monthly-reports) whenever a landlord's
// account_status transitions to 'active' and their inbound_email has just
// been auto-generated. Emails them that address plus setup steps for
// forwarding M-Pesa/bank payment confirmations, since nothing else tells
// them this happened.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { renderEmailLayout, emailButton, escapeHtml } from '../_shared/emailLayout.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Must never be callable with the public anon key or a regular user JWT —
// it looks up and emails any landlord by id.
function isServiceRole(req: Request): boolean {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

interface RequestBody {
  landlordId?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!isServiceRole(req)) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  let body: RequestBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.landlordId) {
    return jsonResponse({ error: 'landlordId is required' }, 400);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const supabase = createServiceClient();
  const { data: landlord, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, inbound_email')
    .eq('id', body.landlordId)
    .maybeSingle();

  if (error || !landlord || !landlord.email || !landlord.inbound_email) {
    console.error('send-activation-email: landlord not found or missing email/inbound_email', error);
    return jsonResponse({ error: 'Landlord not found, or missing email/inbound_email' }, 404);
  }

  const firstName = (landlord.full_name || '').split(' ')[0] || 'there';

  const html = renderEmailLayout({
    preheader: 'Your account is active — one last step to start matching payments automatically.',
    bodyHtml: `
      <h2 style="margin:0 0 16px;font-size:18px;color:#0F172A;">You're all set, ${escapeHtml(firstName)} 🎉</h2>
      <p style="margin:0 0 20px;">Your KODI PAP account is now active. There's one last step before payments start matching automatically: forward your M-Pesa and bank payment confirmations to your dedicated address below.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0FDF4;border:1px solid #DCFCE7;border-radius:10px;margin:0 0 20px;">
        <tr>
          <td style="padding:16px 20px;">
            <div style="font-size:12px;color:#16A34A;font-weight:600;letter-spacing:0.02em;text-transform:uppercase;margin:0 0 6px;">Your forwarding address</div>
            <div style="font-size:16px;font-weight:700;color:#0F172A;font-family:monospace;word-break:break-all;">${escapeHtml(landlord.inbound_email)}</div>
          </td>
        </tr>
      </table>

      <h3 style="margin:0 0 10px;font-size:14px;color:#0F172A;">How to set it up</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin:0 0 20px;">
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:12px 16px;color:#64748B;width:28px;vertical-align:top;">1</td>
          <td style="padding:12px 16px 12px 0;color:#0F172A;">Open your email inbox (the one that already receives M-Pesa and/or bank payment confirmations).</td>
        </tr>
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:12px 16px;color:#64748B;width:28px;vertical-align:top;">2</td>
          <td style="padding:12px 16px 12px 0;color:#0F172A;">Create a forwarding rule (Gmail: Settings &rarr; Forwarding and POP/IMAP. Outlook: Settings &rarr; Mail &rarr; Forwarding) that auto-forwards M-Pesa and bank confirmation emails to the address above.</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#64748B;width:28px;vertical-align:top;">3</td>
          <td style="padding:12px 16px 12px 0;color:#0F172A;">That's it — every matching confirmation that arrives from then on gets read, matched to the right tenant, and recorded automatically.</td>
        </tr>
      </table>

      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#16A34A;font-weight:600;margin:0 0 20px;">
        We never touch your money — it keeps going straight to your own M-Pesa or bank account.
      </div>

      ${emailButton('Open your dashboard', 'https://www.kodipap.com/app')}
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
      to: [landlord.email],
      subject: "You're active — set up payment forwarding to finish",
      html,
    }),
  });

  if (!res.ok) {
    console.error(`Resend send failed (${res.status}): ${await res.text()}`);
    return jsonResponse({ error: 'Could not send the activation email' }, 500);
  }

  return jsonResponse({ ok: true });
});
