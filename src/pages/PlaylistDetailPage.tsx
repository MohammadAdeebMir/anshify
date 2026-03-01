import { useState, useRef, useCallback } from 'react';
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

const TrackRow = ({
  track, tracks, playlistId, index,
  dragIndex, overIndex,
  onDragStart, onDragOver, onDragEnd,
}: {
  track: Track; tracks: Track[]; playlistId: string; index: number;
  dragIndex: number | null; overIndex: number | null;
  onDragStart: (i: number) => void; onDragOver: (i: number) => void; onDragEnd: () => void;
}) => {
  const { play, currentTrack } = usePlayer();
  const removeFromPlaylist = useRemoveFromPlaylist();
  const isActive = currentTrack?.id === track.id;
  const isDragging = dragIndex === index;
  const isOver = overIndex === index && dragIndex !== index;

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(index); }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg transition-all group select-none',
        isActive ? 'bg-primary/10' : 'hover:bg-muted/40',
        isDragging && 'opacity-40 scale-[0.97]',
        isOver && 'border-t-2 border-primary',
      )}
    >
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none">
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

const PlaylistDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playlists } = usePlaylists();
  const { songs, isLoading } = usePlaylistSongs(id);
  const { play } = usePlayer();
  const [searchOpen, setSearchOpen] = useState(false);
  const qc = useQueryClient();

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((i: number) => { setDragIndex(i); setOverIndex(null); }, []);
  const handleDragOver = useCallback((i: number) => setOverIndex(i), []);

  const handleDragEnd = useCallback(async () => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex || !id) {
      setDragIndex(null); setOverIndex(null); return;
    }

    // Reorder locally first for optimistic UI
    const reordered = [...songs];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(overIndex, 0, moved);

    // Update positions in DB
    const updates = reordered.map((t, i) =>
      supabase.from('playlist_songs').update({ position: i }).eq('playlist_id', id).eq('track_id', t.id)
    );
    await Promise.all(updates);
    qc.invalidateQueries({ queryKey: ['playlist-songs', id] });

    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, songs, id, qc]);

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
            <p className="text-xs text-muted-foreground">{songs.length} songs</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {songs.length > 0 && (
            <Button onClick={() => play(songs[0], songs)} className="rounded-xl bg-primary text-primary-foreground glow-primary">
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
          <PlaylistSearchAdd playlistId={id!} existingSongIds={songs.map(s => s.id)} onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
      ) : songs.length > 0 ? (
        <div className="glass rounded-2xl overflow-hidden">
          {songs.map((t, i) => (
            <TrackRow
              key={t.id} track={t} tracks={songs} playlistId={id!} index={i}
              dragIndex={dragIndex} overIndex={overIndex}
              onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}
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
