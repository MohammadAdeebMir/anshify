import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Track } from '@/types/music';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ArtistCircleProps {
  artist: { id: string; name: string; image: string; topTrack: Track };
  index: number;
}

export const ArtistCircle = ({ artist, index }: ArtistCircleProps) => {
  const { play } = usePlayer();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.04, type: 'spring', stiffness: 200 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => play(artist.topTrack, [artist.topTrack])}
      className="group snap-start flex-shrink-0 flex flex-col items-center gap-2.5 w-[100px] sm:w-[120px]"
    >
      <div className="relative h-[88px] w-[88px] sm:h-[104px] sm:w-[104px] rounded-full overflow-hidden shadow-xl shadow-black/40">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-secondary animate-pulse rounded-full" />
        )}
        {artist.image ? (
          <img
            src={artist.image}
            alt={artist.name}
            onLoad={() => setImgLoaded(true)}
            className={cn(
              'h-full w-full object-cover transition-transform duration-500 group-active:scale-110',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-secondary flex items-center justify-center">
            <Music className="h-7 w-7 text-muted-foreground" />
          </div>
        )}
        {/* Subtle ring */}
        <div className="absolute inset-0 rounded-full ring-[1.5px] ring-border/15 group-hover:ring-border/40 transition-all duration-300" />
      </div>
      <p className="text-[12px] font-semibold text-foreground truncate w-full text-center leading-tight">
        {artist.name}
      </p>
    </motion.button>
  );
};
