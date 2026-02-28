import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation limits
const MAX_PROMPT_LENGTH = 500;
const MAX_LYRICS_LENGTH = 5000;
const MAX_TARGET_LANG_LENGTH = 50;
const MAX_HISTORY_ITEMS = 20;
const MAX_LIKED_ARTISTS = 10;

function sanitizeText(text: string): string {
  // Remove control characters and trim
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function badRequestResponse(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { listeningHistory, likedArtists, action, prompt, lyrics, targetLang } = await req.json();

    // Validate action
    const validActions = ["recommendations", "daily_mix", "prompt_playlist", "translate_lyrics", "mood"];
    if (!action || !validActions.includes(action)) {
      return badRequestResponse("Invalid action");
    }

    // Validate and sanitize inputs based on action
    if (action === "prompt_playlist") {
      if (!prompt || typeof prompt !== "string") return badRequestResponse("Prompt is required");
      if (prompt.length > MAX_PROMPT_LENGTH) return badRequestResponse(`Prompt must be under ${MAX_PROMPT_LENGTH} characters`);
    }

    if (action === "translate_lyrics") {
      if (!lyrics || typeof lyrics !== "string") return badRequestResponse("Lyrics are required");
      if (lyrics.length > MAX_LYRICS_LENGTH) return badRequestResponse(`Lyrics must be under ${MAX_LYRICS_LENGTH} characters`);
      if (!targetLang || typeof targetLang !== "string") return badRequestResponse("Target language is required");
      if (targetLang.length > MAX_TARGET_LANG_LENGTH) return badRequestResponse("Invalid target language");
    }

    // Sanitize inputs
    const safePrompt = prompt ? sanitizeText(String(prompt).slice(0, MAX_PROMPT_LENGTH)) : "";
    const safeLyrics = lyrics ? sanitizeText(String(lyrics).slice(0, MAX_LYRICS_LENGTH)) : "";
    const safeLang = targetLang ? sanitizeText(String(targetLang).slice(0, MAX_TARGET_LANG_LENGTH)) : "";
    const safeHistory = Array.isArray(listeningHistory) ? listeningHistory.slice(0, MAX_HISTORY_ITEMS) : [];
    const safeArtists = Array.isArray(likedArtists) ? likedArtists.slice(0, MAX_LIKED_ARTISTS) : [];

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "recommendations") {
      systemPrompt = `You are a music recommendation AI. Given a user's listening history and favorite artists, suggest 5 track search queries they might enjoy. Return ONLY a JSON array of objects with "query" (search term) and "reason" (1 sentence why). Example: [{"query":"chill electronic ambient","reason":"Based on your love of ambient tracks"}]. No markdown, just JSON.`;
      userPrompt = `Listening history (recent tracks): ${JSON.stringify(safeHistory)}
Liked artists: ${JSON.stringify(safeArtists)}`;
    } else if (action === "daily_mix") {
      systemPrompt = `You are a playlist curator AI. Given listening data, create 3 themed mini-playlists. Return ONLY a JSON array of objects with "name" (creative playlist name), "description" (1 sentence), and "search_queries" (array of 3 search terms to find tracks). No markdown, just JSON.`;
      userPrompt = `User's recent listening: ${JSON.stringify(safeHistory)}
Favorite artists: ${JSON.stringify(safeArtists)}`;
    } else if (action === "prompt_playlist") {
      systemPrompt = `You are a music search query generator. Given a natural language description of a playlist mood/vibe, generate 5 search queries that would find matching songs on a music platform. Return ONLY a JSON array of strings (search queries). No markdown, no explanation, just the JSON array. The queries should be diverse and cover different aspects of the request.`;
      userPrompt = `Create a playlist for: "${safePrompt}"`;
    } else if (action === "translate_lyrics") {
      systemPrompt = `You are a lyrics translator. Translate the given song lyrics to the target language. Preserve formatting and line breaks. Return ONLY the translated text, no explanation.`;
      userPrompt = `Translate to ${safeLang}:\n\n${safeLyrics}`;
    } else if (action === "mood") {
      systemPrompt = `You are a mood-based music curator. Given a mood, suggest 5 genre/tag search queries that match. Return ONLY a JSON array of strings (search queries). No markdown, just JSON.`;
      userPrompt = `Mood: ${action}. Additional context: ${JSON.stringify(safeHistory.slice(0, 5))}`;
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
    
    // For translate_lyrics, return raw text
    if (action === "translate_lyrics") {
      return new Response(JSON.stringify({ result: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON from response
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
