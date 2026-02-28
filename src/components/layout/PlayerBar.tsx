import { usePlayer } from '@/contexts/PlayerContext';
import {
  Play, Pause, SkipBack, SkipForward, VolumeX, Volume2,
  Shuffle, Repeat, Repeat1, Timer, ChevronDown, Heart,
  ListMusic, Loader2, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { SleepTimerPopover } from '@/components/SleepTimerPopover';
import { QueuePanel } from '@/components/QueuePanel';
import { useDominantColor } from '@/hooks/useDominantColor';

const formatTime = (s: number) => {
  if (!s || !isFinite(s) || isNaN(s) || s < 0) return '0:00';
  const clamped = Math.min(s, 86400); // guard against overflow
  const m = Math.floor(clamped / 60);
  const sec = Math.floor(clamped % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/* ─── Slim Seek Bar (polished) ─────────────────────────────────── */
const SlimSeekBar = memo(({ progress, duration, onSeek, isBuffering }: {
  progress: number; duration: number; onSeek: (v: number) => void; isBuffering?: boolean;
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const getProgressFromEvent = useCallback((clientX: number) => {
    if (!barRef.current || !duration || !isFinite(duration) || duration <= 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  }, [duration]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    const p = getProgressFromEvent(e.clientX);
    setDragProgress(p);
  }, [getProgressFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setDragProgress(getProgressFromEvent(e.clientX));
    });
  }, [dragging, getProgressFromEvent]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const seekTime = getProgressFromEvent(e.clientX);
    if (isFinite(seekTime) && seekTime >= 0) {
      onSeek(seekTime);
    }
  }, [dragging, getProgressFromEvent, onSeek]);

  const displayProgress = dragging ? dragProgress : Math.min(progress, duration || Infinity);
  const percent = duration > 0 && isFinite(duration) ? Math.min(100, Math.max(0, (displayProgress / duration) * 100)) : 0;

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-white/40 tabular-nums w-10 text-right font-light select-none">
          {formatTime(displayProgress)}
        </span>
        <div
          ref={barRef}
          className="flex-1 relative h-8 flex items-center cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Track bg */}
          <div className="absolute inset-x-0 h-[2px] bg-white/[0.12] rounded-full" />
          {/* Active progress with subtle glow */}
          {isBuffering ? (
            <motion.div
              className="absolute left-0 h-[2px] bg-white/30 rounded-full"
              animate={{ width: ['20%', '60%', '20%'], x: ['0%', '40%', '80%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            />
          ) : (
            <>
              <div
                className="absolute left-0 h-[2px] bg-white/90 rounded-full"
                style={{
                  width: `${percent}%`,
                  transition: dragging ? 'none' : 'width 0.15s linear',
                  boxShadow: '0 0 6px rgba(255,255,255,0.15)',
                }}
              />
            </>
          )}
          {/* Handle — thin vertical bar */}
          {!isBuffering && (
            <div
              className="absolute top-1/2 w-[2px] h-3 bg-white rounded-full pointer-events-none"
              style={{
                left: `${percent}%`,
                transform: `translateX(-50%) translateY(-50%) ${dragging ? 'scaleY(1.5)' : 'scaleY(1)'}`,
                transition: dragging ? 'none' : 'left 0.15s linear, transform 0.15s ease',
                boxShadow: dragging ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
              }}
            />
          )}
        </div>
        <span className="text-[11px] text-white/40 tabular-nums w-10 font-light select-none">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
});
SlimSeekBar.displayName = 'SlimSeekBar';

/* ─── Compact Progress (Mini Player) ───────────────────────────── */
const CompactProgress = memo(({ progress, duration, isBuffering }: {
  progress: number; duration: number; isBuffering?: boolean;
}) => {
  const percent = duration > 0 && isFinite(duration) ? Math.min(100, (progress / duration) * 100) : 0;
  return (
    <div className="w-full h-[2px] bg-white/[0.08] overflow-hidden">
      {isBuffering ? (
        <motion.div className="h-full bg-white/30" animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }} style={{ width: '40%' }} />
      ) : (
        <div className="h-full bg-white/80" style={{ width: `${percent}%`, transition: 'width 0.2s linear' }} />
      )}
    </div>
  );
});
CompactProgress.displayName = 'CompactProgress';

/* ─── Play/Pause Button ────────────────────────────────────────── */
const PlayPauseBtn = memo(({ size = 'md', isPlaying, isBuffering, playbackError, onPlay, onPause, onRetry }: {
  size?: 'sm' | 'md' | 'lg';
  isPlaying: boolean; isBuffering: boolean; playbackError: string | null;
  onPlay: () => void; onPause: () => void; onRetry: () => void;
}) => {
  const dims = size === 'lg' ? 'h-16 w-16' : size === 'md' ? 'h-10 w-10' : 'h-9 w-9';
  const iconSize = size === 'lg' ? 'h-7 w-7' : 'h-4 w-4';

  if (playbackError) {
    return (
      <motion.button whileTap={{ scale: 0.92 }} onClick={onRetry}
        className={cn(dims, 'rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] flex items-center justify-center')} title={playbackError}>
        <RotateCcw className={cn(iconSize, 'text-white/80')} />
      </motion.button>
    );
  }
  if (isBuffering) {
    return (
      <div className={cn(dims, 'rounded-full border border-white/20 flex items-center justify-center')}>
        <Loader2 className={cn(iconSize, 'text-white/70 animate-spin')} />
      </div>
    );
  }
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={isPlaying ? onPause : onPlay}
      className={cn(
        dims, 'rounded-full flex items-center justify-center transition-all duration-200',
        size === 'lg'
          ? 'bg-white/[0.12] backdrop-blur-md border border-white/[0.18] hover:bg-white/[0.18] shadow-[0_0_20px_rgba(255,255,255,0.06)]'
          : 'border border-white/60 hover:bg-white/10'
      )}
    >
      {isPlaying
        ? <Pause className={cn(iconSize, 'text-white fill-current')} />
        : <Play className={cn(iconSize, 'text-white fill-current ml-0.5')} />
      }
    </motion.button>
  );
});
PlayPauseBtn.displayName = 'PlayPauseBtn';

/* ─── Control Icon Button ──────────────────────────────────────── */
const CtrlBtn = memo(({ onClick, active, children, className }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; className?: string;
}) => (
  <motion.button
    whileTap={{ scale: 0.9, opacity: 0.7 }}
    onClick={onClick}
    className={cn(
      'flex items-center justify-center transition-colors duration-200',
      active ? 'text-white' : 'text-white/35 hover:text-white/60', className
    )}
  >
    {children}
  </motion.button>
));
CtrlBtn.displayName = 'CtrlBtn';

