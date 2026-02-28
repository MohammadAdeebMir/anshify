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

// Simple in-memory rate limiter for unauthenticated requests
const guestRequests = new Map<string, { count: number; resetAt: number }>();
const GUEST_RATE_LIMIT = 30; // requests per window
const GUEST_RATE_WINDOW_MS = 60_000; // 1 minute

function isGuestRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = guestRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    guestRequests.set(ip, { count: 1, resetAt: now + GUEST_RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > GUEST_RATE_LIMIT;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Determine if user is authenticated (optional auth)
  const authHeader = req.headers.get("Authorization");
  let isAuthenticated = false;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    // Only validate if it looks like a real JWT (has 3 parts), not the anon key
    const parts = token.split(".");
    if (parts.length === 3) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
        if (!claimsError && claimsData?.claims?.sub) {
          isAuthenticated = true;
        }
      } catch {
        // Token invalid, treat as guest
      }
    }
  }

  // Rate limit unauthenticated requests
  if (!isAuthenticated) {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isGuestRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
