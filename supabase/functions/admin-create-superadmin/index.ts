// supabase/functions/admin-create-superadmin/index.ts
// Lets an existing super admin invite another one. Creates the auth user
// via inviteUserByEmail (same as admin-create-landlord — emails them a
// link to set their own password). The on_auth_user_created trigger always
// gives new users a profiles row + LANDLORD_ADMIN role; that's a harmless
// leftover for admin accounts (the Landlords list already excludes anyone
// holding SUPER_ADMIN), so this just adds the SUPER_ADMIN role on top.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface CreateSuperAdminPayload {
  fullName?: unknown;
  email?: unknown;
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
  const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
  if (callerError || !caller) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const serviceClient = createServiceClient();

  const { data: roleRow } = await serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', caller.id)
    .eq('role', 'SUPER_ADMIN')
    .maybeSingle();

  if (!roleRow) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  let body: CreateSuperAdminPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!fullName) {
    return jsonResponse({ error: 'Enter a full name.' }, 400);
  }
  if (!email || !EMAIL_RE.test(email)) {
    return jsonResponse({ error: 'Enter a valid email address.' }, 400);
  }

  const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    email,
    { data: { full_name: fullName } },
  );

  if (inviteError || !invited.user) {
    const message = inviteError?.message || 'Could not create the account.';
    const alreadyExists = /already.*registered|already exists/i.test(message);
    return jsonResponse(
      { error: alreadyExists ? 'An account with this email already exists.' : message },
      alreadyExists ? 409 : 500,
    );
  }

  const { error: roleError } = await serviceClient
    .from('user_roles')
    .insert({ user_id: invited.user.id, role: 'SUPER_ADMIN' });

  if (roleError) {
    console.error('Failed to grant SUPER_ADMIN role:', roleError);
    return jsonResponse({ error: 'Account created but granting admin access failed. Check Audit Logs.' }, 500);
  }

  await serviceClient.from('audit_logs').insert({
    admin_id: caller.id,
    action: 'CREATE_SUPER_ADMIN',
    entity_type: 'profile',
    entity_id: invited.user.id,
    new_values: { full_name: fullName, email },
  });

  return jsonResponse({ ok: true, userId: invited.user.id });
});
