import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, Clock, Heart } from 'lucide-react';
import { searchYTMusic } from '@/services/ytmusic';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';
import { Track } from '@/types/music';
import { cn } from '@/lib/utils';

const TrackRow = ({ track, index, tracks }: { track: Track; index: number; tracks: Track[] }) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const { user } = useAuth();
  const { likedSongs } = useLikedSongs();
  const { isLiked, toggleLike } = useLikeTrack();
  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id, likedSongs);

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-muted/50', isActive && 'bg-primary/10 ring-1 ring-primary/20')}>
      <button onClick={() => play(track, tracks)} className="flex items-center gap-3 flex-1 min-w-0 text-left group">
        <span className="w-6 text-xs text-muted-foreground text-right tabular-nums">{index + 1}</span>
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
          <p className="text-xs text-muted-foreground truncate">{track.album_name || track.artist_name}</p>
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

const ArtistPage = () => {
  const { id } = useParams<{ id: string }>();
  const { play } = usePlayer();

  // Use the artist ID as a search query to find their tracks
  const { data: tracks = [], isLoading: loadingTracks } = useQuery({
    queryKey: ['artist-tracks-yt', id],
    queryFn: () => searchYTMusic(id!, 20),
    enabled: !!id,
  });

  const artistName = tracks.length > 0 ? tracks[0].artist_name : id || 'Artist';
  const artistImage = tracks.length > 0 ? tracks[0].album_image : '';

  if (loadingTracks) {
    return <div className="p-8"><SongListSkeleton count={8} /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative p-6 md:p-8 pb-0">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="h-40 w-40 md:h-52 md:w-52 rounded-full overflow-hidden glow-primary flex-shrink-0 shadow-2xl">
            {artistImage ? (
              <img src={artistImage} alt={artistName} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-muted flex items-center justify-center">
                <Play className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="text-center md:text-left space-y-2 pb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Artist</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground glow-text">{artistName}</h1>
            {tracks.length > 0 && (
              <button
                onClick={() => play(tracks[0], tracks)}
                className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:scale-105 transition-transform glow-primary"
              >
                <Play className="h-4 w-4 fill-current" /> Play All
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="p-6 md:p-8 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Top Tracks
          </h2>
          <div className="glass rounded-2xl overflow-hidden">
            {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} tracks={tracks} />)}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ArtistPage;
