import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlbumGridSkeleton, SongListSkeleton, ArtistGridSkeleton } from '@/components/skeletons/Skeletons';
import { Music2, TrendingUp, Star, Play, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTrendingTracks, getNewReleases, getPopularArtists } from '@/services/jamendo';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton';
import { Track } from '@/types/music';

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <motion.section {...fadeIn} className="space-y-4">
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
  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id, likedSongs);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/40 ${isActive ? 'bg-primary/10' : ''}`}>
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
          <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.name}</p>
          <Link to={`/artist/${track.artist_id}`} onClick={e => e.stopPropagation()} className="text-xs text-muted-foreground truncate hover:underline block">
            {track.artist_name}
          </Link>
        </div>
      </button>
      {user && (
        <>
          <button
            onClick={() => toggleLike.mutate({ track, liked })}
            className={`p-1.5 rounded-full transition-colors ${liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
          </button>
          <AddToPlaylistButton track={track} />
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

const Index = () => {
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

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground glow-text">{greeting}</h1>
        <p className="text-muted-foreground text-sm">Discover new music and enjoy your favorites</p>
      </motion.div>

      <Section title="Trending Now" icon={TrendingUp}>
        {loadingTrending ? (
          <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {trending?.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} tracks={trending} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Popular Artists" icon={Star}>
        {loadingArtists ? <ArtistGridSkeleton count={6} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artists?.map(a => <ArtistCard key={a.id} artist={a} />)}
          </div>
        )}
      </Section>

      <Section title="New Releases" icon={Music2}>
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
