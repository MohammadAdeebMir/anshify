import { useState, useEffect } from 'react';
import { Search, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { searchTracks, getTracksByGenre } from '@/services/jamendo';
import { usePlayer } from '@/contexts/PlayerContext';
import { Track } from '@/types/music';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';

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

const TrackResult = ({ track, tracks }: { track: Track; tracks: Track[] }) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === track.id;

  return (
    <button
      onClick={() => play(track, tracks)}
      className={`flex items-center gap-3 p-3 w-full text-left rounded-lg transition-colors hover:bg-muted/40 ${isActive ? 'bg-primary/10' : ''}`}
    >
      <div className="relative h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
        <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Play className="h-4 w-4 text-white fill-current" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.name}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
      </span>
    </button>
  );
};

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search-tracks', debouncedQuery],
    queryFn: () => searchTracks(debouncedQuery, 20),
    enabled: debouncedQuery.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  const { data: genreTracks, isLoading: loadingGenre } = useQuery({
    queryKey: ['genre-tracks', selectedGenre],
    queryFn: () => getTracksByGenre(selectedGenre!, 20),
    enabled: !!selectedGenre,
    staleTime: 5 * 60 * 1000,
  });

  const showResults = debouncedQuery.length >= 2;
  const showGenreResults = selectedGenre && !showResults;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <h1 className="text-3xl font-extrabold text-foreground">Search</h1>
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedGenre(null); }}
            placeholder="What do you want to listen to?"
            className="pl-10 h-12 rounded-xl bg-muted/60 border-border/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </motion.div>

      {showResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-xl font-bold mb-4 text-foreground">Results for "{debouncedQuery}"</h2>
          {searching ? (
            <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="glass rounded-2xl overflow-hidden">
              {searchResults.map(t => <TrackResult key={t.id} track={t} tracks={searchResults} />)}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No results found</p>
          )}
        </motion.div>
      )}

      {showGenreResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-foreground">{selectedGenre}</h2>
            <button onClick={() => setSelectedGenre(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Clear</button>
          </div>
          {loadingGenre ? (
            <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
          ) : genreTracks && genreTracks.length > 0 ? (
            <div className="glass rounded-2xl overflow-hidden">
              {genreTracks.map(t => <TrackResult key={t.id} track={t} tracks={genreTracks} />)}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No tracks found for this genre</p>
          )}
        </motion.div>
      )}

      {!showResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 className="text-xl font-bold mb-4 text-foreground">Browse All</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {genres.map(genre => (
              <button
                key={genre.name}
                onClick={() => { setSelectedGenre(genre.name); setQuery(''); }}
                className={`relative overflow-hidden rounded-2xl p-5 h-28 bg-gradient-to-br ${genre.color} text-left transition-transform hover:scale-[1.03] active:scale-[0.98] ${selectedGenre === genre.name ? 'ring-2 ring-white/50' : ''}`}
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
