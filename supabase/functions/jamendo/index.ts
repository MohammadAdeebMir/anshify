import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('JAMENDO_CLIENT_ID');
    if (!clientId) throw new Error('JAMENDO_CLIENT_ID not configured');

    const { endpoint, params } = await req.json();
    
    if (!endpoint) throw new Error('Missing endpoint parameter');

    const searchParams = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      ...params,
    });

    const url = `${JAMENDO_BASE}/${endpoint}?${searchParams.toString()}`;
    console.log('Jamendo request:', url);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      console.error('Jamendo API error:', response.status, text);
      throw new Error(`Jamendo API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
