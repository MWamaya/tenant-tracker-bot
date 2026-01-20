import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getUser } from '../_shared/supabase.ts';

// M-Pesa C2B URL Registration
// This registers confirmation and validation URLs with Safaricom

const MPESA_C2B_REGISTER_URL = 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl';
const MPESA_SANDBOX_C2B_REGISTER_URL = 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl';

interface RegisterRequest {
  shortcode: string;
  response_type?: 'Completed' | 'Cancelled';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify user is authenticated
    const auth = await getUser(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RegisterRequest = await req.json();

    // Get M-Pesa credentials
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    const environment = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';

    if (!consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({ error: 'M-Pesa credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth token
    const authUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${credentials}` },
    });

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to get M-Pesa access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await authResponse.json();

    // Build callback URLs
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const callbackUrl = `${supabaseUrl}/functions/v1/mpesa-callback`;

    // Register URLs with M-Pesa
    const registerUrl = environment === 'production' ? MPESA_C2B_REGISTER_URL : MPESA_SANDBOX_C2B_REGISTER_URL;

    const registerPayload = {
      ShortCode: body.shortcode,
      ResponseType: body.response_type || 'Completed',
      ConfirmationURL: callbackUrl,
      ValidationURL: callbackUrl,
    };

    const registerResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerPayload),
    });

    const result = await registerResponse.json();

    if (!registerResponse.ok || result.errorCode) {
      return new Response(
        JSON.stringify({ 
          error: 'URL registration failed', 
          details: result.errorMessage || result 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'C2B URLs registered successfully',
        confirmation_url: callbackUrl,
        validation_url: callbackUrl,
        response: result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in mpesa-c2b-register:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
