// supabase/functions/super-admin-request-otp/index.ts
// Called right after password sign-in succeeds, while that session's
// access token is still valid — the client drops the session immediately
// after this call returns, so dashboard access only resumes once the code
// is verified. If the caller doesn't have 2FA enabled, this is a no-op
// that just reports that back (required: false) and the client proceeds
// with the session it already has.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';
import { renderEmailLayout } from '../_shared/emailLayout.ts';

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 30;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, '0');
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const userClient = createUserClient(authHeader);
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user || !user.email) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const serviceClient = createServiceClient();

  const { data: roleRow } = await serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'SUPER_ADMIN')
    .maybeSingle();

  if (!roleRow) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const { data: settings } = await serviceClient
    .from('super_admin_two_factor')
    .select('enabled, method')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!settings?.enabled) {
    return jsonResponse({ required: false });
  }

  if (settings.method === 'sms') {
    // Not wired up yet — the Settings UI shouldn't let anyone save this,
    // but guard here too rather than silently failing to send anything.
    return jsonResponse({ error: 'SMS codes are not available yet. Switch to email in Settings.' }, 500);
  }

  const { data: recent } = await serviceClient
    .from('super_admin_otp_codes')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    return jsonResponse({ error: 'Please wait a moment before requesting another code.' }, 429);
  }

  const code = generateCode();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  const { error: insertError } = await serviceClient.from('super_admin_otp_codes').insert({
    user_id: user.id,
    code_hash: codeHash,
    method: 'email',
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('Failed to store OTP code:', insertError);
    return jsonResponse({ error: 'Could not generate a verification code. Try again.' }, 500);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return jsonResponse({ error: 'Server misconfigured — contact another admin.' }, 500);
  }

  const html = renderEmailLayout({
    preheader: `Your verification code is ${code}`,
    bodyHtml: `
      <h2 style="margin:0 0 8px;font-size:18px;color:#0F172A;">Verify it's you</h2>
      <p style="margin:0 0 20px;color:#64748B;">Enter this code to finish signing in to the Super Admin Portal. It expires in ${OTP_TTL_MINUTES} minutes.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="background-color:#F0FDFA;border:1px solid #CCFBF1;border-radius:10px;padding:16px 28px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0F766E;font-family:monospace;">${code}</span>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#94A3B8;font-size:12px;">If you didn't just try to sign in, you can ignore this email — no one can access your account without this code.</p>
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
      to: [user.email],
      subject: `Your verification code: ${code}`,
      html,
    }),
  });

  if (!res.ok) {
    console.error(`Resend send failed (${res.status}): ${await res.text()}`);
    return jsonResponse({ error: 'Could not send the verification email. Try again.' }, 500);
  }

  return jsonResponse({ required: true });
});
