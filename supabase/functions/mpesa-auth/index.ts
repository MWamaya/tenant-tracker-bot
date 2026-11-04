import { corsHeaders, handleCors } from '../_shared/cors.ts';

// Keep a tombstone so deployments replace the formerly exposed handler.
// OAuth tokens are obtained only inside server-side payment operations.
Deno.serve((req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;
  return Response.json(
    { error: 'This endpoint has been retired.' },
    { status: 410, headers: corsHeaders },
  );
});
