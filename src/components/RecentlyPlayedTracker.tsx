import { useEffect, useRef } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Track } from '@/types/music';
import { useUpdateStreak } from '@/hooks/useSocial';
import { recordPlay } from '@/services/tasteProfile';

export const RecentlyPlayedTracker = () => {
  const { onTrackPlay, progress } = usePlayer();
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const updateStreak = useUpdateStreak();
  const streakRef = useRef(updateStreak);
  streakRef.current = updateStreak;
  const progressRef = useRef(0);
  progressRef.current = progress;

  useEffect(() => {
    let lastTrackId: string | null = null;
    let trackStartTime = 0;

    return onTrackPlay(async (track: Track) => {
      // Record taste for the PREVIOUS track
      if (lastTrackId && lastTrackId !== track.id) {
        const durationPlayed = progressRef.current;
        // Find previous track info from entries – we stored it
        recordPlay(
          { id: lastTrackId, name: '', artist_name: '', artist_id: '', album_name: '', album_id: '', album_image: '', duration: 0, audio: '', position: 0 },
          durationPlayed
        );
      }

      // Record taste for current track (as a play event)
      recordPlay(track, 0);
      lastTrackId = track.id;
      trackStartTime = Date.now();

      const currentUser = userRef.current;
      if (!currentUser) return;
      
      // Record play in DB
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

      // Update listening stats
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
