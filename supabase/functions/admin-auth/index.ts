import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { username, password, action, notificationTitle, notificationBody, notificationImage, notificationId } = body;

    // ── Mandatory auth: check JWT + admin role in DB ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Use getUser() for reliable JWT validation
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Login action ──
    if (action === "login") {
      if (isRateLimited(userId)) {
        return new Response(JSON.stringify({ error: "Too many login attempts. Try again in 1 minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminUser = Deno.env.get("ADMIN_USERNAME");
      const adminPass = Deno.env.get("ADMIN_PASSWORD");
      if (!adminUser || !adminPass) {
        return new Response(JSON.stringify({ error: "Admin not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (username !== adminUser || password !== adminPass) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = serviceClient;

    // ── Notification actions ──
    if (action === "send_notification") {
      if (!notificationTitle || !notificationBody) {
        return new Response(JSON.stringify({ error: "Title and body required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (String(notificationTitle).length > 200) {
        return new Response(JSON.stringify({ error: "Title too long (max 200 chars)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (String(notificationBody).length > 2000) {
        return new Response(JSON.stringify({ error: "Body too long (max 2000 chars)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error: insertErr } = await supabase.from("notifications").insert({
        title: String(notificationTitle).slice(0, 200),
        body: String(notificationBody).slice(0, 2000),
        image_url: notificationImage ? String(notificationImage).slice(0, 500) : null,
      }).select().single();
      if (insertErr) throw insertErr;
      return new Response(JSON.stringify({ success: true, notification: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_notifications") {
      const { data } = await supabase.from("notifications")
        .select("*").order("created_at", { ascending: false }).limit(30);
      return new Response(JSON.stringify({ notifications: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_notification" && notificationId) {
      await supabase.from("notifications").delete().eq("id", notificationId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Enhanced analytics action ──
    if (action === "analytics") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

      // Core counts
      const [
        { count: totalUsers },
        { count: totalPlays },
        { count: totalLikes },
        { count: totalPlaylists },
        { count: playsToday },
        { count: playsThisWeek },
        { count: playsThisMonth },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("recently_played").select("*", { count: "exact", head: true }),
        supabase.from("liked_songs").select("*", { count: "exact", head: true }),
        supabase.from("playlists").select("*", { count: "exact", head: true }),
        supabase.from("recently_played").select("*", { count: "exact", head: true }).gte("played_at", todayStart),
        supabase.from("recently_played").select("*", { count: "exact", head: true }).gte("played_at", weekStart),
        supabase.from("recently_played").select("*", { count: "exact", head: true }).gte("played_at", monthStart),
      ]);

      // DAU / MAU from recently_played (distinct user_ids)
      const { data: dauData } = await supabase.from("recently_played")
        .select("user_id").gte("played_at", todayStart).limit(1000);
      const dau = new Set((dauData || []).map(r => r.user_id)).size;

      const { data: mauData } = await supabase.from("recently_played")
        .select("user_id").gte("played_at", monthStart).limit(1000);
      const mau = new Set((mauData || []).map(r => r.user_id)).size;

      // New users this month
      const { count: newUsersMonth } = await supabase.from("profiles")
        .select("*", { count: "exact", head: true }).gte("created_at", monthStart);

      // User growth - monthly signups for current year
      const { data: yearProfiles } = await supabase.from("profiles")
        .select("created_at").gte("created_at", yearStart).order("created_at", { ascending: true }).limit(1000);
      
      const monthlyGrowth: Record<string, number> = {};
      (yearProfiles || []).forEach(p => {
        const key = p.created_at.substring(0, 7);
        monthlyGrowth[key] = (monthlyGrowth[key] || 0) + 1;
      });

      // Daily plays for last 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
      const { data: recentPlays } = await supabase.from("recently_played")
        .select("played_at").gte("played_at", thirtyDaysAgo).order("played_at", { ascending: true }).limit(1000);
      
      const dailyPlays: Record<string, number> = {};
      (recentPlays || []).forEach(p => {
        const day = p.played_at.substring(0, 10);
        dailyPlays[day] = (dailyPlays[day] || 0) + 1;
      });

      // Hourly distribution (peak hours) from last 7 days
      const { data: weekPlays } = await supabase.from("recently_played")
        .select("played_at").gte("played_at", weekStart).limit(1000);
      
      const hourlyDist = new Array(24).fill(0);
      (weekPlays || []).forEach(p => {
        const hour = new Date(p.played_at).getHours();
        hourlyDist[hour]++;
      });

      // Listening time estimate (minutes) - aggregate
      const totalListeningMinutes = Math.round((totalPlays || 0) * 3.5);
      const monthlyListeningMinutes = Math.round((playsThisMonth || 0) * 3.5);
      const weeklyListeningMinutes = Math.round((playsThisWeek || 0) * 3.5);

      // Avg songs per session estimate
      let avgSongsPerSession = 0;
      let avgSessionDuration = 0;
      if (weekPlays && weekPlays.length > 1) {
        const sorted = weekPlays.map(p => new Date(p.played_at).getTime()).sort((a, b) => a - b);
        let sessions = 1;
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] - sorted[i - 1] > 30 * 60 * 1000) sessions++;
        }
        avgSongsPerSession = Math.round((weekPlays.length / sessions) * 10) / 10;
        avgSessionDuration = Math.round((weekPlays.length * 3.5) / sessions);
      }

      // Top artists (aggregated, no user-level data)
      const { data: topArtists } = await supabase.from("listening_stats")
        .select("artist_name, play_count")
        .order("play_count", { ascending: false }).limit(10);

      // Top tracks (aggregated)
      const { data: topTracks } = await supabase.from("listening_stats")
        .select("track_name, artist_name, play_count")
        .order("play_count", { ascending: false }).limit(10);

      return new Response(JSON.stringify({
        totalUsers: totalUsers || 0,
        dau,
        mau,
        newUsersMonth: newUsersMonth || 0,
        totalPlays: totalPlays || 0,
        totalLikes: totalLikes || 0,
        totalPlaylists: totalPlaylists || 0,
        playsToday: playsToday || 0,
        totalListeningMinutes,
        monthlyListeningMinutes,
        weeklyListeningMinutes,
        monthlyGrowth,
        dailyPlays,
        hourlyDist,
        avgSongsPerSession,
        avgSessionDuration,
        topArtists: topArtists || [],
        topTracks: topTracks || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Default: return basic stats (legacy) ──
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: activeToday } = await supabase.from("recently_played").select("user_id", { count: "exact", head: true }).gte("played_at", todayStart);
    const { count: activeWeek } = await supabase.from("recently_played").select("user_id", { count: "exact", head: true }).gte("played_at", weekStart);
    const { count: activeMonth } = await supabase.from("recently_played").select("user_id", { count: "exact", head: true }).gte("played_at", monthStart);
    const { count: newToday } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart);
    const { count: newMonth } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStart);
    const { count: totalPlays } = await supabase.from("recently_played").select("*", { count: "exact", head: true });
    const { count: totalLikes } = await supabase.from("liked_songs").select("*", { count: "exact", head: true });
    const { count: totalPlaylists } = await supabase.from("playlists").select("*", { count: "exact", head: true });
    const { data: topArtists } = await supabase.from("listening_stats").select("artist_name, play_count").order("play_count", { ascending: false }).limit(10);
    const { data: topTracks } = await supabase.from("listening_stats").select("track_name, artist_name, play_count").order("play_count", { ascending: false }).limit(10);

    const { data: rawRecentUsers } = await supabase.from("profiles")
      .select("created_at, total_listens, streak_days")
      .order("created_at", { ascending: false }).limit(10);

    const recentUsers = (rawRecentUsers || []).map((u: { created_at: string; total_listens: number; streak_days: number }, i: number) => ({
      label: `User ${i + 1}`,
      created_at: u.created_at,
      total_listens: u.total_listens,
      streak_days: u.streak_days,
    }));

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const { data: recentPlays } = await supabase.from("recently_played").select("played_at").gte("played_at", thirtyDaysAgo).order("played_at", { ascending: true });
    const dailyPlays: Record<string, number> = {};
    (recentPlays || []).forEach((p: { played_at: string }) => {
      const day = p.played_at.substring(0, 10);
      dailyPlays[day] = (dailyPlays[day] || 0) + 1;
    });

    return new Response(JSON.stringify({
      totalUsers: totalUsers || 0, activeToday: activeToday || 0, activeWeek: activeWeek || 0,
      activeMonth: activeMonth || 0, newToday: newToday || 0, newMonth: newMonth || 0,
      totalPlays: totalPlays || 0, totalLikes: totalLikes || 0, totalPlaylists: totalPlaylists || 0,
      topArtists: topArtists || [], topTracks: topTracks || [], recentUsers, dailyPlays,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
