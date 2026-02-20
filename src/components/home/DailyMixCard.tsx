import { Zap } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Track } from '@/types/music';
import { cn } from '@/lib/utils';

interface DailyMixCardProps {
  mix: { name: string; description: string; tracks: Track[] };
  index: number;
}

const gradients = ['from-primary/30 to-accent/30', 'from-accent/30 to-magenta/30', 'from-magenta/30 to-primary/30'];

export const DailyMixCard = ({ mix, index }: DailyMixCardProps) => {
  const { play } = usePlayer();

  return (
    <button
      onClick={() => mix.tracks.length > 0 && play(mix.tracks[0], mix.tracks)}
      className={cn(
        'rounded-2xl p-5 text-left space-y-2 bg-gradient-to-br glass transition-transform hover:scale-[1.02]',
        gradients[index % 3]
      )}
    >
      <Zap className="h-5 w-5 text-primary" />
      <h3 className="font-bold text-foreground text-sm">{mix.name}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2">{mix.description}</p>
      <p className="text-[10px] text-muted-foreground">{mix.tracks.length} tracks</p>
    </button>
  );
};
