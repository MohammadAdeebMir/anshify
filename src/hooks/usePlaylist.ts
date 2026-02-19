import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Track } from '@/types/music';
import { toast } from 'sonner';

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function usePlaylists() {
  const { user } = useAuth();

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ['playlists', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Playlist[];
    },
    enabled: !!user,
  });

  return { playlists, isLoading };
}

export function usePlaylistSongs(playlistId: string | undefined) {
  const { user } = useAuth();

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['playlist-songs', playlistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('playlist_id', playlistId!)
        .order('position', { ascending: true });
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
        position: s.position,
      })) as Track[];
    },
    enabled: !!user && !!playlistId,
  });

  return { songs, isLoading };
}

export function useCreatePlaylist() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user) throw new Error('Must be signed in');
      const { data, error } = await supabase
        .from('playlists')
        .insert({ user_id: user.id, name, description: description || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist created');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdatePlaylist() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from('playlists')
        .update({ name, description: description || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist updated');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete songs first, then playlist
      await supabase.from('playlist_songs').delete().eq('playlist_id', id);
      const { error } = await supabase.from('playlists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useAddToPlaylist() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, track, position }: { playlistId: string; track: Track; position: number }) => {
      if (!user) throw new Error('Must be signed in');
      const { error } = await supabase.from('playlist_songs').insert({
        user_id: user.id,
        playlist_id: playlistId,
        track_id: track.id,
        track_name: track.name,
        artist_name: track.artist_name,
        artist_id: track.artist_id,
        album_name: track.album_name,
        album_id: track.album_id,
        album_image: track.album_image,
        duration: track.duration,
        audio: track.audio,
        position,
      });
      if (error) throw error;
    },
    onSuccess: (_, { playlistId }) => {
      qc.invalidateQueries({ queryKey: ['playlist-songs', playlistId] });
      qc.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Added to playlist');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useRemoveFromPlaylist() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      if (!user) throw new Error('Must be signed in');
      const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: (_, { playlistId }) => {
      qc.invalidateQueries({ queryKey: ['playlist-songs', playlistId] });
      toast.success('Removed from playlist');
    },
    onError: (err: any) => toast.error(err.message),
  });
}
