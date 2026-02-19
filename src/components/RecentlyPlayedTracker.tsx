import { useEffect, useRef } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Track } from '@/types/music';

export const RecentlyPlayedTracker = () => {
  const { onTrackPlay } = usePlayer();
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    return onTrackPlay(async (track: Track) => {
      const currentUser = userRef.current;
      if (!currentUser) return;
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
    });
  }, [onTrackPlay]);

  return null;
};
