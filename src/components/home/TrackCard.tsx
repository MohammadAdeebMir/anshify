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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, type: 'spring', stiffness: 200 }}
      onClick={handleClick}
      className="group snap-start flex-shrink-0 w-[148px] sm:w-[168px] text-left"
    >
      {/* Album art */}
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-2.5 shadow-lg shadow-black/50">
        {/* Placeholder shimmer */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
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
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Hover / active gradient overlay */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent',
          'transition-opacity duration-300',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )} />

        {/* Play / pause button */}
        <div className={cn(
          'absolute bottom-2.5 right-2.5 h-10 w-10 rounded-full flex items-center justify-center',
          'bg-foreground shadow-2xl shadow-black/60',
          'transform transition-all duration-300',
          isActive ? 'scale-100 opacity-100' : 'scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100'
        )}>
          {isActive && isPlaying ? (
            <Pause className="h-4 w-4 text-background fill-current" />
          ) : (
            <Play className="h-4 w-4 text-background fill-current ml-0.5" />
          )}
        </div>

        {/* Active indicator dot */}
        {isActive && (
          <div className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full bg-primary shadow-lg shadow-primary/50 animate-pulse" />
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
