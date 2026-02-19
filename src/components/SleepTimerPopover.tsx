import { Timer, TimerOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

const options = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

export const SleepTimerPopover = () => {
  const { sleepTimer, setSleepTimer } = usePlayer();
  const isActive = sleepTimer !== null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn('p-1.5 rounded-full transition-colors', isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
          <Timer className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2 glass-strong border-border/30" side="top" align="center">
        <p className="text-xs font-semibold text-foreground px-2 py-1">Sleep Timer</p>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSleepTimer(opt.value)}
            className={cn(
              'w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors',
              sleepTimer === opt.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            {opt.label}
          </button>
        ))}
        {isActive && (
          <button
            onClick={() => setSleepTimer(null)}
            className="w-full text-left text-sm px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 flex items-center gap-1.5 mt-1"
          >
            <TimerOff className="h-3.5 w-3.5" /> Turn off
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};
