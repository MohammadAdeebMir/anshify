import { Library } from 'lucide-react';
import { motion } from 'framer-motion';

const LibraryPage = () => (
  <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-2">
        <Library className="h-5 w-5 text-primary" />
        <h1 className="text-3xl font-extrabold text-foreground">Your Library</h1>
      </div>
      <p className="text-muted-foreground text-sm">Your music collection</p>
    </motion.div>

    <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-3">
      <Library className="h-12 w-12 text-muted-foreground/40" />
      <h3 className="text-lg font-semibold text-foreground">Your library is empty</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Sign in to save songs, create playlists, and build your personal music collection.
      </p>
    </div>
  </div>
);

export default LibraryPage;
