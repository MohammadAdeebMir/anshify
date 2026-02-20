import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { Track } from '@/types/music';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: Track;
  tracks: Track[];
  index?: number;
}

export const TrackCard = ({ track, tracks, index = 0 }: TrackCardProps) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === track.id;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, type: 'spring', stiffness: 200 }}
      onClick={() => play(track, tracks)}
      className="group snap-start flex-shrink-0 w-[160px] sm:w-[180px] text-left"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-lg shadow-black/30">
        {track.album_image ? (
          <img
            src={track.album_image}
            alt={track.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className={cn(
          'absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-end justify-end p-3',
          isActive && 'bg-black/20'
        )}>
          <div className={cn(
            'h-11 w-11 rounded-full bg-primary flex items-center justify-center shadow-xl',
            'transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300',
            isActive && 'translate-y-0 opacity-100'
          )}>
            {isActive && isPlaying ? (
              <Pause className="h-5 w-5 text-primary-foreground fill-current" />
            ) : (
              <Play className="h-5 w-5 text-primary-foreground fill-current ml-0.5" />
            )}
          </div>
        </div>
      </div>
      <p className={cn('text-sm font-semibold truncate', isActive ? 'text-primary' : 'text-foreground')}>
        {track.name}
      </p>
      <p className="text-xs text-muted-foreground truncate mt-0.5">{track.artist_name}</p>
    </motion.button>
  );
};
