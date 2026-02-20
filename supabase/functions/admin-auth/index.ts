import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password, action } = await req.json();

    const adminUser = Deno.env.get("ADMIN_USERNAME");
    const adminPass = Deno.env.get("ADMIN_PASSWORD");

    if (!adminUser || !adminPass) {
      return new Response(JSON.stringify({ error: "Admin not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (username !== adminUser || password !== adminPass) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credentials valid — fetch stats using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Active today (users who played something today)
    const { count: activeToday } = await supabase
      .from("recently_played")
      .select("user_id", { count: "exact", head: true })
      .gte("played_at", todayStart);

    // Active this week
    const { count: activeWeek } = await supabase
      .from("recently_played")
      .select("user_id", { count: "exact", head: true })
      .gte("played_at", weekStart);

    // Active this month
    const { count: activeMonth } = await supabase
      .from("recently_played")
      .select("user_id", { count: "exact", head: true })
      .gte("played_at", monthStart);

    // New users today
    const { count: newToday } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart);

    // New users this month
    const { count: newMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart);

    // Total plays
    const { count: totalPlays } = await supabase
      .from("recently_played")
      .select("*", { count: "exact", head: true });

    // Total liked songs
    const { count: totalLikes } = await supabase
      .from("liked_songs")
      .select("*", { count: "exact", head: true });

    // Total playlists
    const { count: totalPlaylists } = await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true });

    // Top artists (most played)
    const { data: topArtists } = await supabase
      .from("listening_stats")
      .select("artist_name, play_count")
      .order("play_count", { ascending: false })
      .limit(10);

    // Top tracks
    const { data: topTracks } = await supabase
      .from("listening_stats")
      .select("track_name, artist_name, play_count")
      .order("play_count", { ascending: false })
      .limit(10);

    // Recent signups (last 10)
    const { data: recentUsers } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at, total_listens, streak_days")
      .order("created_at", { ascending: false })
      .limit(10);

    // Daily play counts for the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const { data: recentPlays } = await supabase
      .from("recently_played")
      .select("played_at")
      .gte("played_at", thirtyDaysAgo)
      .order("played_at", { ascending: true });

    // Aggregate plays by day
    const dailyPlays: Record<string, number> = {};
    (recentPlays || []).forEach((p: { played_at: string }) => {
      const day = p.played_at.substring(0, 10);
      dailyPlays[day] = (dailyPlays[day] || 0) + 1;
    });

    return new Response(
      JSON.stringify({
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        activeWeek: activeWeek || 0,
        activeMonth: activeMonth || 0,
        newToday: newToday || 0,
        newMonth: newMonth || 0,
        totalPlays: totalPlays || 0,
        totalLikes: totalLikes || 0,
        totalPlaylists: totalPlaylists || 0,
        topArtists: topArtists || [],
        topTracks: topTracks || [],
        recentUsers: recentUsers || [],
        dailyPlays,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
