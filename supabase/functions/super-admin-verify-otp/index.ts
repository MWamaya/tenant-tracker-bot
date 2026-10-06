// supabase/functions/super-admin-verify-otp/index.ts
// Runs with no session — the client dropped it right after request-otp —
// so the caller is identified by email, same as a password reset flow.
// This only ever confirms whether the code is right; the client still has
// to call signInWithPassword again itself to get a real session back.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

const MAX_ATTEMPTS = 5;

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

interface VerifyPayload {
  email?: unknown;
  code?: unknown;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: VerifyPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid request' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';

  if (!email || !/^\d{6}$/.test(code)) {
    return jsonResponse({ ok: false, error: 'Enter the 6-digit code.' }, 400);
  }

  const serviceClient = createServiceClient();

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profile) {
    // Same generic message as a bad code — don't reveal whether the email
    // exists.
    return jsonResponse({ ok: false, error: 'Incorrect or expired code.' }, 400);
  }

  const { data: roleRow } = await serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', profile.id)
    .eq('role', 'SUPER_ADMIN')
    .maybeSingle();

  if (!roleRow) {
    return jsonResponse({ ok: false, error: 'Incorrect or expired code.' }, 400);
  }

  const { data: otpRow } = await serviceClient
    .from('super_admin_otp_codes')
    .select('id, code_hash, attempt_count, expires_at, consumed_at')
    .eq('user_id', profile.id)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow || new Date(otpRow.expires_at).getTime() < Date.now()) {
    return jsonResponse({ ok: false, error: 'Code expired. Request a new one.' }, 400);
  }

  if (otpRow.attempt_count >= MAX_ATTEMPTS) {
    return jsonResponse({ ok: false, error: 'Too many attempts. Request a new code.' }, 400);
  }

  const codeHash = await hashCode(code);
  if (codeHash !== otpRow.code_hash) {
    await serviceClient
      .from('super_admin_otp_codes')
      .update({ attempt_count: otpRow.attempt_count + 1 })
      .eq('id', otpRow.id);
    return jsonResponse({ ok: false, error: 'Incorrect code.' }, 400);
  }

  await serviceClient
    .from('super_admin_otp_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', otpRow.id);

  return jsonResponse({ ok: true });
});
