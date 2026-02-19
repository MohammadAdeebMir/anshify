import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Mail, Flame, Music, Heart, ListMusic, TrendingUp, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProfile, useUserStats, useShareUrl } from '@/hooks/useSocial';
import { useLikedSongs } from '@/hooks/useLibrary';
import { usePlayer } from '@/contexts/PlayerContext';
import { Track } from '@/types/music';
import { cn } from '@/lib/utils';

const StatCard = ({ icon: Icon, label, value, color = 'text-primary' }: { icon: any; label: string; value: string | number; color?: string }) => (
  <div className="glass rounded-xl p-4 text-center space-y-1">
    <Icon className={cn('h-5 w-5 mx-auto', color)} />
    <p className="text-xl font-bold text-foreground">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
);

const ProfilePage = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: stats } = useUserStats();
  const { likedSongs } = useLikedSongs();
  const { play } = usePlayer();
  const { shareTrack } = useShareUrl();

  if (loading) return null;

  if (!user) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-8 text-center space-y-4">
          <User className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Sign in to access your profile</h2>
          <p className="text-muted-foreground text-sm">Create playlists, like songs, and personalize your experience.</p>
          <Button onClick={() => navigate('/auth')} className="bg-primary rounded-xl glow-primary">Sign In</Button>
        </motion.div>
      </div>
    );
  }

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/30">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
            {profile && profile.streak_days > 0 && (
              <p className="text-sm text-primary flex items-center gap-1 mt-1">
                <Flame className="h-4 w-4" /> {profile.streak_days} day streak!
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Heart} label="Liked Songs" value={stats?.likedCount || 0} />
          <StatCard icon={ListMusic} label="Playlists" value={stats?.playlistCount || 0} />
          <StatCard icon={Music} label="Total Plays" value={profile?.total_listens || 0} color="text-accent" />
        </div>
      </motion.div>

      {/* Top Artists */}
      {stats?.topArtists && stats.topArtists.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Top Artists</h2>
          </div>
          <div className="space-y-2">
            {stats.topArtists.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3 px-2 py-1.5">
                <span className="text-xs text-muted-foreground w-5 text-right font-mono">{i + 1}</span>
                <span className="text-sm text-foreground flex-1">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.count} plays</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent likes preview */}
      {likedSongs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Recent Likes</h2>
            </div>
            <button onClick={() => navigate('/liked')} className="text-xs text-primary hover:underline">See all</button>
          </div>
          <div className="space-y-1">
            {likedSongs.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                <button onClick={() => play(t, likedSongs)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="h-8 w-8 rounded-md overflow-hidden flex-shrink-0">
                    <img src={t.album_image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artist_name}</p>
                  </div>
                </button>
                <button onClick={() => shareTrack(t)} className="p-1 text-muted-foreground hover:text-foreground">
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6 flex gap-3">
        <Button onClick={() => navigate('/settings')} variant="outline" className="rounded-xl border-border/30 flex-1">
          Settings
        </Button>
        <Button
          variant="outline"
          onClick={async () => { await signOut(); navigate('/'); }}
          className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
