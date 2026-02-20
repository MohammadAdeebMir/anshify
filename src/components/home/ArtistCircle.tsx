import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Track } from '@/types/music';

interface ArtistCircleProps {
  artist: { id: string; name: string; image: string; topTrack: Track };
  index: number;
}

export const ArtistCircle = ({ artist, index }: ArtistCircleProps) => {
  const { play } = usePlayer();

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05, type: 'spring' }}
      onClick={() => play(artist.topTrack, [artist.topTrack])}
      className="group snap-start flex-shrink-0 flex flex-col items-center gap-2 w-[110px] sm:w-[130px]"
    >
      <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden shadow-lg shadow-black/30 ring-2 ring-transparent group-hover:ring-primary/50 transition-all duration-300">
        {artist.image ? (
          <img
            src={artist.image}
            alt={artist.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <Play className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Play className="h-6 w-6 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
        </div>
      </div>
      <p className="text-xs font-medium text-foreground truncate w-full text-center">{artist.name}</p>
    </motion.button>
  );
};
