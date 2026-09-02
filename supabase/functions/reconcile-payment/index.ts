import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUser } from '../_shared/supabase.ts';
import { reconcilePayment, ReconcileError, ReconcileRequest } from '../_shared/reconcilePayment.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const auth = await getUser(req);
  if (!auth) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body: ReconcileRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const supabase = createServiceClient();

  try {
    const result = await reconcilePayment(supabase, auth.user.id, body);
    return jsonResponse({ success: true, ...result });
  } catch (error) {
    if (error instanceof ReconcileError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    console.error('Error in reconcile-payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: 'Internal server error', details: message }, 500);
  }
});
