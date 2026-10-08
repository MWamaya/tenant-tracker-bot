// supabase/functions/admin-delete-landlord/index.ts
// Permanently deletes a landlord account. Only callable by a super admin,
// and only once the landlord is already suspended — a deliberate two-step
// gate (suspend, then delete) so this can't be a single misclick.
// Deleting the auth.users row cascades through every landlord_id FK
// (profiles, houses, tenants, payments, subscriptions, ...); audit_logs
// and webhooks_log rows are nullified instead of deleted so the trail
// survives (see migration 20261008130000_allow_landlord_deletion.sql).
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface DeleteLandlordPayload {
  landlordId?: unknown;
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

  let body: DeleteLandlordPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const landlordId = typeof body.landlordId === 'string' ? body.landlordId : '';
  if (!landlordId) {
    return jsonResponse({ error: 'Missing landlordId' }, 400);
  }

  const { data: landlord, error: landlordError } = await serviceClient
    .from('profiles')
    .select('id, full_name, company_name, account_status')
    .eq('id', landlordId)
    .maybeSingle();

  if (landlordError || !landlord) {
    return jsonResponse({ error: 'Landlord not found' }, 404);
  }

  if (landlord.account_status !== 'suspended') {
    return jsonResponse({ error: 'Account must be suspended before it can be deleted.' }, 400);
  }

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(landlordId);
  if (deleteError) {
    return jsonResponse({ error: deleteError.message || 'Could not delete the account.' }, 500);
  }

  await serviceClient.from('audit_logs').insert({
    admin_id: caller.id,
    action: 'DELETE_LANDLORD',
    entity_type: 'profile',
    entity_id: landlordId,
    old_values: {
      full_name: landlord.full_name,
      company_name: landlord.company_name,
    },
  });

  return jsonResponse({ ok: true });
});
