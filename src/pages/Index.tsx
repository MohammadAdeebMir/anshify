import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';
import { Music2, TrendingUp, Star, Play, Pause, Heart, Sparkles, Zap, Share2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTrendingYT, getNewReleasesYT } from '@/services/ytmusic';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton';
import { Track } from '@/types/music';
import { useAIRecommendations, useDailyMixes } from '@/hooks/useAI';
import { useShareUrl } from '@/hooks/useSocial';
import { useOfflineTracks } from '@/hooks/useOffline';
import { cn } from '@/lib/utils';

const Section = ({ title, icon: Icon, children, delay = 0 }: { title: string; icon: React.ElementType; children: React.ReactNode; delay?: number }) => (
  <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }} className="space-y-4">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
    </div>
    {children}
  </motion.section>
);

const TrackRow = ({ track, index, tracks }: { track: Track; index: number; tracks: Track[] }) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const { user } = useAuth();
  const { likedSongs } = useLikedSongs();
  const { isLiked, toggleLike } = useLikeTrack();
  const { shareTrack } = useShareUrl();
  const { isDownloaded, download } = useOfflineTracks();
  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id, likedSongs);
  const downloaded = isDownloaded(track.id);

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-muted/50', isActive && 'bg-primary/10 ring-1 ring-primary/20')}>
      <button onClick={() => play(track, tracks)} className="flex items-center gap-3 flex-1 min-w-0 text-left group">
        <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
          {track.album_image ? (
            <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center">
              <Play className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {isActive && isPlaying ? (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="flex gap-[2px]">
                {[1, 2, 3].map(i => (
                  <span key={i} className="w-[3px] bg-primary animate-pulse rounded-full" style={{ height: `${4 + i * 2}px`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <Play className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold truncate', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{track.artist_name}</p>
        </div>
      </button>
      {user && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => toggleLike.mutate({ track, liked })}
            className={cn('p-2 rounded-full transition-colors', liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
          </button>
          <AddToPlaylistButton track={track} />
          <button onClick={() => shareTrack(track)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          {!downloaded && (
            <button onClick={() => download.mutate(track)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      {track.duration > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
        </span>
      )}
    </div>
  );
};

const DailyMixCard = ({ mix, index }: { mix: { name: string; description: string; tracks: Track[] }; index: number }) => {
  const { play } = usePlayer();
  const gradients = ['from-primary/30 to-accent/30', 'from-accent/30 to-magenta/30', 'from-magenta/30 to-primary/30'];

  return (
    <button
      onClick={() => mix.tracks.length > 0 && play(mix.tracks[0], mix.tracks)}
      className={cn('rounded-2xl p-5 text-left space-y-2 bg-gradient-to-br glass transition-transform hover:scale-[1.02]', gradients[index % 3])}
    >
      <Zap className="h-5 w-5 text-primary" />
      <h3 className="font-bold text-foreground text-sm">{mix.name}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2">{mix.description}</p>
      <p className="text-[10px] text-muted-foreground">{mix.tracks.length} tracks</p>
    </button>
  );
};

const Index = () => {
  const { user } = useAuth();
  const { data: trending, isLoading: loadingTrending } = useQuery({
    queryKey: ['trending-yt'],
    queryFn: () => getTrendingYT(10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: newReleases, isLoading: loadingReleases } = useQuery({
    queryKey: ['new-releases-yt'],
    queryFn: () => getNewReleasesYT(10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: aiRecs } = useAIRecommendations();
  const { data: dailyMixes } = useDailyMixes();

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground glow-text">{greeting}</h1>
        <p className="text-muted-foreground text-sm">Discover new music and enjoy your favorites</p>
      </motion.div>

      {user && dailyMixes && dailyMixes.length > 0 && (
        <Section title="Your Daily Mixes" icon={Zap} delay={0}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dailyMixes.map((mix, i) => <DailyMixCard key={i} mix={mix} index={i} />)}
          </div>
        </Section>
      )}

      <Section title="Trending Now" icon={TrendingUp} delay={0.05}>
        {loadingTrending ? (
          <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {trending?.map((track, i) => <TrackRow key={track.id} track={track} index={i} tracks={trending} />)}
          </div>
        )}
      </Section>

      {user && aiRecs && aiRecs.length > 0 && (
        <Section title="Recommended For You" icon={Sparkles} delay={0.1}>
          <div className="space-y-4">
            {aiRecs.map((rec, i) => (
              rec.tracks.length > 0 && (
                <div key={i} className="space-y-2">
                  <p className="text-xs text-muted-foreground italic px-1">{rec.reason}</p>
                  <div className="glass rounded-2xl overflow-hidden">
                    {rec.tracks.map((t: Track) => <TrackRow key={t.id} track={t} index={0} tracks={rec.tracks} />)}
                  </div>
                </div>
              )
            ))}
          </div>
        </Section>
      )}

      <Section title="New Releases" icon={Music2} delay={0.15}>
        {loadingReleases ? (
          <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {newReleases?.map((track, i) => <TrackRow key={track.id} track={track} index={i} tracks={newReleases} />)}
          </div>
        )}
      </Section>
    </div>
  );
};

export default Index;
