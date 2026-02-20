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
    <div className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
              'group snap-start flex-shrink-0 w-[140px] sm:w-[160px] text-left'
            )}
          >
            {/* Pill-shaped card with album art and play overlay */}
            <div className={cn(
              'relative aspect-square rounded-2xl overflow-hidden mb-2',
              'shadow-lg shadow-black/40',
              isActive && 'ring-2 ring-primary/50'
            )}>
              {track.album_image ? (
                <img
                  src={track.album_image}
                  alt={track.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-muted flex items-center justify-center">
                  <Play className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {/* Play button overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                <div className={cn(
                  'h-9 w-9 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center',
                  'shadow-lg shadow-primary/30',
                  'opacity-0 group-hover:opacity-100 transition-all duration-300',
                  isActive && 'opacity-100'
                )}>
                  {isActive && isPlaying ? (
                    <Pause className="h-4 w-4 text-primary-foreground fill-current" />
                  ) : (
                    <Play className="h-4 w-4 text-primary-foreground fill-current ml-0.5" />
                  )}
                </div>
              </div>
            </div>
            <p className={cn(
              'text-xs font-semibold truncate',
              isActive ? 'text-primary' : 'text-foreground'
            )}>
              {track.name}
            </p>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {track.artist_name}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
};
