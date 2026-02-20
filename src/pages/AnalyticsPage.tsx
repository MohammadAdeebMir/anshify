import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Music, TrendingUp, Flame, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareCard } from '@/components/ShareCard';
import { useProfile } from '@/hooks/useSocial';
import { cn } from '@/lib/utils';

const AnalyticsPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const { data: stats } = useQuery({
    queryKey: ['analytics-stats', user?.id],
    queryFn: async () => {
      const [{ data: listenStats }, { data: recentPlays }, { data: liked }] = await Promise.all([
        supabase.from('listening_stats').select('*').order('play_count', { ascending: false }).limit(50),
        supabase.from('recently_played').select('*').order('played_at', { ascending: false }).limit(200),
        supabase.from('liked_songs').select('artist_name').limit(100),
      ]);

      // Top songs
      const topSongs = (listenStats || []).slice(0, 10).map(s => ({
        name: s.track_name, artist: s.artist_name, plays: s.play_count,
      }));

      // Top artists from listening stats
      const artistMap: Record<string, number> = {};
      (listenStats || []).forEach(s => {
        artistMap[s.artist_name] = (artistMap[s.artist_name] || 0) + s.play_count;
      });
      const topArtists = Object.entries(artistMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      // Total minutes (estimate: avg 3.5 min per play)
      const totalPlays = (listenStats || []).reduce((sum, s) => sum + s.play_count, 0);
      const totalMinutes = Math.round(totalPlays * 3.5);

      // Heatmap: plays by hour
      const heatmap = new Array(24).fill(0);
      (recentPlays || []).forEach(r => {
        const hour = new Date(r.played_at).getHours();
        heatmap[hour]++;
      });
      const maxHeat = Math.max(...heatmap, 1);

      // Top genres from tags
      const genreMap: Record<string, number> = {};
      (listenStats || []).forEach(s => {
        (s.genre_tags || []).forEach(tag => {
          genreMap[tag] = (genreMap[tag] || 0) + s.play_count;
        });
      });
      const topGenres = Object.entries(genreMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));

      return { topSongs, topArtists, totalMinutes, totalPlays, heatmap, maxHeat, topGenres };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (loading) return null;

  if (!user) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="glass rounded-3xl p-8 text-center space-y-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Sign in to view analytics</h2>
          <Button onClick={() => navigate('/auth')} className="bg-primary rounded-xl">Sign In</Button>
        </div>
      </div>
    );
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Your Analytics</h1>
        </div>
        <p className="text-muted-foreground text-sm">Insights into your listening habits</p>
      </motion.div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Clock, label: 'Minutes Listened', value: stats?.totalMinutes || 0 },
          { icon: Music, label: 'Total Plays', value: stats?.totalPlays || 0 },
          { icon: Flame, label: 'Day Streak', value: profile?.streak_days || 0 },
          { icon: TrendingUp, label: 'Top Artists', value: stats?.topArtists?.length || 0 },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4 space-y-1"
          >
            <card.icon className="h-4 w-4 text-primary" />
            <p className="text-2xl font-bold text-foreground">{card.value.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Heatmap */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Listening Activity</h2>
          <div className="flex gap-1 items-end h-24">
            {hours.map(h => {
              const val = stats.heatmap[h] / stats.maxHeat;
              return (
                <div key={h} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: `${Math.max(4, val * 80)}px`,
                      background: `hsl(var(--primary) / ${0.2 + val * 0.8})`,
                    }}
                  />
                  {h % 4 === 0 && <span className="text-[8px] text-muted-foreground">{h}</span>}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Hours of the day (24h)</p>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Songs */}
        {stats?.topSongs && stats.topSongs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" /> Most Played
            </h2>
            <div className="space-y-2">
              {stats.topSongs.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 text-right font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.artist}</p>
                  </div>
                  <span className="text-[10px] text-primary font-medium">{s.plays}×</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Artists */}
        {stats?.topArtists && stats.topArtists.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Top Artists
            </h2>
            <div className="space-y-2">
              {stats.topArtists.map((a, i) => {
                const maxCount = stats.topArtists[0]?.count || 1;
                return (
                  <div key={a.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground">{a.name}</span>
                      <span className="text-[10px] text-muted-foreground">{a.count} plays</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(a.count / maxCount) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                        className="h-full rounded-full bg-primary/70"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Top Genres */}
      {stats?.topGenres && stats.topGenres.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Top Genres</h2>
          <div className="flex flex-wrap gap-2">
            {stats.topGenres.map(g => (
              <span key={g.name} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/15 text-primary">
                {g.name} · {g.count}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Share card */}
      {stats && profile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Share Your Stats</h2>
          <ShareCard
            type="stats"
            stats={{
              totalPlays: stats.totalPlays,
              topArtists: stats.topArtists,
              streak: profile.streak_days,
            }}
          />
        </motion.div>
      )}
    </div>
  );
};

export default AnalyticsPage;
