import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, Timer, ChevronUp, ChevronDown, Heart } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { SleepTimerPopover } from '@/components/SleepTimerPopover';

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const PlayerBar = () => {
  const player = usePlayer();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { likedSongs } = useLikedSongs();
  const { isLiked, toggleLike } = useLikeTrack();
  const [expanded, setExpanded] = useState(false);
  const lastTapRef = useRef(0);

  if (!player.currentTrack) return null;

  const { currentTrack, isPlaying, progress, duration, volume, shuffle, repeat, sleepTimer } = player;
  const liked = isLiked(currentTrack.id, likedSongs);

  const handleSwipe = (e: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80) {
      if (info.offset.x > 0) player.previous();
      else player.next();
    }
    if (info.offset.y < -60 && isMobile) setExpanded(true);
    if (info.offset.y > 60 && isMobile) setExpanded(false);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && user) {
      toggleLike.mutate({ track: currentTrack, liked });
    }
    lastTapRef.current = now;
  };

  // Mobile expanded full-screen player
  if (isMobile && expanded) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 flex flex-col gradient-bg pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setExpanded(false)} className="p-2 text-muted-foreground">
            <ChevronDown className="h-6 w-6" />
          </button>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Now Playing</span>
          <SleepTimerPopover />
        </div>

        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-8 gap-6"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={handleSwipe}
          onTap={handleDoubleTap}
        >
          <div className="w-64 h-64 rounded-2xl overflow-hidden glow-primary shadow-2xl">
            <img src={currentTrack.album_image} alt={currentTrack.album_name} className="h-full w-full object-cover" />
          </div>
          <div className="text-center w-full max-w-xs">
            <p className="text-lg font-bold truncate text-foreground">{currentTrack.name}</p>
            <p className="text-sm text-muted-foreground truncate">{currentTrack.artist_name}</p>
          </div>

          {user && (
            <button
              onClick={() => toggleLike.mutate({ track: currentTrack, liked })}
              className={cn('p-2 rounded-full transition-colors', liked ? 'text-primary' : 'text-muted-foreground')}
            >
              <Heart className={cn('h-6 w-6', liked && 'fill-current')} />
            </button>
          )}
        </motion.div>

        {/* Seek */}
        <div className="px-8 space-y-1">
          <Slider value={[progress]} max={duration || 100} step={0.1} onValueChange={([v]) => player.seek(v)} className="h-2" />
          <div className="flex justify-between">
            <span className="text-[10px] text-muted-foreground">{formatTime(progress)}</span>
            <span className="text-[10px] text-muted-foreground">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 py-6">
          <button onClick={player.toggleShuffle} className={cn('p-2', shuffle ? 'text-primary' : 'text-muted-foreground')}>
            <Shuffle className="h-5 w-5" />
          </button>
          <button onClick={player.previous} className="p-2 text-foreground">
            <SkipBack className="h-6 w-6" />
          </button>
          <button
            onClick={isPlaying ? player.pause : player.resume}
            className="p-4 rounded-full bg-foreground text-background"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </button>
          <button onClick={player.next} className="p-2 text-foreground">
            <SkipForward className="h-6 w-6" />
          </button>
          <button onClick={player.toggleRepeat} className={cn('p-2', repeat !== 'off' ? 'text-primary' : 'text-muted-foreground')}>
            {repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 px-8 pb-6">
          <VolumeX className="h-4 w-4 text-muted-foreground" />
          <Slider value={[volume]} max={1} step={0.01} onValueChange={([v]) => player.setVolume(v)} className="flex-1" />
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        </div>

        {sleepTimer !== null && (
          <div className="text-center pb-4">
            <span className="text-xs text-primary flex items-center justify-center gap-1">
              <Timer className="h-3 w-3" /> Sleep in {sleepTimer}m
            </span>
          </div>
        )}
      </motion.div>
    );
  }

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
            <Slider value={[progress]} max={duration || 100} step={0.1} onValueChange={([v]) => player.seek(v)} className="h-1" />
          </div>
        )}

        <motion.div
          className={cn('flex items-center gap-4 px-4', isMobile ? 'h-16' : 'h-20')}
          drag={isMobile ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={handleSwipe}
        >
          {/* Track info */}
          <button
            onClick={() => isMobile && setExpanded(true)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <div className={cn('rounded-lg overflow-hidden flex-shrink-0 glow-primary', isMobile ? 'h-10 w-10' : 'h-14 w-14')}>
              <img src={currentTrack.album_image} alt={currentTrack.album_name} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{currentTrack.name}</p>
              <p className="text-xs truncate text-muted-foreground">{currentTrack.artist_name}</p>
            </div>
          </button>

          {/* Like button (desktop) */}
          {!isMobile && user && (
            <button
              onClick={() => toggleLike.mutate({ track: currentTrack, liked })}
              className={cn('p-1.5 rounded-full transition-colors', liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
            </button>
          )}

          {/* Controls */}
          <div className={cn('flex flex-col items-center', isMobile ? 'gap-0' : 'gap-1 flex-1')}>
            <div className="flex items-center gap-3">
              {!isMobile && (
                <button onClick={player.toggleShuffle} className={cn('p-1.5 rounded-full transition-colors hover:text-foreground', shuffle ? 'text-primary' : 'text-muted-foreground')}>
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
                <button onClick={player.toggleRepeat} className={cn('p-1.5 rounded-full transition-colors hover:text-foreground', repeat !== 'off' ? 'text-primary' : 'text-muted-foreground')}>
                  {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Desktop seek bar */}
            {!isMobile && (
              <div className="flex items-center gap-2 w-full max-w-md">
                <span className="text-[10px] text-muted-foreground w-8 text-right">{formatTime(progress)}</span>
                <Slider value={[progress]} max={duration || 100} step={0.1} onValueChange={([v]) => player.seek(v)} className="flex-1" />
                <span className="text-[10px] text-muted-foreground w-8">{formatTime(duration)}</span>
              </div>
            )}
          </div>

          {/* Volume + extras (desktop only) */}
          {!isMobile && (
            <div className="flex items-center gap-2 flex-1 justify-end">
              {sleepTimer !== null && (
                <span className="text-[10px] text-primary flex items-center gap-0.5 mr-1">
                  <Timer className="h-3 w-3" />{sleepTimer}m
                </span>
              )}
              <SleepTimerPopover />
              <button
                onClick={() => player.setVolume(volume === 0 ? 0.7 : 0)}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <Slider value={[volume]} max={1} step={0.01} onValueChange={([v]) => player.setVolume(v)} className="w-24" />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
