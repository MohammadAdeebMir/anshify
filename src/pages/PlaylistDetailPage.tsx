import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, Play, Trash2, ArrowLeft, Plus, Copy, GripVertical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlaylists, usePlaylistSongs, useRemoveFromPlaylist } from '@/hooks/usePlaylist';
import { usePlayer } from '@/contexts/PlayerContext';
import { Track } from '@/types/music';
import { Button } from '@/components/ui/button';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';
import { PlaylistSearchAdd } from '@/components/PlaylistSearchAdd';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

/* ─── Drag-reorder hook using pointer events (touch + mouse) ───── */
function useDragReorder(items: Track[], playlistId: string | undefined) {
  const qc = useQueryClient();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [orderedItems, setOrderedItems] = useState<Track[]>(items);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRects = useRef<DOMRect[]>([]);
  const dragging = useRef(false);

  // Sync when items change externally
  useEffect(() => { setOrderedItems(items); }, [items]);

  const captureRects = useCallback(() => {
    if (!containerRef.current) return;
    const rows = containerRef.current.querySelectorAll('[data-drag-row]');
    rowRects.current = Array.from(rows).map(r => r.getBoundingClientRect());
  }, []);

  const handlePointerDown = useCallback((index: number, e: React.PointerEvent) => {
    // Only start drag from the grip handle
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
      if (y < rect.top + rect.height / 2 && i > 0) { closest = i; break; }
    }
    // Also handle above/below all rows
    if (rowRects.current.length > 0) {
      if (y < rowRects.current[0].top) closest = 0;
      if (y > rowRects.current[rowRects.current.length - 1].bottom) closest = rowRects.current.length - 1;
    }
    setOverIdx(closest);
  }, [dragIdx]);

  const handlePointerUp = useCallback(async () => {
    if (!dragging.current || dragIdx === null || overIdx === null || dragIdx === overIdx) {
      dragging.current = false;
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    dragging.current = false;

    // Optimistic reorder
    const reordered = [...orderedItems];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);
    setOrderedItems(reordered);
    setDragIdx(null);
    setOverIdx(null);

    // Persist positions
    if (playlistId) {
      const updates = reordered.map((t, i) =>
        supabase.from('playlist_songs').update({ position: i }).eq('playlist_id', playlistId).eq('track_id', t.id)
      );
      await Promise.all(updates);
      qc.invalidateQueries({ queryKey: ['playlist-songs', playlistId] });
    }
  }, [dragIdx, overIdx, orderedItems, playlistId, qc]);

  return { containerRef, orderedItems, dragIdx, overIdx, handlePointerDown, handlePointerMove, handlePointerUp };
}

/* ─── Track Row ───────────────────────────────────────────────── */
const TrackRow = ({
  track, tracks, playlistId, index,
  dragIdx, overIdx, onGripPointerDown,
}: {
  track: Track; tracks: Track[]; playlistId: string; index: number;
  dragIdx: number | null; overIdx: number | null;
  onGripPointerDown: (i: number, e: React.PointerEvent) => void;
}) => {
  const { play, currentTrack } = usePlayer();
  const removeFromPlaylist = useRemoveFromPlaylist();
  const isActive = currentTrack?.id === track.id;
  const isDragging = dragIdx === index;
  const isOver = overIdx === index && dragIdx !== null && dragIdx !== index;

  return (
    <div
      data-drag-row
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg transition-all group select-none',
        isActive ? 'bg-primary/10' : 'hover:bg-muted/40',
        isDragging && 'opacity-40 scale-[0.97]',
        isOver && 'border-t-2 border-primary',
      )}
    >
      <div
        onPointerDown={(e) => onGripPointerDown(index, e)}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none p-1"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <button onClick={() => play(track, tracks)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
          <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
        </div>
      </button>
      <button
        onClick={() => removeFromPlaylist.mutate({ playlistId, trackId: track.id })}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
      </span>
    </div>
  );
};

/* ─── Page ────────────────────────────────────────────────────── */
const PlaylistDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playlists } = usePlaylists();
  const { songs, isLoading } = usePlaylistSongs(id);
  const { play } = usePlayer();
  const [searchOpen, setSearchOpen] = useState(false);

  const {
    containerRef, orderedItems, dragIdx, overIdx,
    handlePointerDown, handlePointerMove, handlePointerUp,
  } = useDragReorder(songs, id);

  const playlist = playlists.find(p => p.id === id);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSharePlaylist = () => {
    const url = `${window.location.origin}/playlist/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Playlist link copied!');
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-36">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-end gap-5">
          <div className="h-36 w-36 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center flex-shrink-0">
            <ListMusic className="h-12 w-12 text-primary/60" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Playlist</p>
            <h1 className="text-3xl font-extrabold text-foreground">{playlist?.name || 'Playlist'}</h1>
            {playlist?.description && <p className="text-sm text-muted-foreground">{playlist.description}</p>}
            <p className="text-xs text-muted-foreground">{orderedItems.length} songs</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {orderedItems.length > 0 && (
            <Button onClick={() => play(orderedItems[0], orderedItems)} className="rounded-xl bg-primary text-primary-foreground glow-primary">
              <Play className="h-4 w-4 mr-1 fill-current" /> Play All
            </Button>
          )}
          <Button onClick={() => setSearchOpen(true)} variant="outline" className="rounded-xl border-border/30">
            <Plus className="h-4 w-4 mr-1" /> Add Songs
          </Button>
          <Button onClick={handleSharePlaylist} variant="outline" size="icon" className="rounded-xl border-border/30">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {searchOpen && (
          <PlaylistSearchAdd playlistId={id!} existingSongIds={orderedItems.map(s => s.id)} onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
      ) : orderedItems.length > 0 ? (
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="glass rounded-2xl overflow-hidden"
        >
          {orderedItems.map((t, i) => (
            <TrackRow
              key={t.id} track={t} tracks={orderedItems} playlistId={id!} index={i}
              dragIdx={dragIdx} overIdx={overIdx}
              onGripPointerDown={handlePointerDown}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center space-y-3">
          <ListMusic className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-semibold text-foreground">This playlist is empty</h3>
          <p className="text-sm text-muted-foreground">Click "Add Songs" above to search and add music.</p>
          <Button onClick={() => setSearchOpen(true)} className="rounded-xl bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" /> Add Songs
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlaylistDetailPage;
