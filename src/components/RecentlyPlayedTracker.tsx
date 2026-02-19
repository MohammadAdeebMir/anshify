import { useEffect, useRef } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Track } from '@/types/music';
import { useUpdateStreak } from '@/hooks/useSocial';

export const RecentlyPlayedTracker = () => {
  const { onTrackPlay } = usePlayer();
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const updateStreak = useUpdateStreak();
  const streakRef = useRef(updateStreak);
  streakRef.current = updateStreak;

  useEffect(() => {
    return onTrackPlay(async (track: Track) => {
      const currentUser = userRef.current;
      if (!currentUser) return;
      
      // Record play
      await supabase.from('recently_played').insert({
        user_id: currentUser.id,
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

      // Update listening stats (upsert play count)
      const { data: existing } = await supabase
        .from('listening_stats')
        .select('play_count')
        .eq('user_id', currentUser.id)
        .eq('track_id', track.id)
        .single();

      if (existing) {
        await supabase.from('listening_stats')
          .update({ play_count: existing.play_count + 1, last_played_at: new Date().toISOString() })
          .eq('user_id', currentUser.id)
          .eq('track_id', track.id);
      } else {
        await supabase.from('listening_stats').insert({
          user_id: currentUser.id,
          track_id: track.id,
          track_name: track.name,
          artist_name: track.artist_name,
          artist_id: track.artist_id,
          album_name: track.album_name,
        });
      }

      // Update streak
      streakRef.current.mutate();
    });
  }, [onTrackPlay]);

  return null;
};
