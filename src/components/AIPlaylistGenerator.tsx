import { useState } from 'react';
import { Sparkles, Save, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { searchYTMusic } from '@/services/ytmusic';
import { Track } from '@/types/music';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePlaylist, useAddToPlaylist } from '@/hooks/usePlaylist';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';
import { motion, AnimatePresence } from 'framer-motion';

const PROMPT_EXAMPLES = [
  'Late night sad songs',
  'Gym high energy',
  'Chill lo-fi study',
  'Road trip anthems',
  'Romantic dinner',
  'Morning coffee vibes',
];

export const AIPlaylistGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const { play, currentTrack } = usePlayer();
  const { user } = useAuth();
  const createPlaylist = useCreatePlaylist();
  const addToPlaylist = useAddToPlaylist();

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setGenerated(false);
    setTracks([]);
    try {
      const { data, error } = await supabase.functions.invoke('music-ai', {
        body: {
          action: 'prompt_playlist',
          prompt: prompt.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const queries: string[] = data.result || [];
      const allTracks: Track[] = [];
      const seen = new Set<string>();
      for (const q of queries.slice(0, 5)) {
        try {
          const results = await searchYTMusic(q, 5);
          for (const t of results) {
            if (!seen.has(t.id)) { seen.add(t.id); allTracks.push(t); }
          }
        } catch { /* skip */ }
      }
      setTracks(allTracks);
      setGenerated(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate playlist');
    }
    setLoading(false);
  };

  const saveAsPlaylist = async () => {
    if (!user || tracks.length === 0) return;
    try {
      const result = await createPlaylist.mutateAsync({ name: prompt.trim(), description: `AI generated: ${prompt}` });
      for (let i = 0; i < tracks.length; i++) {
        await addToPlaylist.mutateAsync({ playlistId: result.id, track: tracks[i], position: i });
      }
      toast.success('Playlist saved!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!user) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">AI Playlist</h2>
        </div>
        <div className="glass rounded-2xl p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Sign up to generate AI playlists tailored to your vibe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">AI Playlist</h2>
      </div>
      <p className="text-xs text-muted-foreground">Describe a vibe and we'll build a playlist for you.</p>

      <div className="flex gap-2">
        <Input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generate()}
          placeholder="e.g. Late night sad songs..."
          className="bg-secondary/50 border-border/30 text-sm"
        />
        <Button onClick={generate} disabled={loading || !prompt.trim()} className="rounded-xl bg-primary text-primary-foreground shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PROMPT_EXAMPLES.map(ex => (
          <button
            key={ex}
            onClick={() => setPrompt(ex)}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {loading && (
        <div className="glass rounded-2xl overflow-hidden">
          <SongListSkeleton count={5} />
        </div>
      )}

      <AnimatePresence>
        {generated && tracks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-2">
              <Button onClick={() => play(tracks[0], tracks)} size="sm" className="rounded-xl bg-primary text-primary-foreground">
                <Play className="h-3.5 w-3.5 mr-1" /> Play All
              </Button>
              {user && (
                <Button onClick={saveAsPlaylist} size="sm" variant="outline" className="rounded-xl border-border/30">
                  <Save className="h-3.5 w-3.5 mr-1" /> Save Playlist
                </Button>
              )}
            </div>
            <div className="glass rounded-2xl overflow-hidden">
              {tracks.map((track) => {
                const isActive = currentTrack?.id === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => play(track, tracks)}
                    className={cn('flex items-center gap-3 p-3 w-full text-left hover:bg-muted/30 transition-colors', isActive && 'bg-primary/10')}
                  >
                    <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0">
                      {track.album_image ? (
                        <img src={track.album_image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          <Play className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
                    </div>
                    {track.duration > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {generated && tracks.length === 0 && !loading && (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground">No tracks found. Try a different prompt.</p>
        </div>
      )}
    </div>
  );
};
