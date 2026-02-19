import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { listeningHistory, likedArtists, action } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "recommendations") {
      systemPrompt = `You are a music recommendation AI. Given a user's listening history and favorite artists, suggest 5 track search queries they might enjoy. Return ONLY a JSON array of objects with "query" (search term) and "reason" (1 sentence why). Example: [{"query":"chill electronic ambient","reason":"Based on your love of ambient tracks"}]. No markdown, just JSON.`;
      userPrompt = `Listening history (recent tracks): ${JSON.stringify(listeningHistory?.slice(0, 15) || [])}
Liked artists: ${JSON.stringify(likedArtists?.slice(0, 10) || [])}`;
    } else if (action === "daily_mix") {
      systemPrompt = `You are a playlist curator AI. Given listening data, create 3 themed mini-playlists. Return ONLY a JSON array of objects with "name" (creative playlist name), "description" (1 sentence), and "search_queries" (array of 3 search terms to find tracks). No markdown, just JSON.`;
      userPrompt = `User's recent listening: ${JSON.stringify(listeningHistory?.slice(0, 20) || [])}
Favorite artists: ${JSON.stringify(likedArtists?.slice(0, 10) || [])}`;
    } else if (action === "mood") {
      systemPrompt = `You are a mood-based music curator. Given a mood, suggest 5 genre/tag search queries that match. Return ONLY a JSON array of strings (search queries). No markdown, just JSON.`;
      userPrompt = `Mood: ${action}. Additional context: ${JSON.stringify(listeningHistory?.slice(0, 5) || [])}`;
    } else {
      throw new Error("Unknown action: " + action);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse JSON from response, handling potential markdown wrapping
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = [];
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("music-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
