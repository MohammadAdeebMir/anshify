import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, Trash2, Play, Pause, Flame, Music2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchYTMusic, getTrendingYT } from '@/services/ytmusic';
import { usePlayer } from '@/contexts/PlayerContext';
import { useIsOnline } from '@/hooks/useOffline';
import { Track } from '@/types/music';
import { YTSearchResults } from '@/components/search/YTSearchResults';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/* ─── Constants ─────────────────────────────────────────────────── */

const GENRE_SECTIONS = [
  { name: 'Pop Hits', query: 'pop hits 2025 trending' },
  { name: 'Hip Hop', query: 'hip hop rap 2025 popular' },
  { name: 'Chill Vibes', query: 'chill lofi relaxing vibes' },
  { name: 'Bollywood', query: 'bollywood hindi songs 2025' },
  { name: 'Rock Classics', query: 'rock classics best songs' },
  { name: 'R&B Soul', query: 'rnb soul smooth songs' },
];

/* ─── Recent searches helper ───────────────────────────────────── */
const RECENTS_KEY = 'search-recents';
const RECENTS_DATA_KEY = 'search-recents-data';
const MAX_RECENTS = 12;

interface RecentItem {
  query: string;
  track?: { name: string; artist: string; image: string };
}

function getRecents(): RecentItem[] {
  try {
    const data = localStorage.getItem(RECENTS_DATA_KEY);
    if (data) return JSON.parse(data);
    // fallback to old format
    const old = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
    return old.map((q: string) => ({ query: q }));
  } catch { return []; }
}

