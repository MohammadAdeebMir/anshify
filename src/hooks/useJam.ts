import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Track } from '@/types/music';
import { toast } from 'sonner';

export interface JamSession {
  id: string;
  code: string;
  host_id: string;
  name: string;
  current_track_id: string | null;
  current_track_data: any;
  is_playing: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JamParticipant {
  id: string;
  jam_id: string;
  user_id: string;
  display_name: string | null;
  joined_at: string;
}

export interface JamQueueItem {
  id: string;
  jam_id: string;
  track_id: string;
  track_data: any;
  added_by: string;
  position: number;
  added_at: string;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useCreateJam() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Must be signed in');
      const code = generateCode();
      const { data, error } = await supabase
        .from('jam_sessions')
        .insert({ host_id: user.id, name, code })
        .select()
        .single();
      if (error) throw error;

      // Host joins as participant
      await supabase.from('jam_participants').insert({
        jam_id: data.id,
        user_id: user.id,
        display_name: user.email?.split('@')[0] || 'Host',
      });

      return data as JamSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jam-sessions'] });
      toast.success('Jam session created!');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useJoinJam() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error('Must be signed in');
      const { data: session, error: findErr } = await supabase
        .from('jam_sessions')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single();
      if (findErr || !session) throw new Error('Jam session not found or expired');

      // Join as participant (ignore duplicate)
      await supabase.from('jam_participants').upsert({
        jam_id: session.id,
        user_id: user.id,
        display_name: user.email?.split('@')[0] || 'Guest',
      }, { onConflict: 'jam_id,user_id' });

      return session as JamSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jam-sessions'] });
      toast.success('Joined jam session!');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useJamSession(jamId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['jam-session', jamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jam_sessions')
        .select('*')
        .eq('id', jamId!)
        .single();
      if (error) throw error;
      return data as JamSession;
    },
    enabled: !!jamId && !!user,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['jam-participants', jamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jam_participants')
        .select('*')
        .eq('jam_id', jamId!);
      if (error) throw error;
      return data as JamParticipant[];
    },
    enabled: !!jamId && !!user,
  });

  const { data: queue = [] } = useQuery({
    queryKey: ['jam-queue', jamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jam_queue')
        .select('*')
        .eq('jam_id', jamId!)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as JamQueueItem[];
    },
    enabled: !!jamId && !!user,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!jamId) return;

    const channel = supabase
      .channel(`jam-${jamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jam_sessions', filter: `id=eq.${jamId}` }, () => {
        qc.invalidateQueries({ queryKey: ['jam-session', jamId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jam_participants', filter: `jam_id=eq.${jamId}` }, () => {
        qc.invalidateQueries({ queryKey: ['jam-participants', jamId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jam_queue', filter: `jam_id=eq.${jamId}` }, () => {
        qc.invalidateQueries({ queryKey: ['jam-queue', jamId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jamId, qc]);

  const isHost = session?.host_id === user?.id;

  return { session, participants, queue, isHost };
}

export function useJamActions(jamId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const addToQueue = useMutation({
    mutationFn: async (track: Track) => {
      if (!user || !jamId) throw new Error('Not in a jam');
      const { data: existing } = await supabase
        .from('jam_queue')
        .select('position')
        .eq('jam_id', jamId)
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;

      const { error } = await supabase.from('jam_queue').insert({
        jam_id: jamId,
        track_id: track.id,
        track_data: {
          id: track.id,
          name: track.name,
          artist_name: track.artist_name,
          artist_id: track.artist_id,
          album_name: track.album_name,
          album_id: track.album_id,
          album_image: track.album_image,
          duration: track.duration,
          audio: track.audio,
        },
        added_by: user.id,
        position: nextPos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jam-queue', jamId] });
      toast.success('Added to jam queue');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateNowPlaying = useMutation({
    mutationFn: async ({ track, isPlaying }: { track: Track | null; isPlaying: boolean }) => {
      if (!jamId) throw new Error('Not in a jam');
      const { error } = await supabase
        .from('jam_sessions')
        .update({
          current_track_id: track?.id || null,
          current_track_data: track ? {
            id: track.id,
            name: track.name,
            artist_name: track.artist_name,
            artist_id: track.artist_id,
            album_name: track.album_name,
            album_id: track.album_id,
            album_image: track.album_image,
            duration: track.duration,
            audio: track.audio,
          } : null,
          is_playing: isPlaying,
        })
        .eq('id', jamId);
      if (error) throw error;
    },
  });

  const endJam = useMutation({
    mutationFn: async () => {
      if (!jamId) throw new Error('Not in a jam');
      const { error } = await supabase
        .from('jam_sessions')
        .update({ is_active: false })
        .eq('id', jamId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jam-sessions'] });
      toast.success('Jam session ended');
    },
  });

  const leaveJam = useMutation({
    mutationFn: async () => {
      if (!user || !jamId) throw new Error('Not in a jam');
      const { error } = await supabase
        .from('jam_participants')
        .delete()
        .eq('jam_id', jamId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Left jam session');
    },
  });

  return { addToQueue, updateNowPlaying, endJam, leaveJam };
}
