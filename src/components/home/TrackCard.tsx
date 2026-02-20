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
      className="group snap-start flex-shrink-0 w-[140px] sm:w-[160px] text-left"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-2 shadow-lg shadow-black/40">
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
          'absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent',
          'opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-end p-2.5',
          isActive && 'opacity-100'
        )}>
          <div className={cn(
            'h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/30',
            'transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300'
          )}>
            {isActive && isPlaying ? (
              <Pause className="h-4.5 w-4.5 text-primary-foreground fill-current" />
            ) : (
              <Play className="h-4.5 w-4.5 text-primary-foreground fill-current ml-0.5" />
            )}
          </div>
        </div>
      </div>
      <p className={cn('text-xs font-semibold truncate', isActive ? 'text-primary' : 'text-foreground')}>
        {track.name}
      </p>
      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{track.artist_name}</p>
    </motion.button>
  );
};
