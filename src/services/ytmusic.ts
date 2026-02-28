import { Track } from '@/types/music';
import { supabase } from '@/integrations/supabase/client';

// Use the music-proxy edge function to bypass CORS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getProxyUrl(endpoint: string, params: Record<string, string>): string {
  const searchParams = new URLSearchParams({ endpoint, ...params });
  return `${SUPABASE_URL}/functions/v1/music-proxy?${searchParams.toString()}`;
}

async function getProxyHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_KEY,
      };
    }
  } catch {
    // Not logged in, use anon key
  }
  return {
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'apikey': SUPABASE_KEY,
  };
}

console.log('[ytmusic] Using proxy via edge function');

// In-memory search cache (last 20 queries)
const searchCache = new Map<string, { data: Track[]; timestamp: number }>();
const CACHE_MAX = 20;
const CACHE_TTL = 5 * 60 * 1000;

// Stream URL cache
const streamCache = new Map<string, { url: string; timestamp: number }>();
const STREAM_CACHE_TTL = 30 * 60 * 1000;

// In-flight stream dedup
const inflightStreams = new Map<string, Promise<string>>();

// Abort controller for cancelling previous user-initiated searches
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

  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    return await fetch(url, { ...opts, signal: controller.signal });
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
    if (err.name === 'AbortError' && opts.signal?.aborted) throw err;
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
    const url = getProxyUrl('search', { q: query });
    console.log('[ytmusic] Search URL:', url);

    const headers = await getProxyHeaders();
    const res = await fetchWithRetry(url, {
      headers,
      ...(signal ? { signal } : {}),
    }, 12000);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);

    const data = await res.json();
    console.log('[ytmusic] Search response type:', Array.isArray(data) ? 'array' : typeof data);
    const results = Array.isArray(data) ? data : data.results || data.items || [];
    const tracks = results.slice(0, limit).map(mapYTTrack).filter((t: Track) => t.id);

    searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });
    trimCache(searchCache, CACHE_MAX);
    return tracks;
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error('[ytmusic] Search error:', err.message);
    return [];
  }
}

export async function getStreamUrl(videoId: string): Promise<string> {
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < STREAM_CACHE_TTL) {
    return cached.url;
  }

  const inflight = inflightStreams.get(videoId);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const url = getProxyUrl('stream', { videoId });
      console.log('[ytmusic] Stream request:', url);

      const headers = await getProxyHeaders();
      const res = await fetchWithRetry(url, { headers }, 15000);
      if (!res.ok) throw new Error(`Stream failed: ${res.status}`);

      const data = await res.json();
      console.log('[ytmusic] STREAM RESPONSE:', data);

      if (!data.success || !data.url) {
        throw new Error('Backend reported stream failure');
      }

      const audioUrl = data.url;
      console.log('[ytmusic] AUDIO SRC:', audioUrl);

      if (!audioUrl || audioUrl.includes('youtube.com/watch') || audioUrl.includes('youtu.be/')) {
        throw new Error('Backend returned non-streamable URL');
      }

      streamCache.set(videoId, { url: audioUrl, timestamp: Date.now() });
      trimCache(streamCache, 50);
      return audioUrl;
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
