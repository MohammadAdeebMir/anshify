import { memo } from 'react';
import { AppBackground } from '@/components/AppBackground';
import { motion } from 'framer-motion';
import { Radio, Play, Pause, Music2, ListMusic, Clock } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton';
import { Track } from '@/types/music';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';
import { AIPlaylistGenerator } from '@/components/AIPlaylistGenerator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

/* ─── Track Row ────────────────────────────────────────────────── */
const TrackRow = ({ track, tracks, index }: { track: Track; tracks: Track[]; index: number }) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const { user } = useAuth();
  const { likedSongs } = useLikedSongs();
  const { isLiked, toggleLike } = useLikeTrack();
  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id, likedSongs);

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-muted/50', isActive && 'bg-primary/10 ring-1 ring-primary/20')}>
      <span className="text-xs text-muted-foreground/50 w-5 text-center font-medium tabular-nums">{index + 1}</span>
      <button onClick={() => play(track, tracks)} className="flex items-center gap-3 flex-1 min-w-0 text-left group">
        <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
          {track.album_image ? (
            <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center"><Play className="h-4 w-4 text-muted-foreground" /></div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {isActive && isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold truncate', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
        </div>
      </button>
      {user && (
        <>
          <button onClick={() => toggleLike.mutate({ track, liked })} className={cn('p-2 rounded-full transition-colors', liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
          </button>
          <AddToPlaylistButton track={track} />
        </>
      )}
      {track.duration > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
        </span>
      )}
    </div>
  );
};

/* ─── Playlist Card ────────────────────────────────────────────── */
const PlaylistCard = memo(({ playlist }: { playlist: { id: string; name: string; cover_image: string | null; description: string | null; song_count: number } }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className="flex items-center gap-3 p-3 rounded-2xl text-left hover:bg-muted/40 transition-all w-full"
    >
      <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg bg-secondary/50">
        {playlist.cover_image ? (
          <img src={playlist.cover_image} alt={playlist.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ListMusic className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{playlist.name}</p>
        <p className="text-xs text-muted-foreground truncate">{playlist.song_count} songs{playlist.description ? ` · ${playlist.description}` : ''}</p>
      </div>
    </motion.button>
  );
});
PlaylistCard.displayName = 'PlaylistCard';

/* ─── Main BrowsePage ──────────────────────────────────────────── */
const BrowsePage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Most listened songs from listening_stats
  const { data: mostListened, isLoading: loadingMostListened } = useQuery({
    queryKey: ['browse-most-listened', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listening_stats')
        .select('*')
        .eq('user_id', user!.id)
        .order('play_count', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map((s, i): Track => ({
        id: s.track_id,
        name: s.track_name,
        artist_name: s.artist_name,
        artist_id: s.artist_id,
        album_name: s.album_name,
        album_id: '',
        album_image: '',
        duration: 0,
        audio: '',
        position: i,
      }));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Recently played for cover images
  const { data: recentlyPlayed } = useQuery({
    queryKey: ['browse-recently-played', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('recently_played')
        .select('track_id, album_image, audio, duration, album_id')
        .eq('user_id', user!.id)
        .order('played_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // Merge album images from recently_played into mostListened
  const enrichedMostListened = mostListened?.map(track => {
    const recent = recentlyPlayed?.find(r => r.track_id === track.id);
    return recent ? { ...track, album_image: recent.album_image || '', audio: recent.audio || '', duration: recent.duration || 0, album_id: recent.album_id || '' } : track;
  });

  // User playlists
  const { data: playlists, isLoading: loadingPlaylists } = useQuery({
    queryKey: ['browse-playlists', user?.id],
    queryFn: async () => {
      const { data: pls, error } = await supabase
        .from('playlists')
        .select('id, name, cover_image, description, created_at')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;

      // Get song counts
      const counts = await Promise.all(
        (pls || []).map(async (p) => {
          const { count } = await supabase
            .from('playlist_songs')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', p.id);
          return { ...p, song_count: count || 0 };
        })
      );
      return counts;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Liked songs count
  const { likedSongs } = useLikedSongs();

  return (
    <>
    <AppBackground theme={theme} />
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-32">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Radio className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Browse</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your music at a glance</p>
      </motion.div>

      {/* AI Playlist Generator */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-6">
        <AIPlaylistGenerator />
      </motion.section>

      {/* Most Listened Songs */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Most Listened</h2>
        </div>
        {!user ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">Sign in to see your most played songs</p>
          </div>
        ) : loadingMostListened ? (
          <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
        ) : enrichedMostListened && enrichedMostListened.length > 0 ? (
          <div className="glass rounded-2xl overflow-hidden">
            {enrichedMostListened.map((t, i) => <TrackRow key={t.id} track={t} tracks={enrichedMostListened} index={i} />)}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <Music2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Start listening to build your top tracks</p>
          </div>
        )}
      </motion.section>

      {/* Your Playlists */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
        <div className="flex items-center gap-2">
          <ListMusic className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Your Playlists</h2>
        </div>
        {!user ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">Sign in to see your playlists</p>
          </div>
        ) : loadingPlaylists ? (
          <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={3} /></div>
        ) : playlists && playlists.length > 0 ? (
          <div className="glass rounded-2xl overflow-hidden divide-y divide-border/10">
            {playlists.map(p => <PlaylistCard key={p.id} playlist={p} />)}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <ListMusic className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No playlists yet — create one from the Library</p>
          </div>
        )}
      </motion.section>

      {/* Liked Songs summary */}
      {user && likedSongs && likedSongs.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <h2 className="text-lg font-bold text-foreground">Liked Songs</h2>
            <span className="text-xs text-muted-foreground ml-1">{likedSongs.length} songs</span>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            {likedSongs.slice(0, 5).map((t, i) => <TrackRow key={t.id} track={t} tracks={likedSongs} index={i} />)}
          </div>
        </motion.section>
      )}
    </div>
    </>
  );
};

export default BrowsePage;
