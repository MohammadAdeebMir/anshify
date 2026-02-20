import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Heart, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Track } from '@/types/music';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton';
import { useOfflineTracks } from '@/hooks/useOffline';
import { cn } from '@/lib/utils';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';

const YTTrackRow = ({ track, tracks, index }: { track: Track; tracks: Track[]; index: number }) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const { user } = useAuth();
  const { likedSongs } = useLikedSongs();
  const { isLiked, toggleLike } = useLikeTrack();
  const { isDownloaded, download } = useOfflineTracks();
  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id, likedSongs);
  const downloaded = isDownloaded(track.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-2xl transition-all duration-200',
        'hover:bg-muted/50 active:scale-[0.99]',
        isActive && 'bg-primary/10 ring-1 ring-primary/20'
      )}
    >
      <button onClick={() => play(track, tracks)} className="flex items-center gap-3 flex-1 min-w-0 text-left group">
        <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
          {track.album_image ? (
            <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center">
              <Play className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {isActive && isPlaying ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5 text-white ml-0.5" />
              )}
            </div>
          </div>
          {isActive && isPlaying && (
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-[2px]">
              {[1, 2, 3].map(i => (
                <span key={i} className="w-[3px] bg-primary animate-pulse rounded-full" style={{ height: `${4 + i * 2}px`, animationDelay: `${i * 0.15}s` }} />
              ))}
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
    </motion.div>
  );
};

interface YTSearchResultsProps {
  tracks: Track[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  query: string;
}

export const YTSearchResults = ({ tracks, isLoading, error, onRetry, query }: YTSearchResultsProps) => {
  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl overflow-hidden">
        <SongListSkeleton count={8} />
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-8 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <p className="text-sm text-muted-foreground">Search failed. Please try again.</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </motion.div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-10 text-center space-y-2">
        <p className="text-base font-medium text-foreground">No results for "{query}"</p>
        <p className="text-sm text-muted-foreground">Try a different search term</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl overflow-hidden divide-y divide-border/10">
      {tracks.map((track, i) => (
        <YTTrackRow key={track.id} track={track} tracks={tracks} index={i} />
      ))}
    </motion.div>
  );
};