/* ═══════════════════════════════════════════════════════════════════
   MAIN PLAYER BAR
   ═══════════════════════════════════════════════════════════════════ */
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
  const dominantColor = useDominantColor(player.currentTrack?.album_image);

  // Preload next track artwork
  useEffect(() => {
    const { queue, queueIndex } = player;
    const nextTrack = queue[queueIndex + 1];
    if (nextTrack?.album_image) {
      const img = new Image();
      img.src = nextTrack.album_image;
    }
  }, [player.queueIndex, player.queue]);

  const handleArtworkSwipe = useCallback((_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100 && Math.abs(info.velocity.x) > 200 && Math.abs(info.offset.y) < 50) {
      info.offset.x > 0 ? player.previous() : player.next();
    }
  }, [player]);

  const handleVerticalGesture = useCallback((_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 40) return;
    if (info.offset.y < -70 && info.velocity.y < -100) setQueueOpen(true);
    if (info.offset.y > 90 && info.velocity.y > 100) setExpanded(false);
  }, []);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && user && player.currentTrack) {
      const ct = player.currentTrack;
      const l = isLiked(ct.id, likedSongs);
      toggleLike.mutate({ track: ct, liked: l });
      if (!l) { setShowHeartBurst(true); setTimeout(() => setShowHeartBurst(false), 800); }
    }
    lastTapRef.current = now;
  }, [user, player.currentTrack, isLiked, likedSongs, toggleLike]);

  const handleLike = useCallback(() => {
    if (!user || !player.currentTrack) return;
    const ct = player.currentTrack;
    const l = isLiked(ct.id, likedSongs);
    toggleLike.mutate({ track: ct, liked: l });
    if (!l) { setShowHeartBurst(true); setTimeout(() => setShowHeartBurst(false), 800); }
  }, [user, player.currentTrack, isLiked, likedSongs, toggleLike]);

  if (!player.currentTrack) return null;

  const { currentTrack, isPlaying, progress, duration, volume, shuffle, repeat,
    sleepTimer, queue, queueIndex, isBuffering, playbackError } = player;
  const liked = isLiked(currentTrack.id, likedSongs);
  const upcomingCount = queue.length - queueIndex - 1;

  // Dynamic gradient — cinematic, not flashy
  const cr = dominantColor.r, cg = dominantColor.g, cb = dominantColor.b;
  const bgGradient = `
    radial-gradient(ellipse at 50% 0%, rgba(${cr},${cg},${cb},0.3) 0%, transparent 55%),
    radial-gradient(ellipse at 50% 100%, rgba(${Math.round(cr*0.2)},${Math.round(cg*0.2)},${Math.round(cb*0.2)},0.35) 0%, transparent 45%),
    linear-gradient(180deg, #0c0c0e 0%, #060607 100%)
  `;

  /* ─── MOBILE FULL-SCREEN PLAYER ────────────────────────────────── */
  if (isMobile && expanded) {
    return (
      <>
        {/* Queue Bottom Sheet */}
        <AnimatePresence>
          {queueOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: '35%' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => { if (info.offset.y > 80) setQueueOpen(false); }}
              className="fixed inset-0 z-[60] bg-black/[0.96] backdrop-blur-2xl rounded-t-[28px] pt-3"
              style={{ top: 0 }}
            >
              <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-5" />
              <div className="px-6 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white tracking-tight">Up Next</h3>
                <button onClick={() => setQueueOpen(false)} className="text-white/40 text-xs font-medium">Done</button>
              </div>
              <div className="px-6 overflow-y-auto" style={{ maxHeight: '55vh' }}>
                {queue.slice(queueIndex + 1).map((track, i) => (
                  <button key={`${track.id}-${i}`} onClick={() => player.play(track, queue)}
                    className="flex items-center gap-3 w-full py-2.5 text-left active:opacity-60 transition-opacity">
                    <img src={track.album_image || ''} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{track.name}</p>
                      <p className="text-xs text-white/35 truncate">{track.artist_name}</p>
                    </div>
                  </button>
                ))}
                {upcomingCount === 0 && <p className="text-center text-white/25 text-sm py-10">Queue is empty</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: bgGradient, transition: 'background 400ms ease' }}
        >
          {/* Drag-down-to-close overlay */}
          <motion.div
            className="absolute inset-0 z-0"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.35}
            onDragEnd={handleVerticalGesture}
          />

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),16px)] pb-2 relative z-10">
            <motion.button whileTap={{ scale: 0.9, opacity: 0.6 }} onClick={() => setExpanded(false)} className="p-2 -ml-2 text-white/50">
              <ChevronDown className="h-6 w-6" />
            </motion.button>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30 select-none">Now Playing</p>
            <motion.button whileTap={{ scale: 0.9, opacity: 0.6 }} onClick={() => setQueueOpen(true)} className="p-2 -mr-2 text-white/50 relative">
              <ListMusic className="h-5 w-5" />
              {upcomingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-white text-[9px] font-bold text-black flex items-center justify-center">
                  {upcomingCount > 9 ? '9+' : upcomingCount}
                </span>
              )}
            </motion.button>
          </div>

          {/* Album art — large, centered, with glass + shadow */}
          <div className="flex-1 flex items-center justify-center px-10 relative z-10">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleArtworkSwipe}
              onTap={handleDoubleTap}
              className="w-full max-w-[320px] aspect-square relative"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTrack.id}
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  className="w-full h-full"
                >
                  {/* Ambient glow behind artwork */}
                  <div
                    className="absolute -inset-4 rounded-[32px] opacity-30 blur-3xl pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, rgba(${cr},${cg},${cb},0.5) 0%, transparent 70%)`,
                      transition: 'background 400ms ease',
                    }}
                  />
                  {/* Artwork card with glassmorphism */}
                  <div className="relative w-full h-full rounded-[20px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
                    {currentTrack.album_image ? (
                      <img
                        src={currentTrack.album_image}
                        alt={currentTrack.album_name || 'Album art'}
                        className="h-full w-full object-cover"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/5 flex items-center justify-center">
                        <Play className="h-12 w-12 text-white/15" />
                      </div>
                    )}
                    {/* Subtle glass highlight overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/[0.15] pointer-events-none" />
                  </div>

                  {/* Buffering overlay */}
                  {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-[20px]">
                      <Loader2 className="h-10 w-10 text-white/70 animate-spin" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Heart burst */}
              <AnimatePresence>
                {showHeartBurst && (
                  <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <Heart className="h-24 w-24 text-white fill-current drop-shadow-2xl" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Like button on artwork */}
              {user && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleLike}
                  className="absolute top-4 right-4 z-10 p-2"
                >
                  <Heart className={cn('h-6 w-6 drop-shadow-lg transition-colors', liked ? 'text-white fill-current' : 'text-white/50')} />
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* Track info + controls */}
          <div className="px-8 relative z-10 pb-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 16px)' }}>
            {/* Song info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack.id + '-info'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-6"
              >
                <p className="text-[18px] font-bold text-white truncate tracking-tight leading-tight">{currentTrack.name}</p>
                <p className="text-[14px] text-white/40 truncate mt-1 font-normal">{currentTrack.artist_name}</p>
              </motion.div>
            </AnimatePresence>

            {/* Error */}
            {playbackError && (
              <p className="text-xs text-red-400/80 text-center mb-3 font-medium">{playbackError}</p>
            )}

            {/* Seek bar */}
            <div className="mb-6">
              <SlimSeekBar progress={progress} duration={duration} onSeek={player.seek} isBuffering={isBuffering} />
            </div>

            {/* Main controls — 8pt grid aligned */}
            <div className="flex items-center justify-between px-6 mb-4">
              <CtrlBtn onClick={player.toggleShuffle} active={shuffle}>
                <Shuffle className="h-[22px] w-[22px]" />
              </CtrlBtn>
              <CtrlBtn onClick={player.previous} className="text-white/60 hover:text-white">
                <SkipBack className="h-7 w-7 fill-current" />
              </CtrlBtn>
              <PlayPauseBtn size="lg" isPlaying={isPlaying} isBuffering={isBuffering}
                playbackError={playbackError} onPlay={player.resume} onPause={player.pause} onRetry={player.retryPlayback} />
              <CtrlBtn onClick={player.next} className="text-white/60 hover:text-white">
                <SkipForward className="h-7 w-7 fill-current" />
              </CtrlBtn>
              <CtrlBtn onClick={player.toggleRepeat} active={repeat !== 'off'}>
                {repeat === 'one' ? <Repeat1 className="h-[22px] w-[22px]" /> : <Repeat className="h-[22px] w-[22px]" />}
              </CtrlBtn>
            </div>

            {sleepTimer !== null && (
              <div className="text-center mb-2">
                <span className="text-[10px] text-white/30 flex items-center justify-center gap-1">
                  <Timer className="h-3 w-3" /> Sleep in {sleepTimer}m
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </>
    );
  }

  /* ─── MINI PLAYER ──────────────────────────────────────────────── */
  return (
    <>
      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className={cn('fixed left-0 right-0 z-30', isMobile ? 'bottom-14' : 'bottom-0')}
      >
        <div className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(${cr},${cg},${cb},0.12) 0%, hsl(0 0% 3% / 0.98) 100%)`,
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            transition: 'background 400ms ease',
          }}
        />

        {/* Compact progress */}
        {isMobile && (
          <div className="relative z-10">
            <CompactProgress progress={progress} duration={duration} isBuffering={isBuffering} />
          </div>
        )}

        <motion.div
          className={cn('flex items-center gap-3 px-3 sm:px-5 relative z-10', isMobile ? 'h-[58px]' : 'h-[68px]')}
          drag={isMobile ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleArtworkSwipe}
        >
          <button onClick={() => isMobile && setExpanded(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <motion.div
              layoutId="player-artwork"
              className={cn('rounded-lg overflow-hidden flex-shrink-0 shadow-md', isMobile ? 'h-10 w-10' : 'h-12 w-12')}
            >
              {currentTrack.album_image ? (
                <img src={currentTrack.album_image} alt={currentTrack.album_name || ''}
                  className="h-full w-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="h-full w-full bg-white/5 flex items-center justify-center">
                  <Play className="h-4 w-4 text-white/20" />
                </div>
              )}
            </motion.div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate text-white tracking-tight">{currentTrack.name}</p>
              <p className="text-[11px] truncate text-white/35 mt-0.5">{currentTrack.artist_name}</p>
            </div>
          </button>

          {!isMobile && user && (
            <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike}
              className={cn('p-1.5 rounded-full transition-all', liked ? 'text-white' : 'text-white/25 hover:text-white/50')}>
              <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
            </motion.button>
          )}

          <div className={cn('flex flex-col items-center', isMobile ? 'gap-0' : 'gap-1 flex-1')}>
            <div className="flex items-center gap-2">
              {!isMobile && <CtrlBtn onClick={player.toggleShuffle} active={shuffle} className="p-1.5"><Shuffle className="h-4 w-4" /></CtrlBtn>}
              <CtrlBtn onClick={player.previous} className="p-1.5 text-white/50 hover:text-white"><SkipBack className="h-[18px] w-[18px] fill-current" /></CtrlBtn>
              <PlayPauseBtn size="sm" isPlaying={isPlaying} isBuffering={isBuffering}
                playbackError={playbackError} onPlay={player.resume} onPause={player.pause} onRetry={player.retryPlayback} />
              <CtrlBtn onClick={player.next} className="p-1.5 text-white/50 hover:text-white"><SkipForward className="h-[18px] w-[18px] fill-current" /></CtrlBtn>
              {!isMobile && <CtrlBtn onClick={player.toggleRepeat} active={repeat !== 'off'} className="p-1.5">
                {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              </CtrlBtn>}
            </div>
            {!isMobile && (
              <div className="w-full max-w-sm">
                <SlimSeekBar progress={progress} duration={duration} onSeek={player.seek} isBuffering={isBuffering} />
              </div>
            )}
          </div>

          {!isMobile && (
            <div className="flex items-center gap-1.5 flex-1 justify-end">
              {sleepTimer !== null && (
                <span className="text-[10px] text-white/30 flex items-center gap-0.5 mr-1"><Timer className="h-3 w-3" />{sleepTimer}m</span>
              )}
              <button onClick={() => setQueueOpen(o => !o)} className="p-1.5 text-white/25 hover:text-white/60 transition-colors relative">
                <ListMusic className="h-4 w-4" />
                {upcomingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white text-[8px] font-bold text-black flex items-center justify-center">
                    {upcomingCount > 9 ? '9+' : upcomingCount}
                  </span>
                )}
              </button>
              <SleepTimerPopover />
              <button onClick={() => player.setVolume(volume === 0 ? 0.7 : 0)}
                className="p-1.5 text-white/25 hover:text-white/60 transition-colors">
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
};
