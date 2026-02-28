import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { Track } from '@/types/music';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TrackCardProps {
  track: Track;
  tracks: Track[];
  index?: number;
}

export const TrackCard = ({ track, tracks, index = 0 }: TrackCardProps) => {
  const { play, pause, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === track.id;
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleClick = () => {
    if (isActive && isPlaying) {
      pause();
    } else {
      play(track, tracks);
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, type: 'spring', stiffness: 200 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className="group snap-start flex-shrink-0 w-[152px] sm:w-[172px] text-left"
    >
      <div className="relative aspect-square rounded-sm overflow-hidden mb-2.5 shadow-lg shadow-black/30">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-secondary animate-pulse" />
        )}
        {track.album_image ? (
          <img
            src={track.album_image}
            alt={track.name}
            onLoad={() => setImgLoaded(true)}
            className={cn(
              'h-full w-full object-cover transition-all duration-500 group-hover:scale-105',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-secondary flex items-center justify-center">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Hover gradient */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent',
          'transition-opacity duration-300',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )} />

        {/* Play/pause fab */}
        <div className={cn(
          'absolute bottom-2.5 right-2.5 h-10 w-10 rounded-full flex items-center justify-center',
          'bg-foreground shadow-xl shadow-black/50',
          'transition-all duration-300',
          isActive ? 'scale-100 opacity-100' : 'scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100'
        )}>
          {isActive && isPlaying ? (
            <Pause className="h-4 w-4 text-background fill-current" />
          ) : (
            <Play className="h-4 w-4 text-background fill-current ml-0.5" />
          )}
        </div>

        {isActive && (
          <div className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/40" />
        )}
      </div>

      <p className={cn(
        'text-[13px] font-semibold truncate leading-tight',
        isActive ? 'text-primary' : 'text-foreground'
      )}>
        {track.name}
      </p>
      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{track.artist_name}</p>
    </motion.button>
  );
};
