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

const AlbumPage = () => {
  const { id } = useParams<{ id: string }>();
  const { play } = usePlayer();

  // Use album ID as search query
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['album-tracks-yt', id],
    queryFn: () => searchYTMusic(id!, 20),
    enabled: !!id,
  });

  const albumInfo = tracks.length > 0 ? {
    name: tracks[0].album_name || tracks[0].name,
    image: tracks[0].album_image,
    artist: tracks[0].artist_name,
    artistId: tracks[0].artist_id,
  } : null;

  if (isLoading) {
    return <div className="p-8"><SongListSkeleton count={8} /></div>;
  }

  if (!albumInfo) {
    return <div className="p-8 text-center text-muted-foreground">Album not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
          <div className="h-48 w-48 md:h-56 md:w-56 rounded-2xl overflow-hidden glow-primary flex-shrink-0 shadow-2xl">
            {albumInfo.image ? (
              <img src={albumInfo.image} alt={albumInfo.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-muted flex items-center justify-center">
                <Play className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="text-center md:text-left space-y-2 pb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Album</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground glow-text">{albumInfo.name}</h1>
            <p className="text-sm text-muted-foreground">{albumInfo.artist}</p>
            <p className="text-xs text-muted-foreground">{tracks.length} tracks</p>
            <button
              onClick={() => play(tracks[0], tracks)}
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:scale-105 transition-transform glow-primary"
            >
              <Play className="h-4 w-4 fill-current" /> Play All
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-3 border-b border-border/20 text-xs text-muted-foreground uppercase tracking-wider">
            <span className="w-6 text-right">#</span>
            <span className="flex-1">Title</span>
            <Clock className="h-3.5 w-3.5" />
          </div>
          {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} tracks={tracks} />)}
        </div>
      </motion.div>
    </div>
  );
};

export default AlbumPage;
