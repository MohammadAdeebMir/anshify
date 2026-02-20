import { Track } from '@/types/music';

const BASE_URL = 'https://ytmusic-backend-xi5y.onrender.com';

// In-memory search cache (last 20 queries)
const searchCache = new Map<string, { data: Track[]; timestamp: number }>();
const CACHE_MAX = 20;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Stream URL cache
const streamCache = new Map<string, { url: string; timestamp: number }>();
const STREAM_CACHE_TTL = 30 * 60 * 1000; // 30 min

function trimCache<T>(cache: Map<string, T>, max: number) {
  if (cache.size > max) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

function mapYTTrack(item: any): Track {
  return {
    id: item.videoId || item.id || '',
    name: item.title || item.name || '',
    artist_name: Array.isArray(item.artists)
      ? item.artists.map((a: any) => (typeof a === 'string' ? a : a.name)).join(', ')
      : item.artist_name || item.artist || '',
    artist_id: Array.isArray(item.artists) && item.artists[0]?.id
      ? item.artists[0].id
      : item.artist_id || '',
    album_name: item.album?.name || item.album_name || '',
    album_id: item.album?.id || item.album_id || '',
    album_image: extractThumbnail(item.thumbnails || item.thumbnail),
    duration: item.duration_seconds || item.duration || 0,
    audio: '', // resolved on play via getStreamUrl
    position: 0,
  };
}

function extractThumbnail(thumbnails: any): string {
  if (!thumbnails) return '';
  if (typeof thumbnails === 'string') return thumbnails;
  if (Array.isArray(thumbnails)) {
    // Pick highest quality
    const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
    return sorted[0]?.url || '';
  }
  return thumbnails.url || '';
}

export async function searchYTMusic(query: string, limit = 20): Promise<Track[]> {
  const cacheKey = `${query}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);

  const data = await res.json();
  const results = Array.isArray(data) ? data : data.results || data.items || [];
  const tracks = results.slice(0, limit).map(mapYTTrack).filter((t: Track) => t.id);

  searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
  trimCache(searchCache, CACHE_MAX);

  return tracks;
}

export async function getStreamUrl(videoId: string): Promise<string> {
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < STREAM_CACHE_TTL) {
    return cached.url;
  }

  const res = await fetch(`${BASE_URL}/stream?videoId=${encodeURIComponent(videoId)}`);
  if (!res.ok) throw new Error(`Stream failed: ${res.status}`);

  const data = await res.json();
  const url = data.audio_url || data.url || data.stream_url || '';
  if (!url) throw new Error('No audio URL in stream response');

  streamCache.set(videoId, { url, timestamp: Date.now() });
  trimCache(streamCache, 50);

  return url;
}

// Check if a track needs stream resolution (YT Music tracks have empty audio)
export function needsStreamResolution(track: Track): boolean {
  return !track.audio || track.audio === '';
}
