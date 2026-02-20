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
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05, type: 'spring', stiffness: 200 }}
      onClick={() => play(artist.topTrack, [artist.topTrack])}
      className="group snap-start flex-shrink-0 flex flex-col items-center gap-2.5 w-[96px] sm:w-[112px]"
    >
      <div className="relative h-[80px] w-[80px] sm:h-[96px] sm:w-[96px] rounded-full overflow-hidden shadow-xl shadow-black/50">
        {/* Shimmer */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-full" />
        )}
        {artist.image ? (
          <img
            src={artist.image}
            alt={artist.name}
            onLoad={() => setImgLoaded(true)}
            className={cn(
              'h-full w-full object-cover transition-all duration-500 group-hover:scale-110',
              imgLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/35 transition-colors duration-300 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            whileHover={{ scale: 1 }}
            className="h-8 w-8 rounded-full bg-foreground/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="h-3.5 w-3.5 text-background fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </motion.div>
        </div>
        {/* Ring */}
        <div className="absolute inset-0 rounded-full ring-2 ring-border/20 group-hover:ring-primary/50 transition-all duration-300" />
      </div>
      <p className="text-[11px] font-semibold text-foreground truncate w-full text-center group-hover:text-primary transition-colors">
        {artist.name}
      </p>
    </motion.button>
  );
};
