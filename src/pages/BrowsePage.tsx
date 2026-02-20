import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Smile, Frown, Brain, Dumbbell, Moon, Heart, PartyPopper, Coffee, Sparkles } from 'lucide-react';
import { useMoodTracks } from '@/hooks/useAI';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { useLikedSongs, useLikeTrack } from '@/hooks/useLibrary';
import { AddToPlaylistButton } from '@/components/AddToPlaylistButton';
import { Track } from '@/types/music';
import { SongListSkeleton } from '@/components/skeletons/Skeletons';
import { getTracksByGenre } from '@/services/jamendo';
import { useQuery } from '@tanstack/react-query';
import { AIPlaylistGenerator } from '@/components/AIPlaylistGenerator';
import { cn } from '@/lib/utils';

const moods = [
  { name: 'Happy', icon: Smile, color: 'from-yellow-500/30 to-orange-500/20' },
  { name: 'Sad', icon: Frown, color: 'from-blue-500/30 to-indigo-600/20' },
  { name: 'Focus', icon: Brain, color: 'from-cyan-500/30 to-teal-600/20' },
  { name: 'Workout', icon: Dumbbell, color: 'from-red-500/30 to-pink-600/20' },
  { name: 'Chill', icon: Coffee, color: 'from-green-500/30 to-emerald-600/20' },
  { name: 'Romantic', icon: Heart, color: 'from-pink-500/30 to-rose-600/20' },
  { name: 'Party', icon: PartyPopper, color: 'from-purple-500/30 to-fuchsia-600/20' },
  { name: 'Sleep', icon: Moon, color: 'from-indigo-500/30 to-violet-700/20' },
];

const genres = [
  'Pop', 'Rock', 'Electronic', 'Hip Hop', 'Jazz', 'Classical',
  'R&B', 'Country', 'Metal', 'Reggae', 'Latin', 'Ambient',
  'Folk', 'Blues', 'Punk', 'Funk',
];

const TrackRow = ({ track, tracks }: { track: Track; tracks: Track[] }) => {
  const { play, currentTrack } = usePlayer();
  const { user } = useAuth();
  const { likedSongs } = useLikedSongs();
  const { isLiked, toggleLike } = useLikeTrack();
  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id, likedSongs);

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/30', isActive && 'bg-primary/10')}>
      <button onClick={() => play(track, tracks)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
          <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
        </div>
      </button>
      {user && (
        <>
          <button onClick={() => toggleLike.mutate({ track, liked })} className={cn('p-1.5 rounded-full transition-colors', liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
          </button>
          <AddToPlaylistButton track={track} />
        </>
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
      </span>
    </div>
  );
};

const BrowsePage = () => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const { data: moodTracks, isLoading: loadingMood } = useMoodTracks(selectedMood);
  const { data: genreTracks, isLoading: loadingGenre } = useQuery({
    queryKey: ['genre-browse', selectedGenre],
    queryFn: () => getTracksByGenre(selectedGenre!, 20),
    enabled: !!selectedGenre,
    staleTime: 5 * 60 * 1000,
  });

  const activeTracks = selectedMood ? moodTracks : genreTracks;
  const isLoading = selectedMood ? loadingMood : loadingGenre;
  const activeLabel = selectedMood || selectedGenre;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Radio className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Browse</h1>
        </div>
        <p className="text-muted-foreground text-sm">Explore by mood, genre, or AI prompt</p>
      </motion.div>

      {/* AI Playlist Generator */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-6">
        <AIPlaylistGenerator />
      </motion.section>

      {/* Mood selector */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Moods</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {moods.map(mood => (
            <button
              key={mood.name}
              onClick={() => { setSelectedMood(mood.name); setSelectedGenre(null); }}
              className={cn(
                'relative overflow-hidden rounded-2xl p-4 h-20 bg-gradient-to-br text-left transition-all hover:scale-[1.03] active:scale-[0.98] border',
                mood.color,
                selectedMood === mood.name ? 'border-primary/50 scale-[1.02]' : 'border-transparent'
              )}
            >
              <mood.icon className="h-5 w-5 text-foreground/70 mb-1" />
              <span className="text-sm font-bold text-foreground">{mood.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Genre selector */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Genres</h2>
        <div className="flex flex-wrap gap-2">
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => { setSelectedGenre(genre); setSelectedMood(null); }}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                selectedGenre === genre
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      <AnimatePresence mode="wait">
        {activeLabel && (
          <motion.section key={activeLabel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">{activeLabel}</h2>
              <button onClick={() => { setSelectedMood(null); setSelectedGenre(null); }} className="text-xs text-muted-foreground hover:text-foreground">✕ Clear</button>
            </div>
            {isLoading ? (
              <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
            ) : activeTracks && activeTracks.length > 0 ? (
              <div className="glass rounded-2xl overflow-hidden">
                {activeTracks.map(t => <TrackRow key={t.id} track={t} tracks={activeTracks} />)}
              </div>
            ) : (
              <div className="glass rounded-2xl p-8 text-center">
                <p className="text-sm text-muted-foreground">No tracks found for this selection</p>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BrowsePage;
