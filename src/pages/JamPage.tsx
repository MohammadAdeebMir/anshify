import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Users, ArrowLeft, Copy, Play, Pause, Search, Plus, LogOut, X, Music2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useJamSession, useJamActions } from '@/hooks/useJam';
import { usePlayer } from '@/contexts/PlayerContext';
import { useQuery } from '@tanstack/react-query';
import { searchYTMusic } from '@/services/ytmusic';
import { Track } from '@/types/music';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const JamPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session, participants, queue, isHost } = useJamSession(id || null);
  const { addToQueue, updateNowPlaying, endJam, leaveJam } = useJamActions(id || null);
  const { play, currentTrack, isPlaying } = usePlayer();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    clearTimeout((window as any).__jamSearchTimer);
    (window as any).__jamSearchTimer = setTimeout(() => setSearchTerm(val), 400);
  };

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['jam-search', searchTerm],
    queryFn: () => searchYTMusic(searchTerm, 10),
    enabled: searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!session) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="glass rounded-2xl p-8 text-center space-y-3">
          <Radio className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Loading jam session...</p>
        </div>
      </div>
    );
  }

  if (!session.is_active) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-4">
        <button onClick={() => navigate('/create')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="glass rounded-2xl p-8 text-center space-y-3">
          <Radio className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Jam Ended</h3>
          <p className="text-sm text-muted-foreground">This jam session has ended.</p>
          <Button onClick={() => navigate('/create')} className="rounded-xl bg-primary">Start New Jam</Button>
        </div>
      </div>
    );
  }

  const handlePlayTrack = (track: Track) => {
    const queueTracks = queue.map(q => q.track_data as Track);
    play(track, queueTracks.length > 0 ? queueTracks : [track]);
    if (isHost) {
      updateNowPlaying.mutate({ track, isPlaying: true });
    }
  };

  const handleEndJam = async () => {
    await endJam.mutateAsync();
    navigate('/create');
  };

  const handleLeave = async () => {
    await leaveJam.mutateAsync();
    navigate('/create');
  };

  const nowPlaying = session.current_track_data as Track | null;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5 pb-36">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Session header */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Radio className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-foreground">{session.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(session.code); toast.success('Code copied!'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 text-sm font-bold text-foreground hover:bg-secondary transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                {session.code}
              </button>
            </div>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {participants.slice(0, 6).map(p => (
                <div key={p.id} className="h-7 w-7 rounded-full bg-secondary border-2 border-background flex items-center justify-center">
                  <span className="text-[10px] font-bold text-foreground">{(p.display_name || '?')[0].toUpperCase()}</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{participants.length} listening</span>
          </div>

          {/* Now Playing */}
          {nowPlaying && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0">
                {nowPlaying.album_image && <img src={nowPlaying.album_image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{nowPlaying.name}</p>
                <p className="text-xs text-muted-foreground truncate">{nowPlaying.artist_name}</p>
              </div>
              <div className="flex gap-[2px]">
                {[1, 2, 3].map(i => (
                  <span key={i} className="w-[3px] bg-primary animate-pulse rounded-full" style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Add songs */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setSearchOpen(!searchOpen)}
          size="sm"
          className="rounded-xl bg-primary text-primary-foreground"
        >
          {searchOpen ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {searchOpen ? 'Close' : 'Add Songs'}
        </Button>
        {isHost ? (
          <Button onClick={handleEndJam} size="sm" variant="outline" className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
            End Jam
          </Button>
        ) : (
          <Button onClick={handleLeave} size="sm" variant="outline" className="rounded-xl border-border/30">
            <LogOut className="h-3.5 w-3.5 mr-1" /> Leave
          </Button>
        )}
      </div>

      {/* Search panel */}
      {searchOpen && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search songs to add to jam..."
              className="pl-9 bg-secondary/50 border-border/30 rounded-xl"
              autoFocus
            />
          </div>
          <div className="max-h-[250px] overflow-y-auto space-y-1">
            {searching && <p className="text-xs text-muted-foreground text-center py-3">Searching...</p>}
            {searchResults.map(track => (
              <div key={track.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors">
                <div className="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  {track.album_image && <img src={track.album_image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
                </div>
                <button
                  onClick={() => addToQueue.mutate(track)}
                  className="p-1.5 rounded-full text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Queue */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Music2 className="h-4 w-4 text-primary" /> Queue ({queue.length})
        </h2>
        {queue.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No songs in queue yet. Add some!</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {queue.map((item, i) => {
              const track = item.track_data as Track;
              const isActive = currentTrack?.id === track.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handlePlayTrack(track)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors',
                    isActive && 'bg-primary/10'
                  )}
                >
                  <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                  <div className="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    {track.album_image && <img src={track.album_image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
                  </div>
                  {isActive && isPlaying && (
                    <div className="flex gap-[2px]">
                      {[1, 2, 3].map(j => (
                        <span key={j} className="w-[2px] bg-primary animate-pulse rounded-full" style={{ height: `${4 + j * 2}px`, animationDelay: `${j * 0.12}s` }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JamPage;
