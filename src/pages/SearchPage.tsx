import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Camera, Clock, Trash2, Play, Pause, Heart, Download, Music2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchYTMusic, getTracksByGenreYT } from '@/services/ytmusic';
import { usePlayer } from '@/contexts/PlayerContext';
import { useOfflineTracks, useIsOnline } from '@/hooks/useOffline';
import { Track } from '@/types/music';
import { YTSearchResults } from '@/components/search/YTSearchResults';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/* ─── Constants ─────────────────────────────────────────────────── */

const FEATURED_TILES = [
  { name: 'Music', gradient: 'from-[#E13300] to-[#E13300]/80', emoji: '🎵' },
  { name: 'Podcasts', gradient: 'from-[#006450] to-[#006450]/80', emoji: '🎙️' },
  { name: 'Live Events', gradient: 'from-[#8400E7] to-[#8400E7]/80', emoji: '🎤' },
  { name: 'Made For You', gradient: 'from-[#1E3264] to-[#1E3264]/80', emoji: '💜' },
];

const DISCOVER_CARDS = [
  { title: 'Music for you', query: 'top hits 2025 trending', img: '🎧' },
  { title: 'Lofi Beats', query: 'lofi hip hop chill beats', img: '🌙' },
  { title: 'Indie Picks', query: 'best indie songs 2025', img: '🎸' },
  { title: 'Workout Hits', query: 'workout gym motivation songs', img: '💪' },
  { title: 'Feel Good', query: 'feel good happy songs', img: '☀️' },
  { title: 'Late Night', query: 'late night chill vibes', img: '🌃' },
];

const GENRES = [
  { name: 'Pop', bg: '#E13300' },
  { name: 'Rock', bg: '#BA5D07' },
  { name: 'Electronic', bg: '#0D73EC' },
  { name: 'Hip Hop', bg: '#BC5900' },
  { name: 'Jazz', bg: '#477D95' },
  { name: 'Classical', bg: '#1E3264' },
  { name: 'R&B', bg: '#8C67AB' },
  { name: 'Country', bg: '#A56752' },
  { name: 'Metal', bg: '#503750' },
  { name: 'Reggae', bg: '#148A08' },
  { name: 'Latin', bg: '#E1118C' },
  { name: 'Ambient', bg: '#537AA5' },
  { name: 'Bollywood', bg: '#DC148C' },
  { name: 'K-Pop', bg: '#E61E32' },
];

/* ─── Recent searches helper ───────────────────────────────────── */
const RECENTS_KEY = 'search-recents';
const MAX_RECENTS = 12;

function getRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch { return []; }
}

function addRecent(q: string) {
  const list = getRecents().filter(r => r !== q);
  list.unshift(q);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
}

function clearRecents() {
  localStorage.removeItem(RECENTS_KEY);
}

/* ─── Animated Section ─────────────────────────────────────────── */
const Section = memo(({ title, children, delay = 0, right }: {
  title: string; children: React.ReactNode; delay?: number; right?: React.ReactNode;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, type: 'spring', stiffness: 150, damping: 24 }}
    className="space-y-3"
  >
    <div className="flex items-center justify-between">
      <h2 className="text-[17px] sm:text-lg font-bold text-foreground tracking-tight">{title}</h2>
      {right}
    </div>
    {children}
  </motion.section>
));
Section.displayName = 'SearchSection';

/* ─── Featured Tile ────────────────────────────────────────────── */
const FeaturedTile = memo(({ tile, onClick }: { tile: typeof FEATURED_TILES[0]; onClick: () => void }) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={cn(
      'relative overflow-hidden rounded-xl h-[88px] bg-gradient-to-br text-left transition-shadow',
      'shadow-lg hover:shadow-xl',
      tile.gradient,
    )}
  >
    <span className="absolute left-3.5 top-3 text-[15px] font-bold text-white drop-shadow-md">{tile.name}</span>
    <span className="absolute right-2 bottom-1.5 text-3xl opacity-60 rotate-[-15deg]">{tile.emoji}</span>
  </motion.button>
));
FeaturedTile.displayName = 'FeaturedTile';

