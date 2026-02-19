import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlbumGridSkeleton, SongListSkeleton, ArtistGridSkeleton } from '@/components/skeletons/Skeletons';
import { Music2, TrendingUp, Star, Play, Heart, Sparkles, Zap, Share2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTrendingTracks, getNewReleases, getPopularArtists } from '@/services/jamendo';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton';
import { Track } from '@/types/music';
import { useAIRecommendations, useDailyMixes } from '@/hooks/useAI';
import { useShareUrl } from '@/hooks/useSocial';
import { useOfflineTracks } from '@/hooks/useOffline';
import { cn } from '@/lib/utils';

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

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
    <div className={cn('flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/40', isActive && 'bg-primary/10')}>
      <button onClick={() => play(track, tracks)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="relative h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
          <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" />
          {isActive && isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="flex gap-0.5">
                {[1, 2, 3].map(i => (
                  <span key={i} className="w-0.5 bg-primary animate-pulse rounded-full" style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
          <Link to={`/artist/${track.artist_id}`} onClick={e => e.stopPropagation()} className="text-xs text-muted-foreground truncate hover:underline block">
            {track.artist_name}
          </Link>
        </div>
      </button>
      {user && (
        <>
          <button
            onClick={() => toggleLike.mutate({ track, liked })}
            className={cn('p-1.5 rounded-full transition-colors', liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
          </button>
          <AddToPlaylistButton track={track} />
          <button onClick={() => shareTrack(track)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          {!downloaded && (
            <button onClick={() => download.mutate(track)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
      </span>
    </div>
  );
};

const AlbumCard = ({ album }: { album: any }) => (
  <Link to={`/album/${album.id}`} className="group space-y-3 p-3 rounded-xl transition-colors hover:bg-muted/30">
    <div className="relative aspect-square w-full rounded-xl overflow-hidden">
      <img src={album.image} alt={album.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Play className="h-5 w-5 text-primary-foreground fill-current" />
        </div>
      </div>
    </div>
    <p className="text-sm font-medium text-foreground truncate">{album.name}</p>
    <p className="text-xs text-muted-foreground truncate">{album.artist_name}</p>
  </Link>
);

const ArtistCard = ({ artist }: { artist: any }) => (
  <Link to={`/artist/${artist.id}`} className="flex flex-col items-center space-y-3 p-4 rounded-xl hover:bg-muted/30 transition-colors">
    <div className="h-28 w-28 rounded-full overflow-hidden">
      <img src={artist.image} alt={artist.name} className="h-full w-full object-cover" loading="lazy" />
    </div>
    <p className="text-sm font-medium text-foreground text-center truncate w-full">{artist.name}</p>
  </Link>
);

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
    queryKey: ['trending-tracks'],
    queryFn: () => getTrendingTracks(10),
    staleTime: 5 * 60 * 1000,
  });

  const { data: newReleases, isLoading: loadingReleases } = useQuery({
    queryKey: ['new-releases'],
    queryFn: () => getNewReleases(6),
    staleTime: 5 * 60 * 1000,
  });

  const { data: artists, isLoading: loadingArtists } = useQuery({
    queryKey: ['popular-artists'],
    queryFn: () => getPopularArtists(6),
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

      {/* Daily Mixes (AI) */}
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

      {/* AI Recommendations */}
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

      <Section title="Popular Artists" icon={Star} delay={0.15}>
        {loadingArtists ? <ArtistGridSkeleton count={6} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artists?.map(a => <ArtistCard key={a.id} artist={a} />)}
          </div>
        )}
      </Section>

      <Section title="New Releases" icon={Music2} delay={0.2}>
        {loadingReleases ? <AlbumGridSkeleton count={6} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {newReleases?.map(a => <AlbumCard key={a.id} album={a} />)}
          </div>
        )}
      </Section>
    </div>
  );
};

export default Index;
