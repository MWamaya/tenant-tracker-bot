// Consumes an OTP and authorizes only the session that requested it.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUser } from '../_shared/supabase.ts';
import { sessionIdFromVerifiedRequest } from '../_shared/adminSession.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const auth = await getUser(req);
  if (!auth) return jsonResponse({ ok: false, error: 'Not authenticated' }, 401);
  const sessionId = sessionIdFromVerifiedRequest(req, auth.user.id);
  if (!sessionId) return jsonResponse({ ok: false, error: 'A valid sign-in session is required.' }, 401);

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid request' }, 400);
  }
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!/^\d{6}$/.test(code)) return jsonResponse({ ok: false, error: 'Enter the 6-digit code.' }, 400);

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const { data, error } = await createServiceClient().rpc('verify_super_admin_otp', {
    p_user_id: auth.user.id, p_session_id: sessionId, p_code_hash: hash,
  });
  if (error) {
    console.error('OTP verification failed:', error.message);
    return jsonResponse({ ok: false, error: 'Could not verify this session. Try again.' }, 500);
  }
  if (data !== true) return jsonResponse({ ok: false, error: 'Incorrect or expired code. Request a new code if needed.' }, 400);
  return jsonResponse({ ok: true });
});
