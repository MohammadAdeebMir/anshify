import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowUpDown, Filter, X, Music2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { searchYTMusic } from '@/services/ytmusic';
import { getTracksByGenre } from '@/services/jamendo';
import { usePlayer } from '@/contexts/PlayerContext';
import { useOfflineTracks } from '@/hooks/useOffline';
import { Track } from '@/types/music';
import { YTSearchResults } from '@/components/search/YTSearchResults';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton';
import { Heart, Download, Play, Pause } from 'lucide-react';

const genres = [
  { name: 'Pop', color: 'from-pink-500 to-rose-600' },
  { name: 'Rock', color: 'from-red-600 to-orange-500' },
  { name: 'Electronic', color: 'from-blue-500 to-cyan-400' },
  { name: 'Hip Hop', color: 'from-yellow-500 to-amber-600' },
  { name: 'Jazz', color: 'from-indigo-500 to-purple-600' },
  { name: 'Classical', color: 'from-emerald-500 to-teal-600' },
  { name: 'R&B', color: 'from-violet-500 to-fuchsia-500' },
  { name: 'Country', color: 'from-orange-500 to-yellow-500' },
  { name: 'Metal', color: 'from-gray-700 to-gray-900' },
  { name: 'Reggae', color: 'from-green-500 to-lime-500' },
  { name: 'Latin', color: 'from-red-500 to-pink-500' },
  { name: 'Ambient', color: 'from-sky-400 to-indigo-500' },
];

type SortMode = 'relevance' | 'name' | 'duration';

const GenreTrackRow = ({ track, tracks }: { track: Track; tracks: Track[] }) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const { user } = useAuth();
  const { likedSongs } = useLikedSongs();
  const { isLiked, toggleLike } = useLikeTrack();
  const { isDownloaded, download } = useOfflineTracks();
  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id, likedSongs);
  const downloaded = isDownloaded(track.id);

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-muted/50', isActive && 'bg-primary/10 ring-1 ring-primary/20')}>
      <button onClick={() => play(track, tracks)} className="flex items-center gap-3 flex-1 min-w-0 text-left group">
        <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
          <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {isActive && isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold truncate', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
        </div>
      </button>
      {user && (
        <>
          <button onClick={() => toggleLike.mutate({ track, liked })} className={cn('p-2 rounded-full transition-colors', liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
          </button>
          <AddToPlaylistButton track={track} />
          {!downloaded && (
            <button onClick={() => download.mutate(track)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
      </span>
    </div>
  );
};

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [showDownloaded, setShowDownloaded] = useState(false);
  const { downloadedTracks } = useOfflineTracks();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // YT Music search (primary)
  const { data: ytResults, isLoading: ytLoading, error: ytError, refetch: retrySearch } = useQuery({
    queryKey: ['yt-search', debouncedQuery],
    queryFn: () => searchYTMusic(debouncedQuery, 20),
    enabled: debouncedQuery.length >= 2,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // Genre browsing (Jamendo)
  const { data: genreTracks, isLoading: loadingGenre } = useQuery({
    queryKey: ['genre-tracks', selectedGenre],
    queryFn: () => getTracksByGenre(selectedGenre!, 20),
    enabled: !!selectedGenre,
    staleTime: 5 * 60 * 1000,
  });

  const showResults = debouncedQuery.length >= 2;
  const showGenreResults = selectedGenre && !showResults;

  const sortTracks = (tracks: Track[]): Track[] => {
    if (sortMode === 'name') return [...tracks].sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === 'duration') return [...tracks].sort((a, b) => b.duration - a.duration);
    return tracks;
  };

  const filterTracks = (tracks: Track[]): Track[] => {
    if (!showDownloaded) return tracks;
    const downloadedIds = new Set(downloadedTracks.map(t => t.id));
    return tracks.filter(t => downloadedIds.has(t.id));
  };

  const displayTracks = (tracks: Track[]) => filterTracks(sortTracks(tracks));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <Music2 className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Search</h1>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedGenre(null); }}
              placeholder="Search millions of songs..."
              className="pl-11 pr-10 h-12 rounded-2xl bg-muted/60 border-border/20 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 transition-all"
            />
            {query && (
              <button onClick={() => { setQuery(''); setDebouncedQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setSortMode(s => s === 'relevance' ? 'name' : s === 'name' ? 'duration' : 'relevance')}
              className="p-3 rounded-2xl bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title={`Sort: ${sortMode}`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
            {downloadedTracks.length > 0 && (
              <button
                onClick={() => setShowDownloaded(!showDownloaded)}
                className={cn('p-3 rounded-2xl transition-colors', showDownloaded ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:text-foreground')}
                title="Downloaded only"
              >
                <Filter className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {sortMode !== 'relevance' && (
          <p className="text-xs text-muted-foreground">Sorted by: {sortMode}</p>
        )}
      </motion.div>

      {/* YT Music Search Results */}
      {showResults && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h2 className="text-lg font-bold mb-3 text-foreground">Results</h2>
          <YTSearchResults
            tracks={ytResults ? displayTracks(ytResults) : undefined}
            isLoading={ytLoading}
            error={ytError as Error | null}
            onRetry={() => retrySearch()}
            query={debouncedQuery}
          />
        </motion.div>
      )}

      {/* Genre Results (Jamendo) */}
      {showGenreResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-foreground">{selectedGenre}</h2>
            <button onClick={() => setSelectedGenre(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">✕ Clear</button>
          </div>
          {loadingGenre ? (
            <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
          ) : genreTracks && genreTracks.length > 0 ? (
            <div className="glass rounded-2xl overflow-hidden">
              {displayTracks(genreTracks).map(t => <GenreTrackRow key={t.id} track={t} tracks={genreTracks} />)}
            </div>
          ) : (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No tracks found for this genre</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Downloaded tracks section */}
      {showDownloaded && downloadedTracks.length > 0 && !showResults && !showGenreResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-xl font-bold mb-4 text-foreground">Downloaded ({downloadedTracks.length})</h2>
          <div className="glass rounded-2xl overflow-hidden">
            {downloadedTracks.map(t => <GenreTrackRow key={t.id} track={t} tracks={downloadedTracks} />)}
          </div>
        </motion.div>
      )}

      {/* Genre Browse */}
      {!showResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 className="text-xl font-bold mb-4 text-foreground">Browse All</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {genres.map(genre => (
              <button
                key={genre.name}
                onClick={() => { setSelectedGenre(genre.name); setQuery(''); }}
                className={cn(
                  'relative overflow-hidden rounded-2xl p-5 h-28 bg-gradient-to-br text-left transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]',
                  genre.color,
                  selectedGenre === genre.name ? 'ring-2 ring-white/50 shadow-lg' : 'shadow-md'
                )}
              >
                <span className="text-lg font-bold text-white drop-shadow-lg">{genre.name}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SearchPage;
