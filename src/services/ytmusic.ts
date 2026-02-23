import { Track } from '@/types/music';

const BASE_URL = 'http://140.238.167.236:8000';

// In-memory search cache (last 20 queries)
const searchCache = new Map<string, { data: Track[]; timestamp: number }>();
const CACHE_MAX = 20;
const CACHE_TTL = 5 * 60 * 1000;

// Stream URL cache
const streamCache = new Map<string, { url: string; timestamp: number }>();
const STREAM_CACHE_TTL = 30 * 60 * 1000;

// In-flight stream dedup
const inflightStreams = new Map<string, Promise<string>>();

// Abort controller for cancelling previous user-initiated searches only
let currentSearchController: AbortController | null = null;

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
    audio: '',
    position: 0,
  };
}

function extractThumbnail(thumbnails: any): string {
  if (!thumbnails) return '';
  if (typeof thumbnails === 'string') return thumbnails;
  if (Array.isArray(thumbnails)) {
    const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
    return sorted[0]?.url || '';
  }
  return thumbnails.url || '';
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const existingSignal = opts.signal;
  const id = setTimeout(() => controller.abort(), timeoutMs);

  // Merge abort signals
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function fetchWithRetry(url: string, opts: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  try {
    const res = await fetchWithTimeout(url, opts, timeoutMs);
    if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError' && opts.signal?.aborted) throw err; // user-initiated abort
    // Retry once
    console.warn(`[ytmusic] Retrying: ${url}`, err.message);
    return fetchWithTimeout(url, opts, timeoutMs);
  }
}

export async function searchYTMusic(query: string, limit = 20, cancelPrevious = false): Promise<Track[]> {
  const cacheKey = `${query}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let signal: AbortSignal | undefined;
  if (cancelPrevious) {
    if (currentSearchController) currentSearchController.abort();
    currentSearchController = new AbortController();
    signal = currentSearchController.signal;
  }

  try {
    const res = await fetchWithRetry(
      `${BASE_URL}/search?q=${encodeURIComponent(query)}`,
      { ...(signal ? { signal } : {}) },
      10000
    );
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);

    const data = await res.json();
    const results = Array.isArray(data) ? data : data.results || data.items || [];
    const tracks = results.slice(0, limit).map(mapYTTrack).filter((t: Track) => t.id);

    searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
    trimCache(searchCache, CACHE_MAX);
    return tracks;
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error('[ytmusic] Search error:', err.message);
    return []; // graceful empty
  }
}

export async function getStreamUrl(videoId: string): Promise<string> {
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < STREAM_CACHE_TTL) {
    return cached.url;
  }

  // Dedup in-flight requests for same videoId
  const inflight = inflightStreams.get(videoId);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const res = await fetchWithRetry(
        `${BASE_URL}/stream?videoId=${encodeURIComponent(videoId)}`,
        {},
        15000
      );
      if (!res.ok) throw new Error(`Stream failed: ${res.status}`);

      const data = await res.json();
      
      // Backend returns {success: true, url: "..."} 
      if (data.success === false) {
        throw new Error('Backend reported stream failure');
      }
      
      const url = data.url || data.audio_url || data.stream_url || '';

      if (!url || url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
        throw new Error('Backend returned non-streamable URL');
      }

      streamCache.set(videoId, { url, timestamp: Date.now() });
      trimCache(streamCache, 50);
      return url;
    } finally {
      inflightStreams.delete(videoId);
    }
  })();

  inflightStreams.set(videoId, promise);
  return promise;
}

export function needsStreamResolution(track: Track): boolean {
  return !track.audio || track.audio === '';
}

export async function getTrendingYT(limit = 10): Promise<Track[]> {
  return searchYTMusic('top hits 2025 trending', limit);
}

export async function getNewReleasesYT(limit = 10): Promise<Track[]> {
  return searchYTMusic('new music releases 2025', limit);
}

export async function getPopularArtistsYT(limit = 8): Promise<Track[]> {
  return searchYTMusic('top artists popular songs', limit);
}

export async function getTracksByMoodYT(mood: string, limit = 20): Promise<Track[]> {
  const moodQueries: Record<string, string> = {
    'Happy': 'happy upbeat pop songs',
    'Sad': 'sad emotional songs',
    'Focus': 'focus study music instrumental',
    'Workout': 'workout gym motivation songs',
    'Chill': 'chill lofi relaxing music',
    'Romantic': 'romantic love songs',
    'Party': 'party dance club hits',
    'Sleep': 'sleep calm ambient music',
  };
  return searchYTMusic(moodQueries[mood] || `${mood} music`, limit);
}

export async function getTracksByGenreYT(genre: string, limit = 20): Promise<Track[]> {
  return searchYTMusic(`${genre} music popular`, limit);
}

export async function preBufferTrack(videoId: string): Promise<void> {
  try {
    await getStreamUrl(videoId);
  } catch {
    // silent fail for pre-buffer
  }
}
