import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { Track } from '@/types/music';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

interface ContinueListeningProps {
  tracks: Track[];
}

export const ContinueListening = ({ tracks }: ContinueListeningProps) => {
  const { play, currentTrack, isPlaying } = usePlayer();

  if (tracks.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
      {tracks.slice(0, 8).map((track, i) => {
        const isActive = currentTrack?.id === track.id;
        return (
          <motion.button
            key={track.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            onClick={() => play(track, tracks)}
            className={cn(
              'group flex items-center gap-3 rounded-lg overflow-hidden transition-colors',
              'surface-elevated hover:bg-muted/80',
              isActive && 'ring-1 ring-primary/30 bg-primary/5'
            )}
          >
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
              {track.album_image ? (
                <img src={track.album_image} alt={track.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-full w-full bg-muted flex items-center justify-center">
                  <Play className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pr-2 py-2">
              <p className={cn('text-xs sm:text-sm font-semibold truncate', isActive ? 'text-primary' : 'text-foreground')}>
                {track.name}
              </p>
            </div>
            <div className={cn(
              'h-8 w-8 rounded-full bg-primary flex items-center justify-center mr-3',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isActive && 'opacity-100'
            )}>
              {isActive && isPlaying ? (
                <Pause className="h-3.5 w-3.5 text-primary-foreground fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 text-primary-foreground fill-current ml-0.5" />
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};
