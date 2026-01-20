import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

// M-Pesa OAuth token endpoint
const MPESA_AUTH_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const MPESA_SANDBOX_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

interface MpesaAuthResponse {
  access_token: string;
  expires_in: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get M-Pesa credentials from secrets
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const environment = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';

    if (!consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({ error: 'M-Pesa credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create base64 encoded credentials
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    
    // Choose URL based on environment
    const authUrl = environment === 'production' ? MPESA_AUTH_URL : MPESA_SANDBOX_AUTH_URL;

    // Request OAuth token from M-Pesa
    const response = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('M-Pesa auth error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with M-Pesa', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: MpesaAuthResponse = await response.json();

    return new Response(
      JSON.stringify({
        access_token: data.access_token,
        expires_in: parseInt(data.expires_in),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in mpesa-auth:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
