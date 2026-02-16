import { AlbumGridSkeleton, SongListSkeleton, ArtistGridSkeleton } from '@/components/skeletons/Skeletons';
import { Music2, TrendingUp, Clock, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <motion.section {...fadeIn} className="space-y-4">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
    </div>
    {children}
  </motion.section>
);

const Index = () => {
  return (
    <div className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground glow-text">
          Good evening
        </h1>
        <p className="text-muted-foreground text-sm">
          Discover new music and enjoy your favorites
        </p>
      </motion.div>

      {/* Featured / Trending */}
      <Section title="Trending Now" icon={TrendingUp}>
        <AlbumGridSkeleton count={6} />
      </Section>

      {/* Recently Played */}
      <Section title="Recently Played" icon={Clock}>
        <div className="glass rounded-2xl overflow-hidden">
          <SongListSkeleton count={5} />
        </div>
      </Section>

      {/* Popular Artists */}
      <Section title="Popular Artists" icon={Star}>
        <ArtistGridSkeleton count={6} />
      </Section>

      {/* New Releases */}
      <Section title="New Releases" icon={Music2}>
        <AlbumGridSkeleton count={6} />
      </Section>
    </div>
  );
};

export default Index;
