import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { TrendingUp, Music2, Sparkles, Clock, Users, Headphones, Zap } from 'lucide-react';
import { getTrendingYT, getNewReleasesYT, searchYTMusic } from '@/services/ytmusic';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useRecentlyPlayed } from '@/hooks/useLibrary';
import { useLocalRecommendations, usePopularArtists, useMoodSections } from '@/hooks/useRecommendations';
import { useAIRecommendations, useDailyMixes } from '@/hooks/useAI';
import { loadTasteProfile } from '@/services/tasteProfile';
import { Track } from '@/types/music';
import { HorizontalCarousel } from '@/components/home/HorizontalCarousel';
import { TrackCard } from '@/components/home/TrackCard';
import { ArtistCircle } from '@/components/home/ArtistCircle';
import { ContinueListening } from '@/components/home/ContinueListening';
import { ContinueListeningSkeleton, CarouselSkeleton, ArtistCarouselSkeleton } from '@/components/home/HomeSkeletons';
import { DailyMixCard } from '@/components/home/DailyMixCard';
import { useState, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/* ─── Filter Pills ─────────────────────────────────────────────── */
const FILTERS = ['All', 'Music', 'Podcasts'] as const;
type Filter = typeof FILTERS[number];

const FilterPills = memo(({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) => (
  <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
    {FILTERS.map(f => (
      <motion.button
        key={f}
        whileTap={{ scale: 0.94 }}
        onClick={() => onChange(f)}
        className={cn(
          'px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200',
          'min-h-[34px] flex-shrink-0',
          active === f
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        )}
      >
        {f}
      </motion.button>
    ))}
  </div>
));
FilterPills.displayName = 'FilterPills';

/* ─── Section wrapper ──────────────────────────────────────────── */
const Section = memo(({ title, children, delay = 0, showSeeAll, emoji }: {
  title: string; children: React.ReactNode; delay?: number; showSeeAll?: boolean; emoji?: string;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, type: 'spring', stiffness: 140, damping: 22 }}
    className="space-y-3.5"
  >
    <div className="flex items-center justify-between">
      <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-tight">
        {emoji && <span className="mr-1.5">{emoji}</span>}
        {title}
      </h2>
      {showSeeAll && (
        <span className="text-[12px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          See All
        </span>
      )}
    </div>
    {children}
  </motion.section>
));
Section.displayName = 'Section';

/* ─── Quick Pick Row (list-style like reference) ───────────────── */
const QuickPickRow = memo(({ tracks }: { tracks: Track[] }) => {
  const { play, pause, currentTrack, isPlaying } = usePlayer();
  if (!tracks?.length) return null;

  return (
    <div className="space-y-1">
      {tracks.slice(0, 4).map((track) => {
        const isActive = currentTrack?.id === track.id;
        return (
          <motion.button
            key={track.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => isActive && isPlaying ? pause() : play(track, tracks)}
            className="flex items-center gap-3 w-full py-2.5 px-1 rounded-xl text-left active:bg-secondary/50 transition-colors"
          >
            <img
              src={track.album_image || ''}
              alt=""
              className="w-12 h-12 rounded-lg object-cover bg-secondary flex-shrink-0 shadow-sm"
              loading="lazy"
              decoding="async"
            />
            <div className="min-w-0 flex-1">
              <p className={cn('text-[14px] font-semibold truncate', isActive ? 'text-primary' : 'text-foreground')}>
                {track.name}
              </p>
              <p className="text-[12px] text-muted-foreground truncate">{track.artist_name}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
});
QuickPickRow.displayName = 'QuickPickRow';

/* ─── Fallback queries ─────────────────────────────────────────── */
const FALLBACK_QUERIES = [
  { query: 'top hits 2025 popular', label: 'Top Hits Right Now', emoji: '🔥' },
  { query: 'viral songs trending', label: 'Going Viral', emoji: '📈' },
  { query: 'best songs of all time', label: 'All-Time Classics', emoji: '⭐' },
  { query: 'chill hits relax', label: 'Chill Vibes', emoji: '🌊' },
];

function useFallbackSections() {
  return useQuery({
    queryKey: ['home-fallback-sections'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        FALLBACK_QUERIES.map(async ({ query, label, emoji }) => {
          const tracks = await searchYTMusic(query, 12);
          return { label, emoji, tracks };
        })
      );
      return results
        .filter((r): r is PromiseFulfilledResult<{ label: string; emoji: string; tracks: Track[] }> =>
          r.status === 'fulfilled' && r.value.tracks.length > 0
        )
        .map(r => r.value);
    },
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}

/* ═══════════════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════════════ */
const Index = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('All');
  const { recentlyPlayed, isLoading: loadingRecent } = useRecentlyPlayed();
  const { data: trending, isLoading: loadingTrending } = useQuery({
    queryKey: ['trending-yt'], queryFn: () => getTrendingYT(16), staleTime: 5 * 60 * 1000,
  });
  const { data: newReleases, isLoading: loadingReleases } = useQuery({
    queryKey: ['new-releases-yt'], queryFn: () => getNewReleasesYT(16), staleTime: 5 * 60 * 1000,
  });
  const { data: localRecs } = useLocalRecommendations();
  const { data: popularArtists, isLoading: loadingArtists } = usePopularArtists();
  const { data: aiRecs } = useAIRecommendations();
  const { data: dailyMixes } = useDailyMixes();
  const { data: moodSections, isLoading: loadingMoods } = useMoodSections();
  const { data: fallbackSections, isLoading: loadingFallback } = useFallbackSections();

  const tasteProfile = loadTasteProfile();
  const isNewUser = tasteProfile.topArtists.length < 2;
  const hasPersonalization = (localRecs?.length ?? 0) > 0 || (aiRecs?.length ?? 0) > 0;

  const hours = new Date().getHours();
  const greeting = hours < 5 ? 'Good night' : hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

  const isNight = hours >= 21 || hours < 5;

  let sectionDelay = 0;
  const nextDelay = () => { sectionDelay += 0.04; return sectionDelay; };

  const handleFilterChange = useCallback((f: Filter) => setFilter(f), []);

  // Get first mood section tracks for quick picks
  const quickPickTracks = moodSections?.[0]?.tracks || trending?.slice(0, 4) || [];

  return (
    <div className="max-w-5xl mx-auto pb-36">
      {/* ── Subtle ambient background gradients ── */}
      {theme !== 'oled' && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0 bg-black" />
          {/* Blue corners */}
          <div
            className="absolute inset-0 animate-[glow-pulse_8s_ease-in-out_infinite]"
            style={{
              background: `
                radial-gradient(ellipse 60% 50% at 0% 0%, hsl(210 100% 50% / 0.25) 0%, transparent 60%),
                radial-gradient(ellipse 50% 45% at 100% 0%, hsl(215 95% 55% / 0.20) 0%, transparent 55%),
                radial-gradient(ellipse 55% 50% at 100% 100%, hsl(210 100% 50% / 0.22) 0%, transparent 55%),
                radial-gradient(ellipse 50% 45% at 0% 100%, hsl(205 90% 55% / 0.18) 0%, transparent 55%)
              `,
            }}
          />
          {/* Golden center fading outward */}
          <div
            className="absolute inset-0 animate-[glow-pulse_10s_ease-in-out_2s_infinite]"
            style={{
              background: `
                radial-gradient(ellipse 70% 55% at 50% 45%, hsl(42 90% 52% / 0.22) 0%, hsl(38 85% 48% / 0.10) 35%, transparent 65%)
              `,
            }}
          />
        </div>
      )}

      <div className="relative" style={{ zIndex: 1 }}>
        {/* ── Top Bar: Profile + Filter Pills ── */}
        <div className="sticky top-0 z-20 pt-3 pb-3 px-4 sm:px-5"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--background)) 60%, hsl(var(--background) / 0.85) 85%, transparent 100%)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Profile circle */}
            <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-border/30">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <FilterPills active={filter} onChange={handleFilterChange} />
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="px-4 sm:px-5 space-y-8 sm:space-y-9 pt-2">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 140 }}
          >
            <h1 className="text-[26px] sm:text-3xl font-extrabold text-foreground tracking-tight">{greeting}</h1>
            <p className="text-muted-foreground text-[13px] mt-0.5">
              {isNewUser ? 'Discover your new favourite music' : 'Your personalised feed is ready'}
            </p>
          </motion.div>

          {/* Quick Picks (list-style like reference screenshots) */}
          {quickPickTracks.length > 0 && (
            <Section title="Quick picks" delay={nextDelay()} emoji="⚡">
              <QuickPickRow tracks={quickPickTracks} />
            </Section>
          )}

          {/* Continue Listening */}
          {user && recentlyPlayed?.length > 0 && (
            <Section title="Keep listening" delay={nextDelay()} showSeeAll>
              {loadingRecent ? <ContinueListeningSkeleton /> : <ContinueListening tracks={recentlyPlayed} />}
            </Section>
          )}

          {/* Popular Artists — circular avatars */}
          <Section title="Your favourite artists" delay={nextDelay()} showSeeAll>
            {loadingArtists ? <ArtistCarouselSkeleton /> : (
              <HorizontalCarousel>
                {popularArtists?.map((artist, i) => (
                  <ArtistCircle key={artist.id} artist={artist} index={i} />
                ))}
              </HorizontalCarousel>
            )}
          </Section>

          {/* Night: moods first */}
          {isNight && <MoodBlock moodSections={moodSections} loadingMoods={loadingMoods} nextDelay={nextDelay} />}

          {/* Trending */}
          <Section title="Trending Now" delay={nextDelay()} showSeeAll emoji="🔥">
            {loadingTrending ? <CarouselSkeleton /> : (
              <HorizontalCarousel>
                {trending?.map((track, i) => (
                  <TrackCard key={track.id} track={track} tracks={trending} index={i} />
                ))}
              </HorizontalCarousel>
            )}
          </Section>

          {/* Non-night: moods after trending */}
          {!isNight && <MoodBlock moodSections={moodSections} loadingMoods={loadingMoods} nextDelay={nextDelay} />}

          {/* Fallback for new users */}
          {isNewUser && !hasPersonalization && fallbackSections && fallbackSections.map((section) => (
            <Section key={section.label} title={section.label} delay={nextDelay()} showSeeAll emoji={section.emoji}>
              <HorizontalCarousel>
                {section.tracks.map((track, j) => (
                  <TrackCard key={track.id} track={track} tracks={section.tracks} index={j} />
                ))}
              </HorizontalCarousel>
            </Section>
          ))}
          {isNewUser && loadingFallback && <><CarouselSkeleton /><CarouselSkeleton /></>}

          {/* Made For You */}
          {user && dailyMixes && dailyMixes.length > 0 && (
            <Section title="Made For You" delay={nextDelay()} showSeeAll emoji="✨">
              <HorizontalCarousel>
                {dailyMixes.map((mix, i) => (
                  <div key={i} className="snap-start flex-shrink-0 w-[160px] sm:w-[180px]">
                    <DailyMixCard mix={mix} index={i} />
                  </div>
                ))}
              </HorizontalCarousel>
            </Section>
          )}

          {/* Local personalization */}
          {localRecs && localRecs.length > 0 && localRecs.map((row) => (
            <Section key={row.reason} title={row.reason} delay={nextDelay()} showSeeAll emoji="🎵">
              <HorizontalCarousel>
                {row.tracks.map((track, j) => (
                  <TrackCard key={track.id} track={track} tracks={row.tracks} index={j} />
                ))}
              </HorizontalCarousel>
            </Section>
          ))}

          {/* AI recs */}
          {user && aiRecs && aiRecs.length > 0 && aiRecs.map((rec, i) =>
            rec.tracks.length > 0 && (
              <Section key={i} title={rec.reason} delay={nextDelay()} showSeeAll emoji="🤖">
                <HorizontalCarousel>
                  {rec.tracks.map((t: Track, j: number) => (
                    <TrackCard key={t.id} track={t} tracks={rec.tracks} index={j} />
                  ))}
                </HorizontalCarousel>
              </Section>
            )
          )}

          {/* New releases */}
          <Section title="Popular albums and singles" delay={nextDelay()} showSeeAll emoji="🆕">
            {loadingReleases ? <CarouselSkeleton /> : (
              <HorizontalCarousel>
                {newReleases?.map((track, i) => (
                  <TrackCard key={track.id} track={track} tracks={newReleases} index={i} />
                ))}
              </HorizontalCarousel>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

/* ─── Mood Block (extracted for time-based ordering) ───────────── */
const MoodBlock = ({ moodSections, loadingMoods, nextDelay }: {
  moodSections: { label: string; emoji: string; tracks: Track[] }[] | undefined;
  loadingMoods: boolean;
  nextDelay: () => number;
}) => (
  <>
    {moodSections && moodSections.length > 0 && moodSections.map((section) => (
      <Section key={section.label} title={section.label} delay={nextDelay()} showSeeAll emoji={section.emoji}>
        <HorizontalCarousel>
          {section.tracks.map((track, j) => (
            <TrackCard key={track.id} track={track} tracks={section.tracks} index={j} />
          ))}
        </HorizontalCarousel>
      </Section>
    ))}
    {loadingMoods && <CarouselSkeleton />}
  </>
);

export default Index;
