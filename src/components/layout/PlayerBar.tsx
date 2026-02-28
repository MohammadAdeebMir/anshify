import { usePlayer } from '@/contexts/PlayerContext';
import {
  Play, Pause, SkipBack, SkipForward, VolumeX, Volume2,
  Shuffle, Repeat, Repeat1, Timer, ChevronDown, Heart,
  ListMusic, Loader2, RotateCcw, Music2, Share2, MoreHorizontal,
  Moon, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useState, useRef, useCallback, useEffect, memo, useMemo } from 'react';

/* ─── Marquee Text ───────────────────────────────────────────────── */
const MarqueeText = memo(({ text, className }: { text: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollDuration, setScrollDuration] = useState(8);

  useEffect(() => {
    const check = () => {
      const container = containerRef.current;
      const textEl = textRef.current;
      if (!container || !textEl) return;
      const overflow = textEl.scrollWidth > container.clientWidth + 2;
      setShouldScroll(overflow);
      if (overflow) {
        // ~40px/s scroll speed
        setScrollDuration(Math.max(4, textEl.scrollWidth / 40));
      }
    };
    check();
    const ro = new ResizeObserver(check);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden whitespace-nowrap relative"
      style={{
        maskImage: shouldScroll
          ? 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)'
          : undefined,
        WebkitMaskImage: shouldScroll
          ? 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)'
          : undefined,
      }}
    >
      <span
        ref={textRef}
        className={cn(className, shouldScroll && 'inline-block')}
        style={
          shouldScroll
            ? {
                animation: `marquee-scroll ${scrollDuration}s linear 1.2s infinite`,
                willChange: 'transform',
              }
            : undefined
        }
      >
        {text}
        {shouldScroll && (
          <span className="inline-block" style={{ paddingLeft: '3em' }}>
            {text}
          </span>
        )}
      </span>
    </div>
  );
});
MarqueeText.displayName = 'MarqueeText';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { SleepTimerPopover } from '@/components/SleepTimerPopover';
import { QueuePanel } from '@/components/QueuePanel';
import { useDominantColor } from '@/hooks/useDominantColor';

