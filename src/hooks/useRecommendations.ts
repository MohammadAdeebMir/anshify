import { useQuery } from '@tanstack/react-query';
import { loadTasteProfile, generateRecommendationQueries } from '@/services/tasteProfile';
import { searchYTMusic, getTracksByMoodYT } from '@/services/ytmusic';
import { Track } from '@/types/music';

export interface RecommendationRow {
  reason: string;
  tracks: Track[];
}

export function useLocalRecommendations() {
  return useQuery({
    queryKey: ['local-recommendations', loadTasteProfile().updatedAt],
    queryFn: async (): Promise<RecommendationRow[]> => {
      const profile = loadTasteProfile();
      if (profile.topArtists.length === 0) return [];

      const queries = generateRecommendationQueries(profile);
      const results = await Promise.allSettled(
        queries.map(async (q) => {
          const tracks = await searchYTMusic(q.query, 10);
          const recentSet = new Set(profile.recentVideoIds);
          const filtered = tracks.filter(t => !recentSet.has(t.id));
          return { reason: q.reason, tracks: filtered.slice(0, 8) };
        })
      );

      return results
        .filter((r): r is PromiseFulfilledResult<RecommendationRow> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => r.tracks.length > 0);
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function usePopularArtists() {
  return useQuery({
    queryKey: ['popular-artists'],
    queryFn: async () => {
      const artists = [
        'The Weeknd', 'Taylor Swift', 'Drake', 'Billie Eilish',
        'Bad Bunny', 'Dua Lipa', 'Post Malone', 'SZA',
        'Travis Scott', 'Ariana Grande', 'Kendrick Lamar', 'Doja Cat'
      ];
      const results = await Promise.allSettled(
        artists.slice(0, 8).map(async (name) => {
          const tracks = await searchYTMusic(name, 1);
          if (tracks.length === 0) return null;
          return {
            id: tracks[0].artist_id || name,
            name,
            image: tracks[0].album_image,
            topTrack: tracks[0],
          };
        })
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);
    },
    staleTime: 30 * 60 * 1000,
  });
}

// Time-aware mood selection
function getMoodsByTimeOfDay(): { mood: string; label: string; emoji: string }[] {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 9) {
    return [
      { mood: 'Chill', label: 'Morning Chill', emoji: '🌅' },
      { mood: 'Happy', label: 'Feel Good Morning', emoji: '☀️' },
      { mood: 'Focus', label: 'Focus Mode', emoji: '🎯' },
    ];
  }
  if (hour >= 9 && hour < 12) {
    return [
      { mood: 'Focus', label: 'Deep Focus', emoji: '🎯' },
      { mood: 'Happy', label: 'Upbeat Vibes', emoji: '🎵' },
      { mood: 'Workout', label: 'Energy Boost', emoji: '⚡' },
    ];
  }
  if (hour >= 12 && hour < 17) {
    return [
      { mood: 'Happy', label: 'Good Vibes', emoji: '😊' },
      { mood: 'Chill', label: 'Afternoon Chill', emoji: '🍃' },
      { mood: 'Party', label: 'Party Hits', emoji: '🎉' },
    ];
  }
  if (hour >= 17 && hour < 21) {
    return [
      { mood: 'Chill', label: 'Evening Wind Down', emoji: '🌆' },
      { mood: 'Romantic', label: 'Romantic Evening', emoji: '💜' },
      { mood: 'Sad', label: 'In Your Feels', emoji: '🥀' },
    ];
  }
  // 21-5: Night
  return [
    { mood: 'Chill', label: 'Late Night Chill', emoji: '🌙' },
    { mood: 'Sad', label: 'Midnight Feels', emoji: '💫' },
    { mood: 'Sleep', label: 'Sleep & Relax', emoji: '😴' },
  ];
}

export function useMoodSections() {
  const moods = getMoodsByTimeOfDay();

  return useQuery({
    queryKey: ['mood-sections', new Date().getHours()],
    queryFn: async (): Promise<{ label: string; emoji: string; tracks: Track[] }[]> => {
      const results = await Promise.allSettled(
        moods.map(async ({ mood, label, emoji }) => {
          const tracks = await getTracksByMoodYT(mood, 12);
          return { label, emoji, tracks };
        })
      );

      return results
        .filter((r): r is PromiseFulfilledResult<{ label: string; emoji: string; tracks: Track[] }> =>
          r.status === 'fulfilled'
        )
        .map(r => r.value)
        .filter(r => r.tracks.length > 0);
    },
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}
