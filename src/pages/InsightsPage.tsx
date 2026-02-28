import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Music, TrendingUp, Flame, User, Play, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useSocial';
import { usePlayer } from '@/contexts/PlayerContext';
import { useRecentlyPlayed } from '@/hooks/useLibrary';
import { cn } from '@/lib/utils';
import { useState, memo } from 'react';
import { Track } from '@/types/music';
import { Skeleton } from '@/components/ui/skeleton';

/* ─── Time Filter Tabs ─── */
const TIME_FILTERS = ['This Month', 'Last 6 Months', 'This Year', 'All Time'] as const;
type TimeFilter = typeof TIME_FILTERS[number];

function getDateRange(filter: TimeFilter): string | null {
  const now = new Date();
  switch (filter) {
    case 'This Month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d.toISOString();
    }
    case 'Last 6 Months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d.toISOString();
    }
    case 'This Year': {
      const d = new Date(now.getFullYear(), 0, 1);
      return d.toISOString();
    }
    case 'All Time':
      return null;
  }
}

const FilterTabs = memo(({ active, onChange }: { active: TimeFilter; onChange: (f: TimeFilter) => void }) => {
  const activeIdx = TIME_FILTERS.indexOf(active);
  return (
    <div className="relative flex gap-1 p-1 rounded-xl bg-secondary/50 overflow-x-auto scrollbar-hide">
      {TIME_FILTERS.map((f, i) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={cn(
            'relative z-10 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
            active === f ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {active === f && (
            <motion.div
              layoutId="insight-tab"
              className="absolute inset-0 rounded-lg bg-primary"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10">{f}</span>
        </button>
      ))}
    </div>
  );
});
FilterTabs.displayName = 'FilterTabs';

/* ─── Stat Card ─── */
const StatCard = ({ icon: Icon, label, value, gradient }: {
  icon: any; label: string; value: string | number; gradient: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl p-4 space-y-1.5"
    style={{ background: gradient }}
  >
    <Icon className="h-4 w-4 text-foreground/70" />
    <p className="text-2xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
  </motion.div>
);

/* ─── Main Page ─── */
const InsightsPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { play } = usePlayer();
  const { recentlyPlayed } = useRecentlyPlayed();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All Time');

  const dateFrom = getDateRange(timeFilter);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['insights-stats', user?.id, timeFilter],
    queryFn: async () => {
      let listenQuery = supabase.from('listening_stats').select('*').order('play_count', { ascending: false }).limit(100);
      let recentQuery = supabase.from('recently_played').select('*').order('played_at', { ascending: false }).limit(500);

      if (dateFrom) {
        listenQuery = listenQuery.gte('last_played_at', dateFrom);
        recentQuery = recentQuery.gte('played_at', dateFrom);
      }

      const [{ data: listenStats }, { data: recentPlays }] = await Promise.all([
        listenQuery,
        recentQuery,
      ]);

      // Top songs
      const topSongs = (listenStats || []).slice(0, 10).map(s => ({
        name: s.track_name,
        artist: s.artist_name,
        plays: s.play_count,
        trackId: s.track_id,
        artistId: s.artist_id,
        albumName: s.album_name,
      }));

      // Top artists
      const artistMap: Record<string, { count: number; artistId: string }> = {};
      (listenStats || []).forEach(s => {
        if (!artistMap[s.artist_name]) artistMap[s.artist_name] = { count: 0, artistId: s.artist_id };
        artistMap[s.artist_name].count += s.play_count;
      });
      const topArtists = Object.entries(artistMap)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([name, data]) => ({ name, count: data.count, artistId: data.artistId }));

      // Stats
      const totalPlays = (listenStats || []).reduce((sum, s) => sum + s.play_count, 0);
      const totalMinutes = Math.round(totalPlays * 3.5);

      // Active listening days
      const uniqueDays = new Set<string>();
      (recentPlays || []).forEach(r => {
        uniqueDays.add(new Date(r.played_at).toDateString());
      });

      return { topSongs, topArtists, totalMinutes, totalPlays, activeDays: uniqueDays.size };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  if (loading) return null;

  if (!user) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="glass rounded-3xl p-8 text-center space-y-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Sign in to view your insights</h2>
          <p className="text-muted-foreground text-sm">Track your listening habits and discover your music DNA.</p>
          <Button onClick={() => navigate('/auth')} className="bg-primary rounded-xl glow-primary">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-36">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Your Music Insights</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Deep dive into your listening habits</p>
      </motion.div>

      {/* Time Filter */}
      <FilterTabs active={timeFilter} onChange={setTimeFilter} />

      {/* Listening Time Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={Clock} label="Minutes Listened"
          value={loadingStats ? '—' : stats?.totalMinutes || 0}
          gradient="linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--muted)) 100%)"
        />
        <StatCard
          icon={Music} label="Tracks Played"
          value={loadingStats ? '—' : stats?.totalPlays || 0}
          gradient="linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--muted)) 100%)"
        />
        <StatCard
          icon={Flame} label="Active Days"
          value={loadingStats ? '—' : stats?.activeDays || 0}
          gradient="linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--muted)) 100%)"
        />
      </div>

      {/* Top Songs */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`songs-${timeFilter}`}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Top Songs</h2>
          </div>
          {loadingStats ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.topSongs && stats.topSongs.length > 0 ? (
            <div className="space-y-1">
              {stats.topSongs.map((s, i) => (
                <motion.button
                  key={s.trackId}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-3 w-full py-2 px-1 rounded-xl text-left active:bg-secondary/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-5 text-right font-mono font-bold">{i + 1}</span>
                  <div className="h-11 w-11 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.artist}</p>
                  </div>
                  <span className="text-[11px] text-primary font-semibold">{s.plays}×</span>
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No data yet. Start listening!</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Top Artists */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`artists-${timeFilter}`}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Top Artists</h2>
          </div>
          {loadingStats ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
              ))}
            </div>
          ) : stats?.topArtists && stats.topArtists.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1" style={{ scrollbarWidth: 'none' }}>
              {stats.topArtists.map((a, i) => (
                <motion.button
                  key={a.name}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/artist/${a.artistId}`)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[72px]"
                >
                  <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center ring-2 ring-primary/20">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] font-semibold text-foreground truncate max-w-[72px]">{a.name}</p>
                  <p className="text-[9px] text-muted-foreground">{a.count} plays</p>
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Recently Played */}
      {recentlyPlayed && recentlyPlayed.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Recently Played</h2>
          </div>
          <div className="space-y-1">
            {recentlyPlayed.slice(0, 10).map((track) => (
              <motion.button
                key={track.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => play(track, recentlyPlayed)}
                className="flex items-center gap-3 w-full py-2 px-1 rounded-xl text-left active:bg-secondary/50 transition-colors"
              >
                <img
                  src={track.album_image || ''}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover bg-secondary flex-shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground truncate">{track.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{track.artist_name}</p>
                </div>
                <Play className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default InsightsPage;
