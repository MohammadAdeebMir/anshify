import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Music2, Sparkles, Clock, Users, Zap, Headphones } from 'lucide-react';
import { getTrendingYT, getNewReleasesYT } from '@/services/ytmusic';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useRecentlyPlayed } from '@/hooks/useLibrary';
import { useLocalRecommendations, usePopularArtists, useMoodSections } from '@/hooks/useRecommendations';
import { useAIRecommendations, useDailyMixes } from '@/hooks/useAI';
import { Track } from '@/types/music';
import { HorizontalCarousel } from '@/components/home/HorizontalCarousel';
import { TrackCard } from '@/components/home/TrackCard';
import { ArtistCircle } from '@/components/home/ArtistCircle';
import { ContinueListening } from '@/components/home/ContinueListening';
import { ContinueListeningSkeleton, CarouselSkeleton, ArtistCarouselSkeleton } from '@/components/home/HomeSkeletons';
import { DailyMixCard } from '@/components/home/DailyMixCard';

// --- Section wrapper ---
const Section = ({ title, icon: Icon, children, delay = 0, subtitle, showSeeAll }: {
  title: string; icon: React.ElementType; children: React.ReactNode; delay?: number; subtitle?: string; showSeeAll?: boolean;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, type: 'spring', stiffness: 130, damping: 22 }}
    className="space-y-3"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      {showSeeAll && (
        <span className="text-[11px] font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          See All
        </span>
      )}
    </div>
    {subtitle && <p className="text-[11px] text-muted-foreground -mt-1 ml-6">{subtitle}</p>}
    {children}
  </motion.section>
);

const Index = () => {
  const { user } = useAuth();
  const { recentlyPlayed, isLoading: loadingRecent } = useRecentlyPlayed();
  const { data: trending, isLoading: loadingTrending } = useQuery({
    queryKey: ['trending-yt'], queryFn: () => getTrendingYT(12), staleTime: 5 * 60 * 1000,
  });
  const { data: newReleases, isLoading: loadingReleases } = useQuery({
    queryKey: ['new-releases-yt'], queryFn: () => getNewReleasesYT(12), staleTime: 5 * 60 * 1000,
  });
  const { data: localRecs } = useLocalRecommendations();
  const { data: popularArtists, isLoading: loadingArtists } = usePopularArtists();
  const { data: aiRecs } = useAIRecommendations();
  const { data: dailyMixes } = useDailyMixes();
  const { data: moodSections, isLoading: loadingMoods } = useMoodSections();

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

  let sectionDelay = 0;
  const nextDelay = () => { sectionDelay += 0.05; return sectionDelay; };

  return (
    <div className="p-4 sm:p-5 space-y-6 sm:space-y-7 max-w-7xl mx-auto pb-32">
      {/* --- Greeting Header --- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
        className="relative pt-2"
      >
        {/* Ambient glow */}
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -top-8 right-0 w-48 h-48 rounded-full bg-accent/4 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground glow-text">{greeting}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Made for you</p>
        </div>
      </motion.div>

      {/* --- Continue Listening --- */}
      {user && (
        <Section title="Continue Listening" icon={Clock} delay={nextDelay()} showSeeAll>
          {loadingRecent ? <ContinueListeningSkeleton /> : <ContinueListening tracks={recentlyPlayed} />}
        </Section>
      )}

      {/* --- Daily Mixes / Made For You --- */}
      {user && dailyMixes && dailyMixes.length > 0 && (
        <Section title="Made For You" icon={Sparkles} delay={nextDelay()} showSeeAll>
          <HorizontalCarousel>
            {dailyMixes.map((mix, i) => (
              <div key={i} className="snap-start flex-shrink-0 w-[160px] sm:w-[180px]">
                <DailyMixCard mix={mix} index={i} />
              </div>
            ))}
          </HorizontalCarousel>
        </Section>
      )}

      {/* --- Made For You (local recs) --- */}
      {localRecs && localRecs.length > 0 && (
        <>
          {localRecs.map((row, i) => (
            <Section key={row.reason} title={row.reason} icon={Sparkles} delay={nextDelay()} showSeeAll>
              <HorizontalCarousel>
                {row.tracks.map((track, j) => (
                  <TrackCard key={track.id} track={track} tracks={row.tracks} index={j} />
                ))}
              </HorizontalCarousel>
            </Section>
          ))}
        </>
      )}

      {/* --- AI Recommendations --- */}
      {user && aiRecs && aiRecs.length > 0 && (
        <>
          {aiRecs.map((rec, i) =>
            rec.tracks.length > 0 && (
              <Section key={i} title={rec.reason} icon={Sparkles} delay={nextDelay()} showSeeAll>
                <HorizontalCarousel>
                  {rec.tracks.map((t: Track, j: number) => (
                    <TrackCard key={t.id} track={t} tracks={rec.tracks} index={j} />
                  ))}
                </HorizontalCarousel>
              </Section>
            )
          )}
        </>
      )}

      {/* --- Mood Sections --- */}
      {moodSections && moodSections.length > 0 && (
        <>
          {moodSections.map((section, i) => (
            <Section key={section.label} title={`${section.emoji} ${section.label}`} icon={Headphones} delay={nextDelay()} showSeeAll>
              <HorizontalCarousel>
                {section.tracks.map((track, j) => (
                  <TrackCard key={track.id} track={track} tracks={section.tracks} index={j} />
                ))}
              </HorizontalCarousel>
            </Section>
          ))}
        </>
      )}
      {loadingMoods && <CarouselSkeleton />}


      <Section title="Popular Artists" icon={Users} delay={nextDelay()} showSeeAll>
        {loadingArtists ? <ArtistCarouselSkeleton /> : (
          <HorizontalCarousel>
            {popularArtists?.map((artist, i) => (
              <ArtistCircle key={artist.id} artist={artist} index={i} />
            ))}
          </HorizontalCarousel>
        )}
      </Section>

      {/* --- Trending Now --- */}
      <Section title="Trending Now" icon={TrendingUp} delay={nextDelay()} showSeeAll>
        {loadingTrending ? <CarouselSkeleton /> : (
          <HorizontalCarousel>
            {trending?.map((track, i) => (
              <TrackCard key={track.id} track={track} tracks={trending} index={i} />
            ))}
          </HorizontalCarousel>
        )}
      </Section>

      {/* --- New Releases --- */}
      <Section title="New Releases" icon={Music2} delay={nextDelay()} showSeeAll>
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

export default Index;
