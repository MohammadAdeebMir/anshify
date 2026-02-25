import { usePlayer } from '@/contexts/PlayerContext';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, Timer, ChevronDown, Heart,
  ListMusic, Waves, Activity, Loader2, RotateCcw
} from 'lucide-react';
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

const IconBtn = ({
  onClick, active = false, className = '', children
}: { onClick: () => void; active?: boolean; className?: string; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center justify-center rounded-full transition-all duration-200 active:scale-90',
      active ? 'text-primary' : 'text-foreground/50 hover:text-foreground',
      className
    )}
  >
    {children}
  </button>
);

const ProgressBar = ({
  progress, duration, onSeek, compact = false, isBuffering = false
}: { progress: number; duration: number; onSeek: (v: number) => void; compact?: boolean; isBuffering?: boolean }) => {
  const percent = duration > 0 ? (progress / duration) * 100 : 0;
  if (compact) {
    return (
      <div className="w-full h-[3px] rounded-full bg-foreground/10 overflow-hidden">
        {isBuffering ? (
          <motion.div
            className="h-full bg-foreground/40 rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            style={{ width: '40%' }}
          />
        ) : (
          <motion.div
            className="h-full bg-foreground rounded-full"
            style={{ width: `${percent}%` }}
            transition={{ duration: 0.2, ease: 'linear' }}
          />
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 w-full">
      <span className="text-[10px] text-foreground/40 tabular-nums w-8 text-right">{formatTime(progress)}</span>
      <Slider
        value={[progress]}
        max={duration || 100}
        step={0.1}
        onValueChange={([v]) => onSeek(v)}
        className="flex-1"
      />
      <span className="text-[10px] text-foreground/40 tabular-nums w-8">{formatTime(duration)}</span>
    </div>
  );
};

// Play/Pause button that shows buffering state
const PlayPauseBtn = ({ size = 'md', isPlaying, isBuffering, playbackError, onPlay, onPause, onRetry }: {
  size?: 'sm' | 'md' | 'lg';
  isPlaying: boolean;
  isBuffering: boolean;
  playbackError: string | null;
  onPlay: () => void;
  onPause: () => void;
  onRetry: () => void;
}) => {
  const dims = size === 'lg' ? 'h-16 w-16' : size === 'md' ? 'h-9 w-9' : 'h-9 w-9';
  const iconDims = size === 'lg' ? 'h-7 w-7' : 'h-[15px] w-[15px]';

  if (playbackError) {
    return (
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onRetry}
        className={cn(dims, 'rounded-full bg-destructive/80 flex items-center justify-center shadow-2xl')}
        title={playbackError}
      >
        <RotateCcw className={cn(iconDims, 'text-white')} />
      </motion.button>
    );
  }

  if (isBuffering) {
    return (
      <div className={cn(dims, 'rounded-full bg-foreground flex items-center justify-center shadow-2xl')}>
        <Loader2 className={cn(iconDims, 'text-background animate-spin')} />
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={isPlaying ? onPause : onPlay}
      className={cn(dims, 'rounded-full bg-foreground flex items-center justify-center shadow-2xl')}
    >
      {isPlaying
        ? <Pause className={cn(iconDims, 'text-background fill-current')} />
        : <Play className={cn(iconDims, 'text-background fill-current ml-0.5')} />
      }
    </motion.button>
  );
};

export const PlayerBar = () => {
  const player = usePlayer();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { likedSongs } = useLikedSongs();
  const { isLiked, toggleLike } = useLikeTrack();
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const lastTapRef = useRef(0);
  const navigate = useNavigate();

  if (!player.currentTrack) return null;

  const { currentTrack, isPlaying, progress, duration, volume, shuffle, repeat, sleepTimer, queue, queueIndex, visualizerEnabled, workoutMode, isBuffering, playbackError } = player;
  const liked = isLiked(currentTrack.id, likedSongs);
  const upcomingCount = queue.length - queueIndex - 1;

  const handleSwipe = (_: any, info: PanInfo) => {
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

  // ─── MOBILE FULL-SCREEN PLAYER ──────────────────────────────────────────────
  if (isMobile && expanded) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 flex flex-col pb-[env(safe-area-inset-bottom)]"
        style={{ background: 'linear-gradient(180deg, hsl(0 0% 6%) 0%, hsl(0 0% 0%) 100%)' }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button onClick={() => setExpanded(false)} className="p-2 rounded-full text-foreground/50 hover:text-foreground hover:bg-foreground/8 transition-all">
            <ChevronDown className="h-6 w-6" />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Now Playing</p>
          </div>
          <div className="flex items-center gap-0.5">
            <SleepTimerPopover />
            <button onClick={() => { setExpanded(false); navigate('/queue'); }} className="p-2 text-foreground/50 hover:text-foreground transition-colors relative">
              <ListMusic className="h-5 w-5" />
              {upcomingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                  {upcomingCount > 9 ? '9+' : upcomingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Album art */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-8 gap-7"
          drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25}
          onDragEnd={handleSwipe} onTap={handleDoubleTap}
        >
          {visualizerEnabled ? (
            <MusicVisualizer className="w-72 h-72 rounded-3xl overflow-hidden" />
          ) : (
            <motion.div
              animate={isPlaying && !isBuffering ? { scale: [1, 1.018, 1] } : { scale: 0.95 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative w-72 h-72"
            >
              <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl">
                {currentTrack.album_image ? (
                  <img src={currentTrack.album_image} alt={currentTrack.album_name} className="h-full w-full object-cover" decoding="async" />
                ) : (
                  <div className="h-full w-full bg-foreground/5 flex items-center justify-center">
                    <Play className="h-12 w-12 text-foreground/20" />
                  </div>
                )}
              </div>
              {/* Ambient art glow */}
              {isPlaying && currentTrack.album_image && (
                <div className="absolute -inset-10 -z-10 rounded-[3rem] opacity-20 blur-3xl"
                  style={{ backgroundImage: `url(${currentTrack.album_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
              )}
              {/* Buffering overlay */}
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl">
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                </div>
              )}
              <AnimatePresence>
                {showHeartBurst && (
                  <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <Heart className="h-24 w-24 text-primary fill-current drop-shadow-2xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Track info + actions */}
          <div className="w-full max-w-xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold truncate text-foreground">{currentTrack.name}</p>
                <p className="text-sm text-foreground/50 truncate mt-0.5">{currentTrack.artist_name}</p>
              </div>
              <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                {user && (
                  <motion.button whileTap={{ scale: 0.85 }}
                    onClick={() => { toggleLike.mutate({ track: currentTrack, liked }); if (!liked) { setShowHeartBurst(true); setTimeout(() => setShowHeartBurst(false), 800); } }}
                    className={cn('p-2.5 rounded-full transition-all', liked ? 'text-primary' : 'text-foreground/40 hover:text-foreground')}>
                    <Heart className={cn('h-5 w-5', liked && 'fill-current')} />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Error message */}
            {playbackError && (
              <p className="text-xs text-destructive text-center">{playbackError}</p>
            )}

            <div className="flex items-center gap-2">
              <button onClick={() => player.setVisualizerEnabled(!visualizerEnabled)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border',
                  visualizerEnabled ? 'bg-primary/15 border-primary/30 text-primary' : 'border-foreground/10 text-foreground/40 hover:text-foreground hover:border-foreground/20')}>
                <Waves className="h-3.5 w-3.5" />Visualizer
              </button>
              <button onClick={() => player.setWorkoutMode(!workoutMode)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border',
                  workoutMode ? 'bg-primary/15 border-primary/30 text-primary' : 'border-foreground/10 text-foreground/40 hover:text-foreground hover:border-foreground/20')}>
                <Activity className="h-3.5 w-3.5" />Workout
              </button>
            </div>
          </div>
        </motion.div>

        {/* Seek bar */}
        <div className="px-7 space-y-1.5">
          <Slider value={[progress]} max={duration || 100} step={0.1} onValueChange={([v]) => player.seek(v)} className="h-2" />
          <div className="flex justify-between">
            <span className="text-[10px] text-foreground/35 tabular-nums">{formatTime(progress)}</span>
            <span className="text-[10px] text-foreground/35 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-between px-8 py-5">
          <IconBtn onClick={player.toggleShuffle} active={shuffle}><Shuffle className="h-5 w-5" /></IconBtn>
          <IconBtn onClick={player.previous} className="p-2"><SkipBack className="h-7 w-7 fill-current" /></IconBtn>
          <PlayPauseBtn size="lg" isPlaying={isPlaying} isBuffering={isBuffering} playbackError={playbackError} onPlay={player.resume} onPause={player.pause} onRetry={player.retryPlayback} />
          <IconBtn onClick={player.next} className="p-2"><SkipForward className="h-7 w-7 fill-current" /></IconBtn>
          <IconBtn onClick={player.toggleRepeat} active={repeat !== 'off'}>
            {repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
          </IconBtn>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 px-8 pb-5">
          <VolumeX className="h-4 w-4 text-foreground/30 flex-shrink-0" />
          <Slider value={[volume]} max={1} step={0.01} onValueChange={([v]) => player.setVolume(v)} className="flex-1" />
          <Volume2 className="h-4 w-4 text-foreground/30 flex-shrink-0" />
        </div>

        {sleepTimer !== null && (
          <div className="text-center pb-4">
            <span className="text-xs text-primary flex items-center justify-center gap-1"><Timer className="h-3 w-3" /> Sleep in {sleepTimer}m</span>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── MINI PLAYER ────────────────────────────────────────────────────────────
  return (
    <>
      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className={cn('fixed left-0 right-0 z-30', isMobile ? 'bottom-14' : 'bottom-0')}
        >
          <div className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, hsl(0 0% 7% / 0.97) 0%, hsl(0 0% 2% / 0.99) 100%)',
              backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
              borderTop: '1px solid hsl(0 0% 18% / 0.3)',
              boxShadow: '0 -8px 32px hsl(0 0% 0% / 0.5), 0 -1px 0 hsl(200 60% 50% / 0.06)',
            }}
          />

          {isMobile && (
            <div className="relative px-3 pt-2 z-10">
              <ProgressBar progress={progress} duration={duration} onSeek={player.seek} compact isBuffering={isBuffering} />
            </div>
          )}

          <motion.div
            className={cn('flex items-center gap-3 px-3 sm:px-5 relative z-10', isMobile ? 'h-[60px]' : 'h-[70px]')}
            drag={isMobile ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragEnd={handleSwipe}
          >
            <button onClick={() => isMobile && setExpanded(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className={cn('rounded-xl overflow-hidden flex-shrink-0 shadow-xl', isMobile ? 'h-10 w-10' : 'h-12 w-12')}>
                {currentTrack.album_image ? (
                  <img src={currentTrack.album_image} alt={currentTrack.album_name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="h-full w-full bg-foreground/8 flex items-center justify-center"><Play className="h-4 w-4 text-foreground/30" /></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate text-foreground">{currentTrack.name}</p>
                <p className="text-[11px] truncate text-foreground/45 mt-0.5">{currentTrack.artist_name}</p>
              </div>
            </button>

            {!isMobile && user && (
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleLike.mutate({ track: currentTrack, liked })}
                className={cn('p-1.5 rounded-full transition-all', liked ? 'text-primary' : 'text-foreground/35 hover:text-foreground')}>
                <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
              </motion.button>
            )}

            <div className={cn('flex flex-col items-center', isMobile ? 'gap-0' : 'gap-1 flex-1')}>
              <div className="flex items-center gap-2">
                {!isMobile && <IconBtn onClick={player.toggleShuffle} active={shuffle} className="p-1.5"><Shuffle className="h-4 w-4" /></IconBtn>}
                <IconBtn onClick={player.previous} className="p-1.5"><SkipBack className="h-[18px] w-[18px] fill-current text-foreground/70 hover:text-foreground" /></IconBtn>
                <PlayPauseBtn size="sm" isPlaying={isPlaying} isBuffering={isBuffering} playbackError={playbackError} onPlay={player.resume} onPause={player.pause} onRetry={player.retryPlayback} />
                <IconBtn onClick={player.next} className="p-1.5"><SkipForward className="h-[18px] w-[18px] fill-current text-foreground/70 hover:text-foreground" /></IconBtn>
                {!isMobile && <IconBtn onClick={player.toggleRepeat} active={repeat !== 'off'} className="p-1.5">
                  {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </IconBtn>}
              </div>
              {!isMobile && (
                <div className="w-full max-w-sm">
                  <ProgressBar progress={progress} duration={duration} onSeek={player.seek} isBuffering={isBuffering} />
                </div>
              )}
            </div>

            {!isMobile && (
              <div className="flex items-center gap-1 flex-1 justify-end">
                {sleepTimer !== null && (
                  <span className="text-[10px] text-primary flex items-center gap-0.5 mr-1"><Timer className="h-3 w-3" />{sleepTimer}m</span>
                )}
                <IconBtn onClick={() => player.setVisualizerEnabled(!visualizerEnabled)} active={visualizerEnabled} className="p-1.5"><Waves className="h-4 w-4" /></IconBtn>
                <button onClick={() => setQueueOpen(o => !o)} className="p-1.5 text-foreground/40 hover:text-foreground transition-colors relative">
                  <ListMusic className="h-4 w-4" />
                  {upcomingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">
                      {upcomingCount > 9 ? '9+' : upcomingCount}
                    </span>
                  )}
                </button>
                <SleepTimerPopover />
                <button onClick={() => player.setVolume(volume === 0 ? 0.7 : 0)} className="p-1.5 text-foreground/40 hover:text-foreground transition-colors">
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
