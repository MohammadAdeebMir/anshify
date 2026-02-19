import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { searchTracks, getTracksByGenre } from '@/services/jamendo';
import { Track } from '@/types/music';

export function useAIRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations', user?.id],
    queryFn: async () => {
      // Gather listening history
      const { data: recent } = await supabase
        .from('recently_played')
        .select('track_name, artist_name')
        .order('played_at', { ascending: false })
        .limit(15);

      const { data: liked } = await supabase
        .from('liked_songs')
        .select('artist_name')
        .limit(10);

      const likedArtists = [...new Set((liked || []).map(l => l.artist_name))];

      const { data, error } = await supabase.functions.invoke('music-ai', {
        body: {
          action: 'recommendations',
          listeningHistory: recent || [],
          likedArtists,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const recommendations = data.result || [];
      // Search for actual tracks using the AI queries
      const trackPromises = recommendations.slice(0, 3).map(async (rec: any) => {
        try {
          const tracks = await searchTracks(rec.query, 3);
          return { reason: rec.reason, tracks };
        } catch {
          return { reason: rec.reason, tracks: [] };
        }
      });

      return Promise.all(trackPromises);
    },
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });
}

export function useDailyMixes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['daily-mixes', user?.id],
    queryFn: async () => {
      const { data: recent } = await supabase
        .from('recently_played')
        .select('track_name, artist_name')
        .order('played_at', { ascending: false })
        .limit(20);

      const { data: liked } = await supabase
        .from('liked_songs')
        .select('artist_name')
        .limit(10);

      const likedArtists = [...new Set((liked || []).map(l => l.artist_name))];

      const { data, error } = await supabase.functions.invoke('music-ai', {
        body: {
          action: 'daily_mix',
          listeningHistory: recent || [],
          likedArtists,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const mixes = data.result || [];
      // Fetch actual tracks for each mix
      const mixPromises = mixes.slice(0, 3).map(async (mix: any) => {
        const allTracks: Track[] = [];
        for (const query of (mix.search_queries || []).slice(0, 3)) {
          try {
            const tracks = await searchTracks(query, 3);
            allTracks.push(...tracks);
          } catch { /* skip */ }
        }
        // Deduplicate
        const seen = new Set<string>();
        const unique = allTracks.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        return { name: mix.name, description: mix.description, tracks: unique };
      });

      return Promise.all(mixPromises);
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });
}

export function useMoodTracks(mood: string | null) {
  return useQuery({
    queryKey: ['mood-tracks', mood],
    queryFn: async () => {
      const moodTagMap: Record<string, string> = {
        'Happy': 'happy upbeat pop',
        'Sad': 'sad melancholy ballad',
        'Focus': 'ambient focus concentration',
        'Workout': 'energetic workout electronic',
        'Chill': 'chill lofi relaxing',
        'Romantic': 'romantic love',
        'Party': 'party dance club',
        'Sleep': 'sleep calm ambient',
      };
      const query = moodTagMap[mood!] || mood!.toLowerCase();
      return searchTracks(query, 20);
    },
    enabled: !!mood,
    staleTime: 10 * 60 * 1000,
  });
}
