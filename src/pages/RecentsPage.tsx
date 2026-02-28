import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useRecentlyPlayed } from '@/hooks/useLibrary';
import { usePlayer } from '@/contexts/PlayerContext';
import { motion } from 'framer-motion';
import { Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const RecentsPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { recentlyPlayed, isLoading } = useRecentlyPlayed();
  const { play } = usePlayer();

  if (loading) return null;

  if (!user) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="glass rounded-3xl p-8 text-center space-y-4">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Sign in to see your recents</h2>
          <Button onClick={() => navigate('/auth')} className="bg-primary rounded-xl glow-primary">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4 pb-36">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Recents</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Your recently played tracks</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : recentlyPlayed && recentlyPlayed.length > 0 ? (
        <div className="space-y-1">
          {recentlyPlayed.map((track, i) => (
            <motion.button
              key={`${track.id}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => play(track, recentlyPlayed)}
              className="flex items-center gap-3 w-full py-2.5 px-2 rounded-xl text-left active:bg-secondary/50 transition-colors"
            >
              <img
                src={track.album_image || ''}
                alt=""
                className="h-12 w-12 rounded-lg object-cover bg-secondary flex-shrink-0"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground truncate">{track.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{track.artist_name}</p>
              </div>
              <Play className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No recently played tracks yet</p>
        </div>
      )}
    </div>
  );
};

export default RecentsPage;
