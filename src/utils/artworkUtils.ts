/**
 * Ultra HD Artwork Utility
 * Smart multi-source artwork pipeline:
 * iTunes/Apple Music (PRIMARY) → YouTube HD → fallback
 */

const artworkCache = new Map<string, string>();
const failedUrls = new Set<string>();
const itunesCache = new Map<string, string | null>();

/**
 * Extract video ID from various YouTube URL formats or raw ID
 */
function extractVideoId(input: string): string | null {
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      return url.searchParams.get('v') || url.pathname.split('/').pop() || null;
    }
  } catch {
    // Not a URL
  }
  return null;
}

/**
 * YouTube thumbnail quality chain (highest to lowest)
 */
const YT_THUMB_QUALITIES = [
  'maxresdefault',  // 1920x1080
  'sddefault',      // 640x480
  'hqdefault',      // 480x360
  'mqdefault',      // 320x180
] as const;

function getYouTubeThumbnailUrl(videoId: string, quality: string): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Check if an image URL loads and meets minimum quality
 */
function probeImage(url: string, minSize = 480): Promise<{ url: string; width: number; height: number } | null> {
  if (failedUrls.has(url)) return Promise.resolve(null);
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      failedUrls.add(url);
      resolve(null);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      if (img.naturalWidth < minSize || img.naturalHeight < minSize) {
        failedUrls.add(url);
        resolve(null);
      } else {
        resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      failedUrls.add(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * iTunes HD resolution chain — try largest first
 */
const ITUNES_SIZES = ['2000x2000bb', '1500x1500bb', '1000x1000bb'] as const;

/**
 * Fetch HD artwork from iTunes Search API (PRIMARY source)
 * Tries 2000 → 1500 → 1000 resolution progressively
 */
async function fetchITunesArtwork(trackName: string, artistName: string): Promise<string | null> {
  const cacheKey = `${trackName}::${artistName}`.toLowerCase();
  if (itunesCache.has(cacheKey)) return itunesCache.get(cacheKey) || null;

  try {
    const query = encodeURIComponent(`${trackName} ${artistName}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&entity=song&limit=5`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    
    if (!res.ok) {
      itunesCache.set(cacheKey, null);
      return null;
    }
    
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      itunesCache.set(cacheKey, null);
      return null;
    }

    // Find best match — prefer exact artist + track match
    const normalizedTrack = trackName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedArtist = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    let bestResult = data.results[0];
    let bestScore = 0;
    for (const result of data.results) {
      const rTrack = (result.trackName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const rArtist = (result.artistName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let score = 0;
      if (rTrack === normalizedTrack) score += 3;
      else if (rTrack.includes(normalizedTrack) || normalizedTrack.includes(rTrack)) score += 1;
      if (rArtist === normalizedArtist) score += 3;
      else if (rArtist.includes(normalizedArtist) || normalizedArtist.includes(rArtist)) score += 1;
      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }

    const artworkUrl100 = bestResult.artworkUrl100;
    if (!artworkUrl100) {
      itunesCache.set(cacheKey, null);
      return null;
    }

    // Progressive HD upgrade: 2000 → 1500 → 1000
    for (const size of ITUNES_SIZES) {
      const hdUrl = artworkUrl100.replace(/100x100bb/, size);
      const result = await probeImage(hdUrl, 480);
      if (result) {
        itunesCache.set(cacheKey, result.url);
        return result.url;
      }
    }

    // Fallback to 600x600
    const fallbackUrl = artworkUrl100.replace(/100x100bb/, '600x600bb');
    itunesCache.set(cacheKey, fallbackUrl);
    return fallbackUrl;
  } catch {
    itunesCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Get the best available artwork URL for a track
 * Priority: iTunes HD (primary) → YouTube HD → original
 */
export async function getHDArtwork(
  trackId: string,
  originalUrl?: string,
  trackName?: string,
  artistName?: string,
): Promise<string> {
  const cacheKey = trackId || originalUrl || '';
  const cached = artworkCache.get(cacheKey);
  if (cached) return cached;

  // 1. iTunes HD (PRIMARY) — if we have track + artist info
  if (trackName && artistName) {
    const itunesUrl = await fetchITunesArtwork(trackName, artistName);
    if (itunesUrl) {
      artworkCache.set(cacheKey, itunesUrl);
      return itunesUrl;
    }
  }

  // 2. YouTube HD fallback
  const videoId = extractVideoId(trackId);
  if (videoId) {
    for (const quality of YT_THUMB_QUALITIES) {
      const url = getYouTubeThumbnailUrl(videoId, quality);
      const minSize = quality === 'maxresdefault' ? 400 : quality === 'sddefault' ? 300 : 200;
      const result = await probeImage(url, minSize);
      if (result) {
        artworkCache.set(cacheKey, result.url);
        return result.url;
      }
    }
  }

  // 3. If the original URL is already high quality, use it
  if (originalUrl?.includes('maxresdefault') || originalUrl?.includes('sddefault')) {
    artworkCache.set(cacheKey, originalUrl);
    return originalUrl;
  }

  // 4. Fallback to original URL
  const fallback = originalUrl || '';
  if (fallback) artworkCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Synchronous: get best known artwork URL without probing
 */
export function getQuickHDArtwork(trackId: string, originalUrl?: string): string {
  const cacheKey = trackId || originalUrl || '';
  const cached = artworkCache.get(cacheKey);
  if (cached) return cached;

  if (originalUrl?.includes('maxresdefault')) return originalUrl;

  const videoId = extractVideoId(trackId);
  if (videoId) {
    return getYouTubeThumbnailUrl(videoId, 'hqdefault');
  }
  
  return originalUrl || '';
}

/**
 * Preload artwork for upcoming tracks
 */
export function preloadArtwork(trackId: string, originalUrl?: string, trackName?: string, artistName?: string): void {
  getHDArtwork(trackId, originalUrl, trackName, artistName).then((url) => {
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });
}
