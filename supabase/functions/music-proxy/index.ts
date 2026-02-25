import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