/* ─── Discover Card ────────────────────────────────────────────── */
const DiscoverCard = memo(({ card, onClick }: { card: typeof DISCOVER_CARDS[0]; onClick: () => void }) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="flex-shrink-0 w-[150px] sm:w-[170px] group"
  >
    <div className="relative h-[150px] sm:h-[170px] rounded-xl overflow-hidden bg-secondary/60 shadow-lg group-hover:shadow-xl transition-shadow">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
      <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-40">{card.img}</div>
      <span className="absolute bottom-2.5 left-3 right-3 text-[13px] font-bold text-white leading-tight drop-shadow-md">
        {card.title}
      </span>
    </div>
  </motion.button>
));
DiscoverCard.displayName = 'DiscoverCard';

/* ─── Genre Card ───────────────────────────────────────────────── */
const GenreCard = memo(({ genre, active, onClick }: {
  genre: typeof GENRES[0]; active: boolean; onClick: () => void;
}) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={cn(
      'relative overflow-hidden rounded-xl h-[92px] text-left transition-all duration-200',
      'shadow-md hover:shadow-lg',
      active && 'ring-2 ring-white/40',
    )}
    style={{ background: genre.bg }}
  >
    <span className="absolute left-3.5 bottom-3 text-[15px] font-bold text-white drop-shadow-md">{genre.name}</span>
  </motion.button>
));
GenreCard.displayName = 'GenreCard';

/* ─── Background matching Home ─────────────────────────────────── */
const SearchBackground = memo(({ theme }: { theme: string }) => {
  if (theme === 'oled') return <div className="fixed inset-0 bg-black -z-10" />;
  if (theme === 'obsidian') return (
    <div className="fixed inset-0 -z-10" style={{
      background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(100,120,160,0.04), transparent 60%), #0b0b0f',
    }} />
  );
  return (
    <div className="fixed inset-0 -z-10" style={{
      background: `
        radial-gradient(ellipse 60% 45% at 30% 20%, rgba(180,140,80,0.045), transparent 55%),
        radial-gradient(ellipse 50% 40% at 70% 60%, rgba(160,120,60,0.03), transparent 50%),
        linear-gradient(180deg, #0e0e11 0%, #121216 100%)
      `,
    }} />
  );
});
SearchBackground.displayName = 'SearchBackground';