const formatTime = (s: number) => {
  if (!s || !isFinite(s) || isNaN(s) || s < 0) return '0:00';
  const clamped = Math.min(s, 86400);
  const m = Math.floor(clamped / 60);
  const sec = Math.floor(clamped % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/* ─── Slim Seek Bar ──────────────────────────────────────────────── */
const SlimSeekBar = memo(({ progress, duration, onSeek, isBuffering, accentColor }: {
  progress: number; duration: number; onSeek: (v: number) => void; isBuffering?: boolean;
  accentColor?: string;
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const getProgressFromEvent = useCallback((clientX: number) => {
    if (!barRef.current || !duration || !isFinite(duration) || duration <= 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  }, [duration]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setDragProgress(getProgressFromEvent(e.clientX));
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
    if (isFinite(seekTime) && seekTime >= 0) onSeek(seekTime);
  }, [dragging, getProgressFromEvent, onSeek]);

  const displayProgress = dragging ? dragProgress : Math.min(progress, duration || Infinity);
  const percent = duration > 0 && isFinite(duration) ? Math.min(100, Math.max(0, (displayProgress / duration) * 100)) : 0;
  const glowColor = accentColor || 'rgba(255,255,255,0.12)';

  return (
    <div className="w-full space-y-0.5">
      <div
        ref={barRef}
        className="relative h-10 flex items-center cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute inset-x-0 h-[3px] bg-white/[0.1] rounded-full" />
        {isBuffering ? (
          <motion.div
            className="absolute left-0 h-[3px] bg-white/25 rounded-full"
            animate={{ width: ['20%', '60%', '20%'], x: ['0%', '40%', '80%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        ) : (
          <div
            className="absolute left-0 h-[3px] bg-white rounded-full"
            style={{
              width: `${percent}%`,
              transition: dragging ? 'none' : 'width 0.15s linear',
              boxShadow: `0 0 8px ${glowColor}`,
            }}
          />
        )}
        {!isBuffering && (
          <div
            className="absolute top-1/2 w-[3px] h-4 bg-white rounded-full pointer-events-none"
            style={{
              left: `${percent}%`,
              transform: `translateX(-50%) translateY(-50%) ${dragging ? 'scaleY(1.4)' : 'scaleY(1)'}`,
              transition: dragging ? 'none' : 'left 0.15s linear, transform 0.15s ease',
              boxShadow: dragging ? `0 0 10px ${glowColor}` : 'none',
            }}
          />
        )}
      </div>
      <div className="flex justify-between px-0.5">
        <span className="text-[11px] text-white/35 tabular-nums font-light select-none">
          {formatTime(displayProgress)}
        </span>
        <span className="text-[11px] text-white/35 tabular-nums font-light select-none">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
});
SlimSeekBar.displayName = 'SlimSeekBar';

/* ─── Compact Progress (Mini Player) ─────────────────────────────── */
const CompactProgress = memo(({ progress, duration, isBuffering }: {
  progress: number; duration: number; isBuffering?: boolean;
}) => {
  const percent = duration > 0 && isFinite(duration) ? Math.min(100, (progress / duration) * 100) : 0;
  return (
    <div className="w-full h-[2px] bg-white/[0.06] overflow-hidden">
      {isBuffering ? (
        <motion.div className="h-full bg-white/25" animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }} style={{ width: '40%' }} />
      ) : (
        <div className="h-full bg-white/70" style={{ width: `${percent}%`, transition: 'width 0.2s linear' }} />
      )}
    </div>
  );
});
CompactProgress.displayName = 'CompactProgress';

/* ─── Play/Pause Button ──────────────────────────────────────────── */
const PlayPauseBtn = memo(({ size = 'md', isPlaying, isBuffering, playbackError, onPlay, onPause, onRetry }: {
  size?: 'sm' | 'md' | 'lg';
  isPlaying: boolean; isBuffering: boolean; playbackError: string | null;
  onPlay: () => void; onPause: () => void; onRetry: () => void;
}) => {
  const dims = size === 'lg' ? 'h-[68px] w-[68px]' : size === 'md' ? 'h-10 w-10' : 'h-9 w-9';
  const iconSize = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4';
  const roundStyle = size === 'lg' ? 'rounded-2xl' : 'rounded-full';

  if (playbackError) {
    return (
      <motion.button whileTap={{ scale: 0.9 }} onClick={onRetry}
        className={cn(dims, roundStyle, 'bg-white/10 backdrop-blur-sm flex items-center justify-center')} title={playbackError}>
        <RotateCcw className={cn(iconSize, 'text-white/80')} />
      </motion.button>
    );
  }
  if (isBuffering) {
    return (
      <div className={cn(dims, roundStyle, 'bg-white/5 flex items-center justify-center')}>
        <Loader2 className={cn(iconSize, 'text-white/60 animate-spin')} />
      </div>
    );
  }
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={isPlaying ? onPause : onPlay}
      className={cn(
        dims, roundStyle, 'flex items-center justify-center',
        size === 'lg'
          ? 'bg-white text-black hover:bg-white/90 shadow-[0_4px_24px_rgba(255,255,255,0.15)]'
          : 'bg-white text-black hover:bg-white/90'
      )}
    >
      {isPlaying
        ? <Pause className={cn(iconSize, 'fill-current')} />
        : <Play className={cn(iconSize, 'fill-current ml-0.5')} />
      }
    </motion.button>
  );
});
PlayPauseBtn.displayName = 'PlayPauseBtn';

/* ─── Control Icon Button ──────────────────────────────────────── */
const CtrlBtn = memo(({ onClick, active, children, className: cls }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; className?: string;
}) => (
  <motion.button
    whileTap={{ scale: 0.82, opacity: 0.5 }}
    transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.6 }}
    onClick={onClick}
    className={cn(
      'flex items-center justify-center min-w-[44px] min-h-[44px] transition-colors duration-200',
      'active:bg-white/[0.08] rounded-xl',
      active ? 'text-white' : 'text-white/40 hover:text-white/65', cls
    )}
  >
    {children}
  </motion.button>
));
CtrlBtn.displayName = 'CtrlBtn';

/* ─── Lyrics Bottom Sheet ──────────────────────────────────────── */
const LyricsSheet = memo(({ open, onClose, trackName }: {
  open: boolean; onClose: () => void; trackName: string;
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: '8%' }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 200) onClose(); }}
          className="fixed inset-0 z-[65] rounded-t-[28px] overflow-hidden"
          style={{ top: 0 }}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />

          {/* Handle */}
          <div className="relative z-10 pt-3 pb-2 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="relative z-10 px-6 pb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight">Lyrics</h3>
            <button onClick={onClose} className="text-sm font-medium text-white/40 active:text-white/70 min-w-[44px] min-h-[44px] flex items-center justify-center">
              Done
            </button>
          </div>

          {/* Lyrics content — empty state for now */}
          <div className="relative z-10 flex-1 px-8 overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-5">
                <Music2 className="h-8 w-8 text-white/20" />
              </div>
              <p className="text-base font-semibold text-white/50 mb-1.5">No lyrics available</p>
              <p className="text-sm text-white/25 text-center max-w-[240px] leading-relaxed">
                Lyrics for "{trackName}" aren't available yet
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
LyricsSheet.displayName = 'LyricsSheet';

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
  const [lyricsOpen, setLyricsOpen] = useState(false);
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
    if (info.offset.y < -80 && info.velocity.y < -150) setQueueOpen(true);
    if (info.offset.y > 100 && info.velocity.y > 120) setExpanded(false);
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

  // Dynamic gradient — Spotify-level bold vertical blend
  const { r: cr, g: cg, b: cb, sr, sg, sb } = dominantColor;
  const accentGlow = `rgba(${cr},${cg},${cb},0.5)`;
  // Rich multi-stop gradient: bold top fading to deep dark bottom
  const bgGradient = `
    linear-gradient(180deg,
      rgb(${cr},${cg},${cb}) 0%,
      rgb(${cr},${cg},${cb}) 20%,
      rgb(${Math.round(cr*0.75)},${Math.round(cg*0.75)},${Math.round(cb*0.75)}) 40%,
      rgb(${Math.round(cr*0.4)},${Math.round(cg*0.4)},${Math.round(cb*0.4)}) 60%,
      rgb(${Math.round(cr*0.15)},${Math.round(cg*0.15)},${Math.round(cb*0.15)}) 80%,
      rgb(12,12,14) 100%
    )
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
              animate={{ y: '30%' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => { if (info.offset.y > 80) setQueueOpen(false); }}
              className="fixed inset-0 z-[60] bg-black/[0.95] backdrop-blur-2xl rounded-t-[28px] pt-3"
              style={{ top: 0 }}
            >
              <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-5" />
              <div className="px-6 pb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-white tracking-tight">Up Next</h3>
                <button onClick={() => setQueueOpen(false)} className="text-white/40 text-sm font-medium min-w-[44px] min-h-[44px] flex items-center justify-center">Done</button>
              </div>
              <div className="px-6 overflow-y-auto" style={{ maxHeight: '58vh' }}>
                {queue.slice(queueIndex + 1).map((track, i) => (
                  <button key={`${track.id}-${i}`} onClick={() => player.play(track, queue)}
                    className="flex items-center gap-3 w-full py-3 text-left active:opacity-50 transition-opacity">
                    <img src={track.album_image || ''} alt="" className="w-11 h-11 rounded-lg object-cover bg-white/5" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{track.name}</p>
                      <p className="text-xs text-white/30 truncate">{track.artist_name}</p>
                    </div>
                  </button>
                ))}
                {upcomingCount === 0 && <p className="text-center text-white/20 text-sm py-12">Queue is empty</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lyrics Sheet */}
        <LyricsSheet open={lyricsOpen} onClose={() => setLyricsOpen(false)} trackName={currentTrack.name} />

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden"
          style={{ backgroundColor: '#0a0a0c' }}
        >
          {/* Animated background — Spotify-level gradient */}
          <div
            className="absolute inset-0"
            style={{ background: bgGradient, transition: 'background 400ms cubic-bezier(0.4,0,0.2,1)', zIndex: 0 }}
          />
          {/* Subtle dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/[0.15]" style={{ zIndex: 0 }} />

          {/* Drag-down-to-close overlay */}
          <motion.div
            className="absolute inset-0"
            style={{ zIndex: 1 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.3}
            onDragEnd={handleVerticalGesture}
          />

          {/* ── Top header: centered "Now Playing" + track title ── */}
          <div className="relative flex flex-col items-center"
            style={{ zIndex: 2, paddingTop: 'max(env(safe-area-inset-top, 12px), 20px)' }}>
            {/* Chevron down button - absolute left */}
            <motion.button whileTap={{ scale: 0.88, opacity: 0.5 }} onClick={() => setExpanded(false)}
              className="absolute left-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/50"
              style={{ top: 'max(env(safe-area-inset-top, 12px), 20px)' }}>
              <ChevronDown className="h-7 w-7" />
            </motion.button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40 select-none">Now Playing</p>
            <div className="mt-1.5 px-16 max-w-full">
              <MarqueeText text={currentTrack.name} className="text-[13px] font-medium text-white/70 text-center" />
            </div>
          </div>

          {/* ── Album art — large, immersive, centered with cinematic entrance ── */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22, mass: 0.8, delay: 0.1 }}
            className="flex-1 flex items-center justify-center px-[8%] relative min-h-0 py-4" style={{ zIndex: 2 }}
          >
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={handleArtworkSwipe}
              onTap={handleDoubleTap}
              className="w-[82vw] max-w-[480px] aspect-square relative"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTrack.id}
                  initial={{ scale: 0.92, opacity: 0, filter: 'blur(12px)' }}
                  animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                  exit={{ scale: 0.94, opacity: 0, filter: 'blur(8px)' }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  className="w-full h-full"
                >
                  {/* Ambient glow behind artwork */}
                  <div
                    className="absolute -inset-8 rounded-[40px] opacity-30 blur-[50px] pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, rgba(${cr},${cg},${cb},0.5) 0%, transparent 70%)`,
                      transition: 'background 400ms cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                  {/* Artwork card */}
                  <div className="relative w-full h-full rounded-[14px] overflow-hidden shadow-[0_16px_60px_rgba(0,0,0,0.6)]">
                    {currentTrack.album_image ? (
                      <img
                        src={currentTrack.album_image}
                        alt={currentTrack.album_name || 'Album art'}
                        className="h-full w-full object-cover"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/[0.04] flex items-center justify-center">
                        <Music2 className="h-16 w-16 text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/[0.12] pointer-events-none" />
                  </div>

                  {/* Buffering overlay */}
                  {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-[14px]">
                      <Loader2 className="h-10 w-10 text-white/60 animate-spin" />
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
            </motion.div>
          </motion.div>

          {/* ── Track info + controls bottom section ── */}
          <div className="relative px-[8%]" style={{ zIndex: 2, paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 16px)' }}>

            {/* Song info row: title+artist left, share/heart/more right */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack.id + '-info'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between mb-5"
              >
                <div className="min-w-0 flex-1 mr-3" style={{ textShadow: `0 0 24px rgba(${cr},${cg},${cb},0.35), 0 0 48px rgba(${cr},${cg},${cb},0.12)`, transition: 'text-shadow 400ms ease' }}>
                  <MarqueeText text={currentTrack.name} className="text-[20px] font-bold text-white tracking-tight leading-tight" />
                  <MarqueeText text={currentTrack.artist_name} className="text-[14px] text-white/50 mt-0.5 font-normal" />
                </div>
                <div className="flex items-center gap-1">
                  <motion.button whileTap={{ scale: 0.85 }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/[0.06] active:bg-white/[0.12] transition-colors">
                    <Share2 className="h-[18px] w-[18px] text-white/50" />
                  </motion.button>
                  {user && (
                    <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/[0.06] active:bg-white/[0.12] transition-colors">
                      <Heart className={cn('h-[18px] w-[18px] transition-colors', liked ? 'text-white fill-current' : 'text-white/50')} />
                    </motion.button>
                  )}
                  <motion.button whileTap={{ scale: 0.85 }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/[0.06] active:bg-white/[0.12] transition-colors">
                    <MoreHorizontal className="h-[18px] w-[18px] text-white/50" />
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Error */}
            {playbackError && (
              <p className="text-xs text-red-400/80 text-center mb-3 font-medium">{playbackError}</p>
            )}

            {/* Seek bar */}
            <div className="mb-4">
              <SlimSeekBar progress={progress} duration={duration} onSeek={player.seek} isBuffering={isBuffering} accentColor={accentGlow} />
            </div>

            {/* Main controls — rounded square backgrounds like screenshot */}
            <div className="flex items-center justify-between px-1 mb-5">
              <motion.button
                whileTap={{ scale: 0.82, opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.6 }}
                onClick={player.toggleShuffle}
                className={cn(
                  'h-[52px] w-[52px] rounded-2xl flex flex-col items-center justify-center transition-all duration-150 relative',
                  'bg-white/[0.06] active:bg-white/[0.14] backdrop-blur-sm',
                  shuffle ? 'text-white' : 'text-white/40'
                )}>
                <Shuffle className="h-[20px] w-[20px]" />
                {shuffle && <motion.span initial={{ scale: 0 }} animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-1.5 w-1 h-1 rounded-full bg-white" />}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.82, opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.6 }}
                onClick={player.previous}
                className="h-[52px] w-[52px] rounded-2xl flex items-center justify-center bg-white/[0.06] active:bg-white/[0.14] backdrop-blur-sm text-white/70 transition-all duration-150">
                <SkipBack className="h-6 w-6 fill-current" />
              </motion.button>

              {/* Large center play button — white rounded square */}
              <PlayPauseBtn size="lg" isPlaying={isPlaying} isBuffering={isBuffering}
                playbackError={playbackError} onPlay={player.resume} onPause={player.pause} onRetry={player.retryPlayback} />

              <motion.button
                whileTap={{ scale: 0.82, opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.6 }}
                onClick={player.next}
                className="h-[52px] w-[52px] rounded-2xl flex items-center justify-center bg-white/[0.06] active:bg-white/[0.14] backdrop-blur-sm text-white/70 transition-all duration-150">
                <SkipForward className="h-6 w-6 fill-current" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.82, opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.6 }}
                onClick={player.toggleRepeat}
                className={cn(
                  'h-[52px] w-[52px] rounded-2xl flex flex-col items-center justify-center transition-all duration-150 relative',
                  'bg-white/[0.06] active:bg-white/[0.14] backdrop-blur-sm',
                  repeat !== 'off' ? 'text-white' : 'text-white/40'
                )}>
                {repeat === 'one' ? <Repeat1 className="h-[20px] w-[20px]" /> : <Repeat className="h-[20px] w-[20px]" />}
                {repeat !== 'off' && <motion.span initial={{ scale: 0 }} animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-1.5 w-1 h-1 rounded-full bg-white" />}
              </motion.button>
            </div>

            {/* Bottom action row — Queue | Sleep | Lyrics | More */}
            <div className="flex items-center justify-between gap-2">
              <motion.button
                whileTap={{ scale: 0.88, opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.6 }}
                onClick={() => setQueueOpen(true)}
                className="flex items-center gap-2 h-[44px] px-4 rounded-full bg-white/[0.06] active:bg-white/[0.12] transition-all duration-150"
              >
                <ListMusic className="h-4 w-4 text-white/50" />
                <span className="text-[13px] font-medium text-white/50">Queue</span>
              </motion.button>

              <SleepTimerPopover />

              <motion.button
                whileTap={{ scale: 0.88, opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.6 }}
                onClick={() => setLyricsOpen(true)}
                className="flex items-center gap-2 h-[44px] px-4 rounded-full bg-white/[0.06] active:bg-white/[0.12] transition-all duration-150"
              >
                <ListMusic className="h-4 w-4 text-white/50" />
                <span className="text-[13px] font-medium text-white/50">Lyrics</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.82, opacity: 0.4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.6 }}
                className="h-[44px] w-[44px] rounded-full bg-white/[0.06] active:bg-white/[0.12] flex items-center justify-center transition-all duration-150"
              >
                <MoreHorizontal className="h-5 w-5 text-white/40" />
              </motion.button>
            </div>
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
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className={cn('fixed left-0 right-0 z-30', isMobile ? 'bottom-14' : 'bottom-0')}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={(_, info) => {
          if (info.offset.y > 60 || info.velocity.y > 300) {
            player.dismissPlayer();
          }
        }}
      >
        <div className="absolute inset-0 rounded-t-xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, rgba(${cr},${cg},${cb},0.85) 0%, rgba(${Math.round(cr*0.6)},${Math.round(cg*0.6)},${Math.round(cb*0.6)},0.9) 100%)`,
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            transition: 'background 500ms ease',
          }}
        />

        {isMobile && (
          <div className="relative z-10">
            <CompactProgress progress={progress} duration={duration} isBuffering={isBuffering} />
          </div>
        )}

        <motion.div
          className={cn('flex items-center gap-3 px-3 sm:px-5 relative z-10', isMobile ? 'h-[60px]' : 'h-[68px]')}
        >
          <button onClick={() => isMobile && setExpanded(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <motion.div
              layoutId="player-artwork"
              className={cn('rounded-lg overflow-hidden flex-shrink-0 shadow-md', isMobile ? 'h-11 w-11' : 'h-12 w-12')}
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
              <MarqueeText text={currentTrack.name} className="text-[13px] font-semibold text-white tracking-tight" />
              <MarqueeText text={currentTrack.artist_name} className="text-[11px] text-amber-300/60 mt-0.5" />
            </div>
          </button>

          {!isMobile && user && (
            <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike}
              className={cn('p-1.5 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center', liked ? 'text-white' : 'text-white/25 hover:text-white/50')}>
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
              {isMobile && (
                <motion.button whileTap={{ scale: 0.8 }} onClick={player.dismissPlayer}
                  className="ml-1 p-1.5 text-white/30 hover:text-white/60 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                  <X className="h-4 w-4" />
                </motion.button>
              )}
              {!isMobile && <CtrlBtn onClick={player.toggleRepeat} active={repeat !== 'off'} className="p-1.5">
                {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              </CtrlBtn>}
            </div>
            {!isMobile && (
              <div className="w-full max-w-sm">
                <SlimSeekBar progress={progress} duration={duration} onSeek={player.seek} isBuffering={isBuffering} accentColor={accentGlow} />
              </div>
            )}
          </div>

          {!isMobile && (
            <div className="flex items-center gap-1.5 flex-1 justify-end">
              {sleepTimer !== null && (
                <span className="text-[10px] text-white/30 flex items-center gap-0.5 mr-1"><Timer className="h-3 w-3" />{sleepTimer}m</span>
              )}
              <button onClick={() => setQueueOpen(o => !o)} className="p-1.5 text-white/25 hover:text-white/60 transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ListMusic className="h-4 w-4" />
                {upcomingCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-white text-[8px] font-bold text-black flex items-center justify-center">
                    {upcomingCount > 9 ? '9+' : upcomingCount}
                  </span>
                )}
              </button>
              <SleepTimerPopover />
              <button onClick={() => player.setVolume(volume === 0 ? 0.7 : 0)}
                className="p-1.5 text-white/25 hover:text-white/60 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <motion.button whileTap={{ scale: 0.8 }} onClick={player.dismissPlayer}
                className="p-1.5 text-white/25 hover:text-white/60 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="h-4 w-4" />
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
};
