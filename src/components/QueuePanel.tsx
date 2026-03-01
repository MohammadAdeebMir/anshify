import { usePlayer } from '@/contexts/PlayerContext';
import { X, GripVertical, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import { Track } from '@/types/music';

export const QueuePanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { queue, queueIndex, currentTrack, removeFromQueue, reorderQueue, clearQueue, play, queueHistory } = usePlayer();
  const [showHistory, setShowHistory] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRects = useRef<DOMRect[]>([]);
  const dragging = useRef(false);

  const upcomingTracks = queue.slice(queueIndex + 1);

  const captureRects = useCallback(() => {
    if (!containerRef.current) return;
    const rows = containerRef.current.querySelectorAll('[data-queue-row]');
    rowRects.current = Array.from(rows).map(r => r.getBoundingClientRect());
  }, []);

  const handleGripDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    setDragIdx(index);
    setOverIdx(index);
    captureRects();
  }, [captureRects]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || dragIdx === null) return;
    const y = e.clientY;
    let closest = dragIdx;
    for (let i = 0; i < rowRects.current.length; i++) {
      const rect = rowRects.current[i];
      if (y >= rect.top && y <= rect.bottom) { closest = i; break; }
    }
    if (rowRects.current.length > 0) {
      if (y < rowRects.current[0].top) closest = 0;
      if (y > rowRects.current[rowRects.current.length - 1].bottom) closest = rowRects.current.length - 1;
    }
    setOverIdx(closest);
  }, [dragIdx]);

  const handlePointerUp = useCallback(() => {
    if (!dragging.current || dragIdx === null || overIdx === null || dragIdx === overIdx) {
      dragging.current = false;
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    dragging.current = false;
    const fromReal = queueIndex + 1 + dragIdx;
    const toReal = queueIndex + 1 + overIdx;
    reorderQueue(fromReal, toReal);
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx, overIdx, queueIndex, reorderQueue]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 w-80 z-50 glass-strong border-l border-border/20 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-border/20">
            <h3 className="text-sm font-bold text-foreground">Queue</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowHistory(h => !h)} className={cn('p-1.5 rounded-lg transition-colors', showHistory ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                <Clock className="h-4 w-4" />
              </button>
              {upcomingTracks.length > 0 && (
                <button onClick={clearQueue} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {showHistory ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">Queue History</p>
                {queueHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No history yet</p>
                ) : (
                  queueHistory.slice().reverse().map((entry, i) => (
                    <div key={i} className="surface-elevated rounded-lg p-3 space-y-1">
                      <p className="text-[10px] text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                      <p className="text-xs text-foreground">{entry.queue.length} tracks</p>
                      <button
                        onClick={() => { play(entry.queue[0], entry.queue); setShowHistory(false); }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {/* Now Playing */}
                {currentTrack && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">Now Playing</p>
                    <QueueItem track={currentTrack} isActive />
                  </div>
                )}

                {/* Up Next — draggable */}
                {upcomingTracks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">
                      Up Next · {upcomingTracks.length}
                    </p>
                    <div
                      ref={containerRef}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className="touch-none"
                    >
                      {upcomingTracks.map((track, i) => {
                        const realIndex = queueIndex + 1 + i;
                        const isDragging = dragIdx === i;
                        const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
                        return (
                          <div
                            key={`${track.id}-${realIndex}`}
                            data-queue-row
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg transition-all group',
                              'hover:bg-muted/30',
                              isDragging && 'opacity-40 scale-[0.97]',
                              isOver && 'border-t-2 border-primary',
                            )}
                          >
                            <div
                              onPointerDown={(e) => handleGripDown(i, e)}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors p-1 touch-none"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <button onClick={() => play(track, queue)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              <div className="h-9 w-9 rounded-md overflow-hidden flex-shrink-0">
                                <img src={track.album_image} alt="" className="h-full w-full object-cover" loading="lazy" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate text-foreground">{track.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{track.artist_name}</p>
                              </div>
                            </button>
                            <button onClick={() => removeFromQueue(realIndex)}
                              className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {upcomingTracks.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Queue is empty</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Use the + button on tracks to add to queue</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Queue count */}
          <div className="p-3 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground text-center">{queue.length} tracks in queue</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const QueueItem = ({ track, isActive }: { track: Track; isActive?: boolean }) => (
  <div className={cn(
    'flex items-center gap-2 p-2 rounded-lg transition-colors',
    isActive ? 'bg-primary/10' : 'hover:bg-muted/30'
  )}>
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="h-9 w-9 rounded-md overflow-hidden flex-shrink-0">
        <img src={track.album_image} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="min-w-0">
        <p className={cn('text-xs font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{track.artist_name}</p>
      </div>
    </div>
  </div>
);
