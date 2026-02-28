import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { Track } from '@/types/music';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useHDArtwork } from '@/hooks/useHDArtwork';

interface ContinueListeningProps {
  tracks: Track[];
}

export const ContinueListening = ({ tracks }: ContinueListeningProps) => {
  const { play, pause, currentTrack, isPlaying } = usePlayer();

  if (tracks.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {tracks.slice(0, 8).map((track, i) => {
        const isActive = currentTrack?.id === track.id;
        return <ContinueCard key={track.id} track={track} tracks={tracks} index={i} isActive={isActive} isPlaying={isPlaying} onPlay={() => play(track, tracks)} onPause={pause} />;
      })}
    </div>
  );
};

const ContinueImg = ({ track, onLoad, imgLoaded }: { track: Track; onLoad: () => void; imgLoaded: boolean }) => {
  const hdSrc = useHDArtwork(track.id, track.album_image, track.name, track.artist_name);
  return (
    <img
      src={hdSrc}
      alt={track.name}
      onLoad={onLoad}
      className={cn(
        'h-full w-full object-cover transition-all duration-500 group-hover:scale-105',
        imgLoaded ? 'opacity-100' : 'opacity-0'
      )}
      loading="lazy"
      decoding="async"
    />
  );
};

const ContinueCard = ({
  track, tracks, index, isActive, isPlaying, onPlay, onPause
}: {
  track: Track; tracks: Track[]; index: number; isActive: boolean; isPlaying: boolean; onPlay: () => void; onPause: () => void;
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={isActive && isPlaying ? onPause : onPlay}
      className="group snap-start flex-shrink-0 w-[165px] sm:w-[185px] text-left"
    >
      <div className={cn(
        'relative aspect-square overflow-hidden mb-2.5 shadow-lg shadow-black/50',
        isActive && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background'
      )} style={{ borderRadius: '3px' }}>
        {/* Shimmer placeholder */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {track.album_image ? (
          <ContinueImg track={track} onLoad={() => setImgLoaded(true)} imgLoaded={imgLoaded} />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <Play className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {/* Gradient */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent transition-opacity duration-300',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )} />
        {/* Play/Pause button */}
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
        {isActive && (
          <div className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
        )}
      </div>
      <p className={cn('text-[13px] font-semibold truncate leading-tight', isActive ? 'text-primary' : 'text-foreground')}>
        {track.name}
      </p>
      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{track.artist_name}</p>
    </motion.button>
  );
};
