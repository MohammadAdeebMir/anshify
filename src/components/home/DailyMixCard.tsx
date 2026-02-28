import { Play } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Track } from '@/types/music';
import { cn } from '@/lib/utils';

interface DailyMixCardProps {
  mix: { name: string; description: string; tracks: Track[] };
  index: number;
}

const gradients = [
  'from-primary/40 via-accent/20 to-primary/10',
  'from-accent/40 via-magenta/20 to-accent/10',
  'from-magenta/40 via-primary/20 to-magenta/10',
];

export const DailyMixCard = ({ mix, index }: DailyMixCardProps) => {
  const { play } = usePlayer();

  return (
    <button
      onClick={() => mix.tracks.length > 0 && play(mix.tracks[0], mix.tracks)}
      className={cn(
        'group relative overflow-hidden text-left aspect-square',
        'bg-gradient-to-br transition-transform duration-300 hover:scale-[1.03]',
        gradients[index % 3]
      )}
      style={{ borderRadius: '1px' }}
    >
      {/* Subtle grid overlay for texture */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <div className="relative z-10 h-full flex flex-col justify-between p-4">
        <div>
          <h3 className="font-bold text-foreground text-base leading-tight">{mix.name}</h3>
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{mix.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">{mix.tracks.length} tracks</p>
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Play className="h-4 w-4 text-primary-foreground fill-current ml-0.5" />
          </div>
        </div>
      </div>
    </button>
  );
};
