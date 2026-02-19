import { motion } from 'framer-motion';
import { Heart, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { usePlayer } from '@/contexts/PlayerContext';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';
import { Track } from '@/types/music';
import { Button } from '@/components/ui/button';

const TrackRow = ({ track, tracks }: { track: Track; tracks: Track[] }) => {
  const { play, currentTrack } = usePlayer();
  const { likedSongs } = useLikedSongs();
  const { isLiked, toggleLike } = useLikeTrack();
  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id, likedSongs);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/40 ${isActive ? 'bg-primary/10' : ''}`}>
      <button onClick={() => play(track, tracks)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
          <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
        </div>
      </button>
      <button
        onClick={() => toggleLike.mutate({ track, liked })}
        className="p-1.5 rounded-full text-primary transition-colors"
      >
        <Heart className="h-4 w-4 fill-current" />
      </button>
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
      </span>
    </div>
  );
};

const LikedSongsPage = () => {
  const { user } = useAuth();
  const { likedSongs, isLoading } = useLikedSongs();
  const { play } = usePlayer();

  if (!user) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-extrabold text-foreground">Liked Songs</h1>
          </div>
        </motion.div>
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-3">
          <Heart className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground">Sign in to see liked songs</h3>
          <Link to="/auth" className="mt-2 px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:scale-105 transition-transform">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Heart className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Liked Songs</h1>
          <span className="text-xs text-muted-foreground ml-1">({likedSongs.length})</span>
        </div>
        {likedSongs.length > 0 && (
          <Button onClick={() => play(likedSongs[0], likedSongs)} className="mt-3 rounded-xl bg-primary text-primary-foreground glow-primary">
            <Play className="h-4 w-4 mr-1 fill-current" /> Play All
          </Button>
        )}
      </motion.div>

      {isLoading ? (
        <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
      ) : likedSongs.length > 0 ? (
        <div className="glass rounded-2xl overflow-hidden">
          {likedSongs.map(t => <TrackRow key={t.id} track={t} tracks={likedSongs} />)}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center space-y-3">
          <Heart className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-semibold text-foreground">No liked songs yet</h3>
          <p className="text-sm text-muted-foreground">Tap the heart icon on any track to save it here.</p>
        </div>
      )}
    </div>
  );
};

export default LikedSongsPage;
