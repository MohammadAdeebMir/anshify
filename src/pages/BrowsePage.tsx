import { AlbumGridSkeleton } from '@/components/skeletons/Skeletons';
import { Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const BrowsePage = () => (
  <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-2">
        <Radio className="h-5 w-5 text-primary" />
        <h1 className="text-3xl font-extrabold text-foreground">Browse</h1>
      </div>
      <p className="text-muted-foreground text-sm">Explore music by genre and mood</p>
    </motion.div>
    <AlbumGridSkeleton count={12} />
  </div>
);

export default BrowsePage;
