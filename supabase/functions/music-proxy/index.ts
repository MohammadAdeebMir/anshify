import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BACKENDS = [
  "https://api.anshify.store",
  "http://140.238.167.236:8000",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");

  if (!endpoint || !["search", "stream"].includes(endpoint)) {
    return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const params = new URLSearchParams();
  url.searchParams.forEach((v, k) => {
    if (k !== "endpoint") params.set(k, v);
  });

  let lastError: Error | null = null;

  for (const backend of BACKENDS) {
    const backendUrl = `${backend}/${endpoint}?${params.toString()}`;
    console.log(`Trying: ${backendUrl}`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(backendUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.status >= 500) {
        lastError = new Error(`Server error ${res.status}`);
        continue;
      }

      const body = await res.text();
      console.log(`Success from ${backend}`);
      return new Response(body, {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.warn(`Failed ${backend}:`, err.message);
      lastError = err;
    }
  }

  console.error("All backends failed:", lastError?.message);
  return new Response(JSON.stringify({ error: "Backend unreachable" }), {
    status: 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
