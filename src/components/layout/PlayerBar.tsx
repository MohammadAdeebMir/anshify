import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, Timer, ChevronDown, Heart, ListMusic, Waves, Activity, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { SleepTimerPopover } from '@/components/SleepTimerPopover';
import { QueuePanel } from '@/components/QueuePanel';
import { MusicVisualizer } from '@/components/MusicVisualizer';
import { ShareCard } from '@/components/ShareCard';
import { useNavigate } from 'react-router-dom';

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
  const [queueOpen, setQueueOpen] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const lastTapRef = useRef(0);
  const navigate = useNavigate();

  if (!player.currentTrack) return null;

  const { currentTrack, isPlaying, progress, duration, volume, shuffle, repeat, sleepTimer, queue, queueIndex, visualizerEnabled, workoutMode } = player;
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

  const upcomingCount = queue.length - queueIndex - 1;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  // Mobile expanded full-screen player — Luxury Mode
  if (isMobile && expanded) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed inset-0 z-50 flex flex-col pb-[env(safe-area-inset-bottom)]"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setExpanded(false)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="h-6 w-6" />
          </button>
          <span className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-medium">Now Playing</span>
          <div className="flex items-center gap-1">
            <SleepTimerPopover />
            <button onClick={() => { setExpanded(false); navigate('/queue'); }} className="p-2 text-muted-foreground relative">
              <ListMusic className="h-5 w-5" />
              {upcomingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">{upcomingCount > 9 ? '9+' : upcomingCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Album art with glow */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-8 gap-6"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={handleSwipe}
          onTap={handleDoubleTap}
        >
          {visualizerEnabled ? (
            <MusicVisualizer className="w-72 h-72 rounded-3xl overflow-hidden" />
          ) : (
            <motion.div
              animate={isPlaying ? { scale: [1, 1.02, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="w-72 h-72 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5">
                {currentTrack.album_image ? (
                  <img src={currentTrack.album_image} alt={currentTrack.album_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <Play className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              {/* Soft glow behind art */}
              {isPlaying && currentTrack.album_image && (
                <div
                  className="absolute -inset-8 -z-10 rounded-[2rem] opacity-30 blur-3xl"
                  style={{
                    backgroundImage: `url(${currentTrack.album_image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              )}
            </motion.div>
          )}

          <div className="text-center w-full max-w-xs space-y-1">
            <p className="text-lg font-bold truncate text-foreground">{currentTrack.name}</p>
            <p className="text-sm text-muted-foreground truncate">{currentTrack.artist_name}</p>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <button
                onClick={() => toggleLike.mutate({ track: currentTrack, liked })}
                className={cn('p-2.5 rounded-full transition-all', liked ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground')}
              >
                <Heart className={cn('h-5 w-5', liked && 'fill-current')} />
              </button>
            )}
            <button onClick={() => player.setVisualizerEnabled(!visualizerEnabled)} className={cn('p-2.5 rounded-full transition-colors', visualizerEnabled ? 'text-primary' : 'text-muted-foreground')}>
              <Waves className="h-5 w-5" />
            </button>
            <button onClick={() => player.setWorkoutMode(!workoutMode)} className={cn('p-2.5 rounded-full transition-colors', workoutMode ? 'text-primary' : 'text-muted-foreground')}>
              <Activity className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* Seek bar */}
        <div className="px-8 space-y-1">
          <Slider value={[progress]} max={duration || 100} step={0.1} onValueChange={([v]) => player.seek(v)} className="h-2" />
          <div className="flex justify-between">
            <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(progress)}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-7 py-6">
          <button onClick={player.toggleShuffle} className={cn('p-2', shuffle ? 'text-primary' : 'text-muted-foreground')}>
            <Shuffle className="h-5 w-5" />
          </button>
          <button onClick={player.previous} className="p-2 text-foreground active:scale-90 transition-transform">
            <SkipBack className="h-7 w-7" />
          </button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={isPlaying ? player.pause : player.resume}
            className="p-5 rounded-full bg-foreground text-background shadow-xl"
          >
            {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-0.5" />}
          </motion.button>
          <button onClick={player.next} className="p-2 text-foreground active:scale-90 transition-transform">
            <SkipForward className="h-7 w-7" />
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

  // Mini player
  return (
    <>
      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className={cn(
            'fixed left-0 right-0 z-30',
            isMobile ? 'bottom-14 pb-0' : 'bottom-0'
          )}
        >
          {/* Glass background with enhanced blur */}
          <div className="absolute inset-0 glass-strong rounded-t-2xl" />

          {/* Animated progress bar on top for mobile */}
          {isMobile && (
            <div className="relative px-4 pt-2 z-10">
              <div className="h-[3px] rounded-full bg-muted/40 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3, ease: 'linear' }}
                />
              </div>
            </div>
          )}

          <motion.div
            className={cn('flex items-center gap-4 px-4 relative z-10', isMobile ? 'h-16' : 'h-20')}
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
              <div className={cn('rounded-xl overflow-hidden flex-shrink-0 shadow-lg', isMobile ? 'h-11 w-11' : 'h-14 w-14')}>
                {currentTrack.album_image ? (
                  <img src={currentTrack.album_image} alt={currentTrack.album_name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <Play className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{currentTrack.name}</p>
                <p className="text-xs truncate text-muted-foreground">{currentTrack.artist_name}</p>
              </div>
            </button>

            {/* Like button (desktop) */}
            {!isMobile && user && (
              <button
                onClick={() => toggleLike.mutate({ track: currentTrack, liked })}
                className={cn('p-1.5 rounded-full transition-all', liked ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground')}
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
                <button onClick={player.previous} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors active:scale-90">
                  <SkipBack className="h-4 w-4" />
                </button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={isPlaying ? player.pause : player.resume}
                  className="p-2.5 rounded-full bg-foreground text-background shadow-lg"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </motion.button>
                <button onClick={player.next} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors active:scale-90">
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
                  <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{formatTime(progress)}</span>
                  <Slider value={[progress]} max={duration || 100} step={0.1} onValueChange={([v]) => player.seek(v)} className="flex-1" />
                  <span className="text-[10px] text-muted-foreground w-8 tabular-nums">{formatTime(duration)}</span>
                </div>
              )}
            </div>

            {/* Volume + extras (desktop only) */}
            {!isMobile && (
              <div className="flex items-center gap-1.5 flex-1 justify-end">
                {sleepTimer !== null && (
                  <span className="text-[10px] text-primary flex items-center gap-0.5 mr-1">
                    <Timer className="h-3 w-3" />{sleepTimer}m
                  </span>
                )}
                <button onClick={() => player.setVisualizerEnabled(!visualizerEnabled)} className={cn('p-1.5 rounded-full transition-colors', visualizerEnabled ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                  <Waves className="h-4 w-4" />
                </button>
                <button onClick={() => setQueueOpen(o => !o)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors relative">
                  <ListMusic className="h-4 w-4" />
                  {upcomingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">{upcomingCount > 9 ? '9+' : upcomingCount}</span>
                  )}
                </button>
                <SleepTimerPopover />
                <button
                  onClick={() => player.setVolume(volume === 0 ? 0.7 : 0)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <Slider value={[volume]} max={1} step={0.01} onValueChange={([v]) => player.setVolume(v)} className="w-20" />
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