/* ─── Main SearchPage ──────────────────────────────────────────── */
const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>(getRecents());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { downloadedTracks } = useOfflineTracks();
  const isOnline = useIsOnline();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { play } = usePlayer();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.length >= 2) {
        addRecent(query);
        setRecents(getRecents());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: ytResults, isLoading: ytLoading, error: ytError, refetch: retrySearch } = useQuery({
    queryKey: ['yt-search', debouncedQuery],
    queryFn: () => searchYTMusic(debouncedQuery, 20, true),
    enabled: debouncedQuery.length >= 2 && isOnline,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: genreTracks, isLoading: loadingGenre } = useQuery({
    queryKey: ['genre-yt', selectedGenre],
    queryFn: () => getTracksByGenreYT(selectedGenre!, 20),
    enabled: !!selectedGenre && isOnline,
    staleTime: 5 * 60 * 1000,
  });

  const showResults = debouncedQuery.length >= 2;
  const showGenreResults = selectedGenre && !showResults;
  const showDiscovery = !showResults && !showGenreResults;

  const handleDiscoverClick = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    setSelectedGenre(null);
  }, []);

  const handleGenreClick = useCallback((name: string) => {
    setSelectedGenre(name);
    setQuery('');
  }, []);

  const handleRecentClick = useCallback((q: string) => {
    setQuery(q);
    setSelectedGenre(null);
  }, []);

  const handleClearRecents = useCallback(() => {
    clearRecents();
    setRecents([]);
  }, []);

  const handleFeaturedClick = useCallback((name: string) => {
    setQuery(name.toLowerCase());
    setSelectedGenre(null);
  }, []);

  const userInitial = user?.email?.[0]?.toUpperCase() || '?';

  return (
    <>
      <SearchBackground theme={theme} />

      <div className="relative min-h-screen pb-32">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 pt-3 pb-2 px-4 sm:px-6"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--background)) 70%, transparent 100%)',
          }}
        >
          <div className="max-w-5xl mx-auto space-y-3">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <Avatar className="h-8 w-8 bg-secondary border border-border/30">
                <AvatarFallback className="text-xs font-bold text-foreground bg-secondary">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Search</h1>
              <button className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors opacity-50">
                <Camera className="h-5 w-5" />
              </button>
            </div>

            {/* Search bar */}
            <div className={cn(
              'relative transition-all duration-200',
              isFocused && 'scale-[1.01]',
            )}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedGenre(null); }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="What do you want to listen to?"
                className={cn(
                  'w-full h-12 pl-11 pr-10 rounded-xl text-[15px] font-medium',
                  'bg-secondary/70 text-foreground placeholder:text-muted-foreground/60',
                  'border border-border/20 outline-none',
                  'transition-all duration-200',
                  isFocused && 'bg-secondary/90 border-border/40 shadow-lg shadow-black/20',
                )}
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setDebouncedQuery(''); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pt-2">
          <div className="max-w-5xl mx-auto space-y-7">

            {/* Search results */}
            <AnimatePresence mode="wait">
              {showResults && (
                <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-lg font-bold mb-3 text-foreground">Results</h2>
                  <YTSearchResults
                    tracks={ytResults}
                    isLoading={ytLoading}
                    error={ytError as Error | null}
                    onRetry={() => retrySearch()}
                    query={debouncedQuery}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Genre results */}
            <AnimatePresence mode="wait">
              {showGenreResults && (
                <motion.div key="genre" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-foreground">{selectedGenre}</h2>
                    <button onClick={() => setSelectedGenre(null)} className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg bg-secondary/50 transition-colors">
                      ✕ Clear
                    </button>
                  </div>
                  {loadingGenre ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
                      ))}
                    </div>
                  ) : genreTracks && genreTracks.length > 0 ? (
                    <div className="rounded-2xl overflow-hidden bg-secondary/20 backdrop-blur-sm">
                      <YTSearchResults tracks={genreTracks} isLoading={false} error={null} onRetry={() => {}} query={selectedGenre!} />
                    </div>
                  ) : (
                    <div className="rounded-2xl p-8 text-center bg-secondary/20">
                      <p className="text-sm text-muted-foreground">No tracks found for this genre</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Discovery sections */}
            {showDiscovery && (
              <>
                {/* Recent Searches */}
                {recents.length > 0 && (
                  <Section
                    title="Recent searches"
                    delay={0}
                    right={
                      <button onClick={handleClearRecents} className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                        <Trash2 className="h-3 w-3" />
                        Clear
                      </button>
                    }
                  >
                    <div className="flex flex-wrap gap-2">
                      {recents.map(r => (
                        <motion.button
                          key={r}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRecentClick(r)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-secondary/60 text-[13px] font-medium text-foreground hover:bg-secondary/90 transition-colors min-h-[36px]"
                        >
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{r}</span>
                        </motion.button>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Start browsing */}
                <Section title="Start browsing" delay={0.05}>
                  <div className="grid grid-cols-2 gap-3">
                    {FEATURED_TILES.map(tile => (
                      <FeaturedTile key={tile.name} tile={tile} onClick={() => handleFeaturedClick(tile.name)} />
                    ))}
                  </div>
                </Section>

                {/* Discover something new */}
                <Section title="Discover something new" delay={0.1}>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                    {DISCOVER_CARDS.map(card => (
                      <DiscoverCard key={card.title} card={card} onClick={() => handleDiscoverClick(card.query)} />
                    ))}
                  </div>
                </Section>

                {/* Browse all */}
                <Section title="Browse all" delay={0.15}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {GENRES.map(genre => (
                      <GenreCard
                        key={genre.name}
                        genre={genre}
                        active={selectedGenre === genre.name}
                        onClick={() => handleGenreClick(genre.name)}
                      />
                    ))}
                  </div>
                </Section>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default SearchPage;
