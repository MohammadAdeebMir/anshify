import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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

// --- Section wrapper ---
const Section = ({ title, icon: Icon, children, delay = 0, subtitle, showSeeAll, emoji }: {
  title: string; icon: React.ElementType; children: React.ReactNode; delay?: number; subtitle?: string; showSeeAll?: boolean; emoji?: string;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, type: 'spring', stiffness: 130, damping: 22 }}
    className="space-y-3"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {emoji ? (
          <span className="text-lg leading-none">{emoji}</span>
        ) : (
          <Icon className="h-4 w-4 text-primary" />
        )}
        <h2 className="text-[15px] font-bold text-foreground tracking-tight">{title}</h2>
      </div>
      {showSeeAll && (
        <span className="text-[11px] font-medium text-muted-foreground cursor-pointer hover:text-primary transition-colors">
          See All
        </span>
      )}
    </div>
    {subtitle && <p className="text-[11px] text-muted-foreground -mt-1 ml-6">{subtitle}</p>}
    {children}
  </motion.section>
);

// Fallback trending queries for fresh/new users
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

const Index = () => {
  const { user } = useAuth();
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

  // Determine user "experience level" to weight personalization
  const tasteProfile = loadTasteProfile();
  const isNewUser = tasteProfile.topArtists.length < 2;
  const hasPersonalization = (localRecs?.length ?? 0) > 0 || (aiRecs?.length ?? 0) > 0;

  const hours = new Date().getHours();
  const greeting = hours < 5 ? 'Good night' : hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = hours < 5 ? '🌙' : hours < 12 ? '☀️' : hours < 18 ? '🌤️' : '🌆';

  // Time-based section priority: night → mood first, morning → trending+focus first
  const isNight = hours >= 21 || hours < 5;
  const isMorning = hours >= 5 && hours < 12;

  let sectionDelay = 0;
  const nextDelay = () => { sectionDelay += 0.05; return sectionDelay; };

  return (
    <div className="p-4 sm:p-5 space-y-7 sm:space-y-8 max-w-7xl mx-auto pb-36">
      {/* --- Greeting Header --- */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
        className="relative pt-1"
      >
        <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-primary/6 blur-3xl pointer-events-none" />
        <div className="absolute -top-8 right-0 w-56 h-56 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-2xl">{greetingEmoji}</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight glow-text">{greeting}</h1>
          </div>
          <p className="text-muted-foreground text-xs mt-0.5 ml-10">
            {isNewUser ? 'Discover your new favourite music' : 'Your personalised feed is ready'}
          </p>
        </div>
      </motion.div>

      {/* --- Continue Listening (registered users only) --- */}
      {user && (
        <Section title="Continue Listening" icon={Clock} delay={nextDelay()} showSeeAll>
          {loadingRecent ? <ContinueListeningSkeleton /> : <ContinueListening tracks={recentlyPlayed} />}
        </Section>
      )}

      {/* ─── DYNAMIC SECTIONS ─── */}
      {/* Order adapts: night → mood first, morning → trending first, afternoon/evening → mixed */}

      {/* At night: moods come before trending */}
      {isNight && <MoodBlock moodSections={moodSections} loadingMoods={loadingMoods} nextDelay={nextDelay} />}

      {/* Trending */}
      <Section title="Trending Now" icon={TrendingUp} delay={nextDelay()} showSeeAll emoji="🔥">
        {loadingTrending ? <CarouselSkeleton /> : (
          <HorizontalCarousel>
            {trending?.map((track, i) => (
              <TrackCard key={track.id} track={track} tracks={trending} index={i} />
            ))}
          </HorizontalCarousel>
        )}
      </Section>

      {/* Morning/Afternoon/Evening: moods after trending */}
      {!isNight && <MoodBlock moodSections={moodSections} loadingMoods={loadingMoods} nextDelay={nextDelay} />}

      {/* Fallback sections for new users */}
      {isNewUser && !hasPersonalization && fallbackSections && fallbackSections.map((section) => (
        <Section key={section.label} title={section.label} icon={Zap} delay={nextDelay()} showSeeAll emoji={section.emoji}>
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
        <Section title="Made For You" icon={Sparkles} delay={nextDelay()} showSeeAll emoji="✨">
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
        <Section key={row.reason} title={row.reason} icon={Sparkles} delay={nextDelay()} showSeeAll emoji="🎵">
          <HorizontalCarousel>
            {row.tracks.map((track, j) => (
              <TrackCard key={track.id} track={track} tracks={row.tracks} index={j} />
            ))}
          </HorizontalCarousel>
        </Section>
      ))}

      {/* AI recommendations */}
      {user && aiRecs && aiRecs.length > 0 && aiRecs.map((rec, i) =>
        rec.tracks.length > 0 && (
          <Section key={i} title={rec.reason} icon={Sparkles} delay={nextDelay()} showSeeAll emoji="🤖">
            <HorizontalCarousel>
              {rec.tracks.map((t: Track, j: number) => (
                <TrackCard key={t.id} track={t} tracks={rec.tracks} index={j} />
              ))}
            </HorizontalCarousel>
          </Section>
        )
      )}

      {/* Popular artists — shown earlier at night for discovery */}
      <Section title="Popular Artists" icon={Users} delay={nextDelay()} showSeeAll emoji="🎤">
        {loadingArtists ? <ArtistCarouselSkeleton /> : (
          <HorizontalCarousel>
            {popularArtists?.map((artist, i) => (
              <ArtistCircle key={artist.id} artist={artist} index={i} />
            ))}
          </HorizontalCarousel>
        )}
      </Section>

      {/* New releases */}
      <Section title="New Releases" icon={Music2} delay={nextDelay()} showSeeAll emoji="🆕">
        {loadingReleases ? <CarouselSkeleton /> : (
          <HorizontalCarousel>
            {newReleases?.map((track, i) => (
              <TrackCard key={track.id} track={track} tracks={newReleases} index={i} />
            ))}
          </HorizontalCarousel>
        )}
      </Section>
    </div>
  );
};

// Extracted mood block for reuse in dynamic ordering
const MoodBlock = ({ moodSections, loadingMoods, nextDelay }: {
  moodSections: { label: string; emoji: string; tracks: Track[] }[] | undefined;
  loadingMoods: boolean;
  nextDelay: () => number;
}) => (
  <>
    {moodSections && moodSections.length > 0 && moodSections.map((section) => (
      <Section key={section.label} title={section.label} icon={Headphones} delay={nextDelay()} showSeeAll emoji={section.emoji}>
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
