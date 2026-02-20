import { usePlayer } from '@/contexts/PlayerContext';
import { motion } from 'framer-motion';
import { ListMusic, Play, Trash2, X, Clock, Plus, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Track } from '@/types/music';
import { useState } from 'react';

const QueuePage = () => {
  const { queue, queueIndex, currentTrack, play, removeFromQueue, clearQueue, queueHistory, reorderQueue } = usePlayer();
  const [showHistory, setShowHistory] = useState(false);

  const upcomingTracks = queue.slice(queueIndex + 1);
  const playedTracks = queue.slice(0, queueIndex);

  const moveUp = (realIndex: number) => {
    if (realIndex > queueIndex + 1) reorderQueue(realIndex, realIndex - 1);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-extrabold text-foreground">Queue</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(h => !h)}
              className={cn('p-2 rounded-lg transition-colors', showHistory ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground')}
            >
              <Clock className="h-4 w-4" />
            </button>
            {upcomingTracks.length > 0 && (
              <Button onClick={clearQueue} size="sm" variant="outline" className="rounded-xl border-border/30 text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-sm">{queue.length} tracks · {upcomingTracks.length} upcoming</p>
      </motion.div>

      {showHistory ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Queue History</h2>
          {queueHistory.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No queue history yet</p>
            </div>
          ) : (
            queueHistory.slice().reverse().map((entry, i) => (
              <div key={i} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                  <p className="text-sm text-foreground">{entry.queue.length} tracks</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-border/30 text-xs"
                  onClick={() => { play(entry.queue[0], entry.queue); setShowHistory(false); }}
                >
                  Restore
                </Button>
              </div>
            ))
          )}
        </motion.div>
      ) : (
        <>
          {/* Now Playing */}
          {currentTrack && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">Now Playing</p>
              <div className="glass rounded-2xl overflow-hidden">
                <QueueTrack track={currentTrack} isActive />
              </div>
            </motion.div>
          )}

          {/* Up Next */}
          {upcomingTracks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">Up Next · {upcomingTracks.length}</p>
              <div className="glass rounded-2xl overflow-hidden">
                {upcomingTracks.map((track, i) => {
                  const realIndex = queueIndex + 1 + i;
                  return (
                    <QueueTrack
                      key={`${track.id}-${realIndex}`}
                      track={track}
                      index={i + 1}
                      onPlay={() => play(track, queue)}
                      onRemove={() => removeFromQueue(realIndex)}
                      onMoveUp={i > 0 ? () => moveUp(realIndex) : undefined}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Previously Played */}
          {playedTracks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">Previously Played</p>
              <div className="glass rounded-2xl overflow-hidden opacity-60">
                {playedTracks.map((track, i) => (
                  <QueueTrack
                    key={`${track.id}-prev-${i}`}
                    track={track}
                    onPlay={() => play(track, queue)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {queue.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center space-y-3">
              <ListMusic className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Queue is empty</p>
              <p className="text-xs text-muted-foreground/60">Play some tracks to build your queue</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const QueueTrack = ({ track, isActive, index, onPlay, onRemove, onMoveUp }: {
  track: Track; isActive?: boolean; index?: number;
  onPlay?: () => void; onRemove?: () => void; onMoveUp?: () => void;
}) => (
  <div className={cn(
    'flex items-center gap-3 p-3 transition-colors group',
    isActive ? 'bg-primary/10' : 'hover:bg-muted/30'
  )}>
    {index !== undefined && (
      <span className="text-xs text-muted-foreground w-5 text-right font-mono">{index}</span>
    )}
    <button onClick={onPlay} className="flex items-center gap-3 flex-1 min-w-0 text-left">
      <div className="h-10 w-10 rounded-md overflow-hidden shrink-0 relative">
        <img src={track.album_image} alt="" className="h-full w-full object-cover" />
        {isActive && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex gap-0.5">
              {[1, 2, 3].map(i => (
                <span key={i} className="w-0.5 bg-primary animate-pulse rounded-full" style={{ height: `${6 + i * 2}px`, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className={cn('text-sm font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
      </div>
    </button>
    <span className="text-xs text-muted-foreground tabular-nums">
      {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
    </span>
    {onMoveUp && (
      <button onClick={onMoveUp} className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
    )}
    {onRemove && (
      <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

export default QueuePage;
