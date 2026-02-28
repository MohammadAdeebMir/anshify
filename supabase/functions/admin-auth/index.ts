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

    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(jwtToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
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

    // ── Optional: verify admin credentials on login action ──
    if (action === "login") {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Input validation for notifications ──
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

    // ── List notifications ──
    if (action === "list_notifications") {
      const { data } = await supabase.from("notifications")
        .select("*").order("created_at", { ascending: false }).limit(30);
      return new Response(JSON.stringify({ notifications: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Delete notification ──
    if (action === "delete_notification" && notificationId) {
      await supabase.from("notifications").delete().eq("id", notificationId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Default: return anonymized stats ──
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

    // Anonymized recent signups: only show join date and aggregate stats, no PII
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
