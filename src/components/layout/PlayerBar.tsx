import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const PlayerBar = () => {
  const player = usePlayer();
  const isMobile = useIsMobile();

  if (!player.currentTrack) return null;

  const { currentTrack, isPlaying, progress, duration, volume, shuffle, repeat } = player;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 glass-strong',
          isMobile ? 'pb-[env(safe-area-inset-bottom)]' : ''
        )}
      >
        {/* Progress bar on top for mobile */}
        {isMobile && (
          <div className="px-4 pt-2">
            <Slider
              value={[progress]}
              max={duration || 100}
              step={0.1}
              onValueChange={([v]) => player.seek(v)}
              className="h-1"
            />
          </div>
        )}

        <div className={cn(
          'flex items-center gap-4 px-4',
          isMobile ? 'h-16' : 'h-20'
        )}>
          {/* Track info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              'rounded-lg overflow-hidden flex-shrink-0 glow-primary',
              isMobile ? 'h-10 w-10' : 'h-14 w-14'
            )}>
              <img
                src={currentTrack.album_image}
                alt={currentTrack.album_name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{currentTrack.name}</p>
              <p className="text-xs truncate text-muted-foreground">{currentTrack.artist_name}</p>
            </div>
          </div>

          {/* Controls */}
          <div className={cn('flex flex-col items-center', isMobile ? 'gap-0' : 'gap-1 flex-1')}>
            <div className="flex items-center gap-3">
              {!isMobile && (
                <button
                  onClick={player.toggleShuffle}
                  className={cn('p-1.5 rounded-full transition-colors hover:text-foreground', shuffle ? 'text-primary' : 'text-muted-foreground')}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
              )}
              <button onClick={player.previous} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={isPlaying ? player.pause : player.resume}
                className="p-2.5 rounded-full bg-foreground text-background hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>
              <button onClick={player.next} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <SkipForward className="h-4 w-4" />
              </button>
              {!isMobile && (
                <button
                  onClick={player.toggleRepeat}
                  className={cn('p-1.5 rounded-full transition-colors hover:text-foreground', repeat !== 'off' ? 'text-primary' : 'text-muted-foreground')}
                >
                  {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Desktop seek bar */}
            {!isMobile && (
              <div className="flex items-center gap-2 w-full max-w-md">
                <span className="text-[10px] text-muted-foreground w-8 text-right">{formatTime(progress)}</span>
                <Slider
                  value={[progress]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={([v]) => player.seek(v)}
                  className="flex-1"
                />
                <span className="text-[10px] text-muted-foreground w-8">{formatTime(duration)}</span>
              </div>
            )}
          </div>

          {/* Volume (desktop only) */}
          {!isMobile && (
            <div className="flex items-center gap-2 flex-1 justify-end">
              <button
                onClick={() => player.setVolume(volume === 0 ? 0.7 : 0)}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <Slider
                value={[volume]}
                max={1}
                step={0.01}
                onValueChange={([v]) => player.setVolume(v)}
                className="w-24"
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
