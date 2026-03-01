import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchYTMusic } from '@/services/ytmusic';
import { useAddToPlaylist } from '@/hooks/usePlaylist';
import { Track } from '@/types/music';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PlaylistSearchAddProps {
  playlistId: string;
  existingSongIds: string[];
  onClose: () => void;
}

export const PlaylistSearchAdd = ({ playlistId, existingSongIds, onClose }: PlaylistSearchAddProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const addToPlaylist = useAddToPlaylist();

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  });

  // Use effect-like debounce
  const [searchTerm, setSearchTerm] = useState('');
  const handleQueryChange = (val: string) => {
    setQuery(val);
    clearTimeout((window as any).__plSearchTimer);
    (window as any).__plSearchTimer = setTimeout(() => setSearchTerm(val), 400);
  };

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['playlist-search', searchTerm],
    queryFn: () => searchYTMusic(searchTerm, 15),
    enabled: searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  const handleAdd = (track: Track) => {
    addToPlaylist.mutate({ playlistId, track, position: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="glass rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Add Songs</h3>
        <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="Search for songs to add..."
          className="pl-9 bg-secondary/50 border-border/30 rounded-xl"
          autoFocus
        />
      </div>

      <div className="max-h-[300px] overflow-y-auto space-y-1">
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && searchTerm.length >= 2 && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
        )}

        {results.map(track => {
          const alreadyAdded = existingSongIds.includes(track.id);
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'flex items-center gap-3 p-2 rounded-xl transition-colors',
                alreadyAdded ? 'opacity-50' : 'hover:bg-muted/40'
              )}
            >
              <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                {track.album_image && (
                  <img src={track.album_image} alt={track.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
              </div>
              <button
                onClick={() => handleAdd(track)}
                disabled={alreadyAdded || addToPlaylist.isPending}
                className={cn(
                  'p-1.5 rounded-full transition-colors flex-shrink-0',
                  alreadyAdded
                    ? 'text-muted-foreground cursor-default'
                    : 'text-primary hover:bg-primary/10'
                )}
              >
                {alreadyAdded ? (
                  <span className="text-[10px] font-medium">Added</span>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </motion.div>
          );
        })}

        {searchTerm.length < 2 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Type at least 2 characters to search
          </p>
        )}
      </div>
    </motion.div>
  );
};