function addRecent(q: string, track?: Track) {
  const list = getRecents().filter(r => r.query !== q);
  list.unshift({
    query: q,
    track: track ? { name: track.name, artist: track.artist_name, image: track.album_image } : undefined,
  });
  localStorage.setItem(RECENTS_DATA_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
}

function clearRecents() {
  localStorage.removeItem(RECENTS_KEY);
  localStorage.removeItem(RECENTS_DATA_KEY);
}

/* ─── Crossfade image ──────────────────────────────────────────── */
const ImgFade = memo(({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn('relative overflow-hidden bg-muted/30', className)}>
      {!loaded && <div className="absolute inset-0 shimmer" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={cn('h-full w-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
});
ImgFade.displayName = 'ImgFade';

/* ─── Horizontal Carousel Shell ────────────────────────────────── */
const HCarousel = ({ children }: { children: React.ReactNode }) => (
  <div
    className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
    style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
  >
    {children}
  </div>
);

/* ─── Animated Section ─────────────────────────────────────────── */
const Section = memo(({ title, children, delay = 0, right }: {
  title: string; children: React.ReactNode; delay?: number; right?: React.ReactNode;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, type: 'spring', stiffness: 120, damping: 22 }}
    className="space-y-3"
  >
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
      {right}
    </div>
    {children}
  </motion.section>
));
Section.displayName = 'SearchSection';

/* ─── Track Card (horizontal carousel item) ────────────────────── */
const TrackCard = memo(({ track, tracks, size = 'md' }: { track: Track; tracks: Track[]; size?: 'sm' | 'md' }) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === track.id;
  const w = size === 'sm' ? 'w-[130px]' : 'w-[150px] sm:w-[165px]';
  const imgH = size === 'sm' ? 'h-[130px]' : 'h-[150px] sm:h-[165px]';

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => play(track, tracks)}
      className={cn('flex-shrink-0 snap-start text-left group', w)}
    >
      <div className={cn('relative rounded-2xl overflow-hidden shadow-lg shadow-black/30', imgH)}>
        {track.album_image ? (
          <ImgFade src={track.album_image} alt={track.name} className="h-full w-full" />
        ) : (
          <div className="h-full w-full bg-secondary/60 flex items-center justify-center">
            <Music2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
          <div className={cn(
            'h-10 w-10 rounded-full bg-primary/90 flex items-center justify-center shadow-xl',
            'opacity-0 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100'
          )}>
            {isActive && isPlaying ? (
              <Pause className="h-4 w-4 text-primary-foreground" />
            ) : (
              <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
            )}
          </div>
        </div>
        {/* Active indicator */}
        {isActive && isPlaying && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-[2px]">
            {[1, 2, 3].map(i => (
              <span key={i} className="w-[3px] bg-primary animate-pulse rounded-full" style={{ height: `${4 + i * 2}px`, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>
      <p className={cn('text-[13px] font-semibold truncate mt-2', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
      <p className="text-[11px] text-muted-foreground truncate">{track.artist_name}</p>
    </motion.button>
  );
});
TrackCard.displayName = 'TrackCard';

/* ─── Trending Card (visually strongest) ───────────────────────── */
const TrendingCard = memo(({ track, tracks, index }: { track: Track; tracks: Track[]; index: number }) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === track.id;

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => play(track, tracks)}
      className="flex-shrink-0 snap-start w-[160px] sm:w-[180px] text-left group"
    >
      <div className="relative h-[160px] sm:h-[180px] rounded-2xl overflow-hidden shadow-xl shadow-black/40">
        {track.album_image ? (
          <ImgFade src={track.album_image} alt={track.name} className="h-full w-full" />
        ) : (
          <div className="h-full w-full bg-secondary/60 flex items-center justify-center">
            <Music2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {/* Trending badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/90 backdrop-blur-sm">
          <Flame className="h-3 w-3 text-white" />
          <span className="text-[10px] font-bold text-white">#{index + 1}</span>
        </div>
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'h-11 w-11 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl',
            'opacity-0 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100'
          )}>
            {isActive && isPlaying ? (
              <Pause className="h-4.5 w-4.5 text-primary-foreground" />
            ) : (
              <Play className="h-4.5 w-4.5 text-primary-foreground ml-0.5" />
            )}
          </div>
        </div>
        {/* Bottom text */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <p className={cn('text-[13px] font-bold truncate text-white drop-shadow-md', isActive && 'text-primary')}>
            {track.name}
          </p>
          <p className="text-[11px] text-white/70 truncate">{track.artist_name}</p>
        </div>
      </div>
    </motion.button>
  );
});
TrendingCard.displayName = 'TrendingCard';

/* ─── Carousel Skeleton ────────────────────────────────────────── */
const CarouselSkeleton = ({ count = 5, h = 'h-[150px]' }: { count?: number; h?: string }) => (
  <div className="flex gap-3 overflow-hidden">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex-shrink-0 w-[150px] sm:w-[165px] space-y-2">
        <div className={cn('rounded-2xl shimmer', h)} />
        <div className="h-3 w-4/5 rounded shimmer" />
        <div className="h-2.5 w-3/5 rounded shimmer" />
      </div>
    ))}
  </div>
);

/* ─── Genre Section with its own query ─────────────────────────── */
const GenreCarousel = memo(({ genre }: { genre: typeof GENRE_SECTIONS[0] }) => {
  const isOnline = useIsOnline();
  const { data: tracks, isLoading } = useQuery({
    queryKey: ['search-genre-carousel', genre.query],
    queryFn: () => searchYTMusic(genre.query, 12),
    staleTime: 10 * 60 * 1000,
    enabled: isOnline,
  });

  return (
    <Section title={genre.name}>
      {isLoading ? (
        <CarouselSkeleton />
      ) : tracks && tracks.length > 0 ? (
        <HCarousel>
          {tracks.map(track => (
            <TrackCard key={track.id} track={track} tracks={tracks} />
          ))}
        </HCarousel>
      ) : null}
    </Section>
  );
});
GenreCarousel.displayName = 'GenreCarousel';

/* ─── Background matching themes ───────────────────────────────── */
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
  const [recents, setRecents] = useState<RecentItem[]>(getRecents());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOnline = useIsOnline();
  const { user } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.length >= 2) {
        addRecent(query);
        setRecents(getRecents());
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Search results
  const { data: ytResults, isLoading: ytLoading, error: ytError, refetch: retrySearch } = useQuery({
    queryKey: ['yt-search', debouncedQuery],
    queryFn: () => searchYTMusic(debouncedQuery, 20, true),
    enabled: debouncedQuery.length >= 2 && isOnline,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // Save first result track data to recents
  useEffect(() => {
    if (ytResults && ytResults.length > 0 && debouncedQuery.length >= 2) {
      addRecent(debouncedQuery, ytResults[0]);
      setRecents(getRecents());
    }
  }, [ytResults, debouncedQuery]);

  // Trending tracks
  const { data: trendingTracks, isLoading: loadingTrending } = useQuery({
    queryKey: ['search-trending'],
    queryFn: () => getTrendingYT(15),
    staleTime: 10 * 60 * 1000,
    enabled: isOnline,
  });

  // Most played / popular
  const { data: mostPlayed, isLoading: loadingMostPlayed } = useQuery({
    queryKey: ['search-most-played'],
    queryFn: () => searchYTMusic('most played songs 2025 popular', 15),
    staleTime: 10 * 60 * 1000,
    enabled: isOnline,
  });

  const showResults = debouncedQuery.length >= 2;
  const showDiscovery = !showResults;

  const handleRecentClick = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const handleClearRecents = useCallback(() => {
    clearRecents();
    setRecents([]);
  }, []);

  const userInitial = user?.email?.[0]?.toUpperCase() || '?';

  return (
    <>
      <SearchBackground theme={theme} />

      <div className="relative min-h-screen pb-32">
        {/* Sticky Header */}
        <div
          className="sticky top-0 z-20 pt-3 pb-3 px-4 sm:px-6"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--background)) 75%, hsl(var(--background) / 0) 100%)',
          }}
        >
          <div className="max-w-5xl mx-auto space-y-3">
            {/* Top row */}
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 bg-secondary border border-border/30">
                <AvatarFallback className="text-xs font-bold text-foreground bg-secondary">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Search</h1>
            </div>

            {/* Premium search bar */}
            <motion.div
              animate={isFocused ? { scale: 1.015 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative"
            >
              {/* Glow ring on focus */}
              {isFocused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -inset-[2px] rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--glow-soft) / 0.25), hsl(var(--glow-soft) / 0.08), hsl(var(--glow-soft) / 0.2))',
                    filter: 'blur(4px)',
                  }}
                />
              )}
              <div className={cn(
                'relative flex items-center gap-3 h-[52px] px-4 rounded-2xl',
                'transition-all duration-300',
                isFocused
                  ? 'shadow-[0_0_20px_rgba(255,255,255,0.12)]'
                  : 'shadow-[0_0_10px_rgba(255,255,255,0.05)]',
              )}
              style={{
                background: isFocused
                  ? 'hsl(0 0% 92%)'
                  : 'hsl(0 0% 85%)',
                border: isFocused
                  ? '1px solid hsl(0 0% 100% / 0.6)'
                  : '1px solid hsl(0 0% 70% / 0.3)',
              }}
              >
                <Search className="h-[18px] w-[18px] flex-shrink-0 text-black/50" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Search songs, artists, albums…"
                  className="flex-1 bg-transparent text-[15px] font-medium text-black placeholder:text-black/40 outline-none"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(''); setDebouncedQuery(''); inputRef.current?.focus(); }}
                    className="p-1.5 rounded-full hover:bg-black/10 transition-colors"
                  >
                    <X className="h-4 w-4 text-black/40" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pt-1">
          <div className="max-w-5xl mx-auto space-y-8">

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




            {/* Discovery sections */}
            {showDiscovery && (
              <>
                {/* 1. Recent Searches */}
                {recents.length > 0 && (
                  <Section
                    title="Recent Searches"
                    delay={0}
                    right={
                      <button onClick={handleClearRecents} className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                        <Trash2 className="h-3 w-3" /> Clear
                      </button>
                    }
                  >
                    <HCarousel>
                      {recents.map((r, i) => (
                        <motion.button
                          key={`${r.query}-${i}`}
                          whileTap={{ scale: 0.96 }}
                          whileHover={{ scale: 1.03 }}
                          onClick={() => handleRecentClick(r.query)}
                          className="flex-shrink-0 snap-start w-[120px] text-left group"
                        >
                          <div className="relative h-[120px] rounded-2xl overflow-hidden shadow-md shadow-black/20">
                            {r.track?.image ? (
                              <ImgFade src={r.track.image} alt={r.query} className="h-full w-full" />
                            ) : (
                              <div className="h-full w-full bg-secondary/50 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-muted-foreground/40" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          </div>
                          <p className="text-[12px] font-semibold text-foreground truncate mt-1.5">{r.track?.name || r.query}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{r.track?.artist || r.query}</p>
                        </motion.button>
                      ))}
                    </HCarousel>
                  </Section>
                )}

                {/* 2. Most Played */}
                <Section title="Most Played" delay={0.05}>
                  {loadingMostPlayed ? (
                    <CarouselSkeleton />
                  ) : mostPlayed && mostPlayed.length > 0 ? (
                    <HCarousel>
                      {mostPlayed.map(track => (
                        <TrackCard key={track.id} track={track} tracks={mostPlayed} />
                      ))}
                    </HCarousel>
                  ) : null}
                </Section>

                {/* 3. Trending Right Now — visually strongest */}
                <Section title="Trending Right Now 🔥" delay={0.1}>
                  {loadingTrending ? (
                    <CarouselSkeleton h="h-[180px]" />
                  ) : trendingTracks && trendingTracks.length > 0 ? (
                    <HCarousel>
                      {trendingTracks.map((track, i) => (
                        <TrendingCard key={track.id} track={track} tracks={trendingTracks} index={i} />
                      ))}
                    </HCarousel>
                  ) : null}
                </Section>

                {/* 4. Genre carousels — same style as above */}
                {GENRE_SECTIONS.map(genre => (
                  <GenreCarousel key={genre.name} genre={genre} />
                ))}
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default SearchPage;
