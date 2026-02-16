import { motion } from 'framer-motion';
import { Heart, Library, ListMusic, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useRecentlyPlayed } from '@/hooks/useLibrary';
import { usePlayer } from '@/contexts/PlayerContext';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';
import { Track } from '@/types/music';

const TrackRow = ({ track, tracks }: { track: Track; tracks: Track[] }) => {
  const { play, currentTrack } = usePlayer();
  const isActive = currentTrack?.id === track.id;

  return (
    <button
      onClick={() => play(track, tracks)}
      className={`flex items-center gap-3 p-3 w-full text-left rounded-lg transition-colors hover:bg-muted/40 ${isActive ? 'bg-primary/10' : ''}`}
    >
      <div className="h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
        <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.name}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
      </span>
    </button>
  );
};

const LibraryPage = () => {
  const { user } = useAuth();
  const { likedSongs, isLoading: loadingLiked } = useLikedSongs();
  const { recentlyPlayed, isLoading: loadingRecent } = useRecentlyPlayed();

  if (!user) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <Library className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-extrabold text-foreground">Your Library</h1>
          </div>
        </motion.div>
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-3">
          <Library className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground">Your library is empty</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Sign in to save songs, create playlists, and build your personal music collection.
          </p>
          <Link to="/auth" className="mt-2 px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:scale-105 transition-transform">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Library className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Your Library</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your music collection</p>
      </motion.div>

      {/* Liked Songs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Liked Songs</h2>
          <span className="text-xs text-muted-foreground ml-1">({likedSongs.length})</span>
        </div>
        {loadingLiked ? (
          <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={3} /></div>
        ) : likedSongs.length > 0 ? (
          <div className="glass rounded-2xl overflow-hidden">
            {likedSongs.slice(0, 10).map(t => <TrackRow key={t.id} track={t} tracks={likedSongs} />)}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No liked songs yet. Tap the heart icon on any track!</p>
          </div>
        )}
      </section>

      {/* Recently Played */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Recently Played</h2>
        </div>
        {loadingRecent ? (
          <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={3} /></div>
        ) : recentlyPlayed.length > 0 ? (
          <div className="glass rounded-2xl overflow-hidden">
            {recentlyPlayed.slice(0, 10).map(t => <TrackRow key={t.id} track={t} tracks={recentlyPlayed} />)}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No listening history yet. Start playing music!</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default LibraryPage;
