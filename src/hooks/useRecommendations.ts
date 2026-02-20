import { useQuery } from '@tanstack/react-query';
import { loadTasteProfile, generateRecommendationQueries } from '@/services/tasteProfile';
import { searchYTMusic } from '@/services/ytmusic';
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
          // Deduplicate against recent plays
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
