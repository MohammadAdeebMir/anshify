import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Music2, Sparkles, Clock, Users, Zap } from 'lucide-react';
import { getTrendingYT, getNewReleasesYT } from '@/services/ytmusic';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useRecentlyPlayed } from '@/hooks/useLibrary';
import { useLocalRecommendations, usePopularArtists } from '@/hooks/useRecommendations';
import { useAIRecommendations, useDailyMixes } from '@/hooks/useAI';
import { Track } from '@/types/music';
import { HorizontalCarousel } from '@/components/home/HorizontalCarousel';
import { TrackCard } from '@/components/home/TrackCard';
import { ArtistCircle } from '@/components/home/ArtistCircle';
import { ContinueListening } from '@/components/home/ContinueListening';
import { ContinueListeningSkeleton, CarouselSkeleton, ArtistCarouselSkeleton } from '@/components/home/HomeSkeletons';
import { DailyMixCard } from '@/components/home/DailyMixCard';

// --- Section wrapper with spring animation ---
const Section = ({ title, icon: Icon, children, delay = 0, subtitle }: {
  title: string; icon: React.ElementType; children: React.ReactNode; delay?: number; subtitle?: string;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, type: 'spring', stiffness: 120, damping: 20 }}
    className="space-y-4"
  >
    <div>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1 ml-7">{subtitle}</p>}
    </div>
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

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';
  const subtitle = user ? 'Made for you' : 'Discover new music';

  let sectionDelay = 0;
  const nextDelay = () => { sectionDelay += 0.06; return sectionDelay; };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-10 max-w-7xl mx-auto pb-32">
      {/* --- Greeting Header --- */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        className="relative"
      >
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -top-10 right-0 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground glow-text">{greeting}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
      </motion.div>

      {/* --- Continue Listening --- */}
      {user && (
        <Section title="Continue Listening" icon={Clock} delay={nextDelay()}>
          {loadingRecent ? <ContinueListeningSkeleton /> : <ContinueListening tracks={recentlyPlayed} />}
        </Section>
      )}

      {/* --- Daily Mixes --- */}
      {user && dailyMixes && dailyMixes.length > 0 && (
        <Section title="Your Daily Mixes" icon={Zap} delay={nextDelay()}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dailyMixes.map((mix, i) => <DailyMixCard key={i} mix={mix} index={i} />)}
          </div>
        </Section>
      )}

      {/* --- Made For You (local recs) --- */}
      {localRecs && localRecs.length > 0 && (
        <>
          {localRecs.map((row, i) => (
            <Section key={row.reason} title={row.reason} icon={Sparkles} delay={nextDelay()} subtitle="Personalized for you">
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
              <Section key={i} title={rec.reason} icon={Sparkles} delay={nextDelay()}>
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

      {/* --- Trending Now --- */}
      <Section title="Trending Now" icon={TrendingUp} delay={nextDelay()}>
        {loadingTrending ? <CarouselSkeleton /> : (
          <HorizontalCarousel>
            {trending?.map((track, i) => (
              <TrackCard key={track.id} track={track} tracks={trending} index={i} />
            ))}
          </HorizontalCarousel>
        )}
      </Section>

      {/* --- Popular Artists --- */}
      <Section title="Popular Artists" icon={Users} delay={nextDelay()}>
        {loadingArtists ? <ArtistCarouselSkeleton /> : (
          <HorizontalCarousel>
            {popularArtists?.map((artist, i) => (
              <ArtistCircle key={artist.id} artist={artist} index={i} />
            ))}
          </HorizontalCarousel>
        )}
      </Section>

      {/* --- New Releases --- */}
      <Section title="New Releases" icon={Music2} delay={nextDelay()}>
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
