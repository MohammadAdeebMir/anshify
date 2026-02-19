import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  streak_days: number;
  last_listen_date: string | null;
  total_listens: number;
}

export function useProfile(userId?: string) {
  const { user } = useAuth();
  const id = userId || user?.id;

  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id!)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!id,
  });
}

export function useUserStats(userId?: string) {
  const { user } = useAuth();
  const id = userId || user?.id;

  return useQuery({
    queryKey: ['user-stats', id],
    queryFn: async () => {
      const [{ count: likedCount }, { count: playlistCount }, { data: topArtists }] = await Promise.all([
        supabase.from('liked_songs').select('*', { count: 'exact', head: true }).eq('user_id', id!),
        supabase.from('playlists').select('*', { count: 'exact', head: true }).eq('user_id', id!),
        supabase.from('recently_played')
          .select('artist_name')
          .eq('user_id', id!)
          .order('played_at', { ascending: false })
          .limit(50),
      ]);

      // Count artist frequency
      const artistFreq: Record<string, number> = {};
      (topArtists || []).forEach(r => {
        artistFreq[r.artist_name] = (artistFreq[r.artist_name] || 0) + 1;
      });
      const sortedArtists = Object.entries(artistFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      return {
        likedCount: likedCount || 0,
        playlistCount: playlistCount || 0,
        topArtists: sortedArtists,
      };
    },
    enabled: !!id,
  });
}

export function useUpdateStreak() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_days, last_listen_date, total_listens')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const lastDate = profile.last_listen_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      let newStreak = profile.streak_days;
      if (lastDate === today) {
        // Already counted today
        newStreak = profile.streak_days;
      } else if (lastDate === yesterday) {
        newStreak = profile.streak_days + 1;
      } else {
        newStreak = 1; // streak reset
      }

      await supabase.from('profiles').update({
        streak_days: newStreak,
        last_listen_date: today,
        total_listens: (profile.total_listens || 0) + 1,
      }).eq('user_id', user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useShareUrl() {
  return {
    sharePlaylist: (playlistId: string) => {
      const url = `${window.location.origin}/playlist/${playlistId}`;
      navigator.clipboard.writeText(url);
      toast.success('Playlist link copied!');
    },
    shareTrack: (track: { name: string; artist_name: string }) => {
      if (navigator.share) {
        navigator.share({
          title: `${track.name} by ${track.artist_name}`,
          text: `Check out ${track.name} by ${track.artist_name} on Purple Haze!`,
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(
          `🎵 ${track.name} by ${track.artist_name} — ${window.location.href}`
        );
        toast.success('Link copied!');
      }
    },
  };
}
