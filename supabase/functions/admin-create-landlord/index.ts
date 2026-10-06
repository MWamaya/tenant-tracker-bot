// supabase/functions/admin-create-landlord/index.ts
// Lets a super admin create a landlord account from the admin UI — either
// a blank "Add Landlord" form, or "Create account" on an onboarding
// request (which also marks that request converted on success).
//
// Creates the auth user via inviteUserByEmail, which emails the landlord a
// link to set their own password — no temp password for the admin to
// relay. profiles/user_roles are populated automatically by the existing
// handle_new_user trigger on auth.users from the metadata passed here.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface CreateLandlordPayload {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  companyName?: unknown;
  onboardingRequestId?: unknown;
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

  let body: CreateLandlordPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
  const onboardingRequestId =
    typeof body.onboardingRequestId === 'string' ? body.onboardingRequestId : undefined;

  if (!fullName) {
    return jsonResponse({ error: 'Enter a full name.' }, 400);
  }
  if (!email || !EMAIL_RE.test(email)) {
    return jsonResponse({ error: 'Enter a valid email address.' }, 400);
  }

  const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name: fullName,
        phone: phone || null,
        company_name: companyName || null,
      },
    },
  );

  if (inviteError || !invited.user) {
    const message = inviteError?.message || 'Could not create the account.';
    const alreadyExists = /already.*registered|already exists/i.test(message);
    return jsonResponse(
      { error: alreadyExists ? 'An account with this email already exists.' : message },
      alreadyExists ? 409 : 500,
    );
  }

  if (onboardingRequestId) {
    await serviceClient
      .from('onboarding_requests')
      .update({ status: 'converted' })
      .eq('id', onboardingRequestId);
  }

  await serviceClient.from('audit_logs').insert({
    admin_id: caller.id,
    action: 'CREATE_LANDLORD',
    entity_type: 'profile',
    entity_id: invited.user.id,
    new_values: { full_name: fullName, email, onboarding_request_id: onboardingRequestId || null },
  });

  return jsonResponse({ ok: true, landlordId: invited.user.id });
});
