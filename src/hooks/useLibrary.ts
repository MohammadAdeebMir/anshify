import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Track } from '@/types/music';
import { toast } from 'sonner';

export function useLikedSongs() {
  const { user } = useAuth();

  const { data: likedSongs = [], isLoading } = useQuery({
    queryKey: ['liked-songs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liked_songs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(s => ({
        id: s.track_id,
        name: s.track_name,
        artist_name: s.artist_name,
        artist_id: s.artist_id,
        album_name: s.album_name,
        album_id: s.album_id,
        album_image: s.album_image,
        duration: s.duration,
        audio: s.audio,
        position: 0,
      })) as Track[];
    },
    enabled: !!user,
  });

  return { likedSongs, isLoading };
}

export function useLikeTrack() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const isLiked = (trackId: string, likedSongs: Track[]) =>
    likedSongs.some(s => s.id === trackId);

  const toggleLike = useMutation({
    mutationFn: async ({ track, liked }: { track: Track; liked: boolean }) => {
      if (!user) throw new Error('Must be signed in');
      if (liked) {
        const { error } = await supabase
          .from('liked_songs')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', track.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('liked_songs').insert({
          user_id: user.id,
          track_id: track.id,
          track_name: track.name,
          artist_name: track.artist_name,
          artist_id: track.artist_id,
          album_name: track.album_name,
          album_id: track.album_id,
          album_image: track.album_image,
          duration: track.duration,
          audio: track.audio,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, { liked }) => {
      qc.invalidateQueries({ queryKey: ['liked-songs'] });
      toast.success(liked ? 'Removed from liked songs' : 'Added to liked songs');
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { isLiked, toggleLike };
}

export function useRecentlyPlayed() {
  const { user } = useAuth();

  const { data: recentlyPlayed = [], isLoading } = useQuery({
    queryKey: ['recently-played', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recently_played')
        .select('*')
        .order('played_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      // Deduplicate by track_id, keeping most recent
      const seen = new Set<string>();
      return data
        .filter(s => {
          if (seen.has(s.track_id)) return false;
          seen.add(s.track_id);
          return true;
        })
        .map(s => ({
          id: s.track_id,
          name: s.track_name,
          artist_name: s.artist_name,
          artist_id: s.artist_id,
          album_name: s.album_name,
          album_id: s.album_id,
          album_image: s.album_image,
          duration: s.duration,
          audio: s.audio,
          position: 0,
        })) as Track[];
    },
    enabled: !!user,
  });

  return { recentlyPlayed, isLoading };
}

export function useAddRecentlyPlayed() {
  const { user } = useAuth();

  return async (track: Track) => {
    if (!user) return;
    await supabase.from('recently_played').insert({
      user_id: user.id,
      track_id: track.id,
      track_name: track.name,
      artist_name: track.artist_name,
      artist_id: track.artist_id,
      album_name: track.album_name,
      album_id: track.album_id,
      album_image: track.album_image,
      duration: track.duration,
      audio: track.audio,
    });
  };
}
