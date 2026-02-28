/**
 * Ultra HD Artwork Utility
 * Smart multi-source artwork pipeline:
 * YouTube HD → iTunes/Apple Music → fallback
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
function probeImage(url: string, minSize = 200): Promise<{ url: string; width: number; height: number } | null> {
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
 * Fetch HD artwork from iTunes Search API
 * Returns 1000x1000 artwork URL or null
 */
async function fetchITunesArtwork(trackName: string, artistName: string): Promise<string | null> {
  const cacheKey = `${trackName}::${artistName}`.toLowerCase();
  if (itunesCache.has(cacheKey)) return itunesCache.get(cacheKey) || null;

  try {
    const query = encodeURIComponent(`${trackName} ${artistName}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&entity=song&limit=3`,
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

    // Find best match
    const normalizedTrack = trackName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedArtist = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    let bestResult = data.results[0];
    for (const result of data.results) {
      const rTrack = (result.trackName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const rArtist = (result.artistName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (rTrack.includes(normalizedTrack) || normalizedTrack.includes(rTrack)) {
        if (rArtist.includes(normalizedArtist) || normalizedArtist.includes(rArtist)) {
          bestResult = result;
          break;
        }
      }
    }

    const artworkUrl = bestResult.artworkUrl100;
    if (!artworkUrl) {
      itunesCache.set(cacheKey, null);
      return null;
    }

    // Upgrade to 1000x1000
    const hdUrl = artworkUrl.replace(/100x100bb/, '1000x1000bb');
    itunesCache.set(cacheKey, hdUrl);
    return hdUrl;
  } catch {
    itunesCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Get the best available artwork URL for a track
 * Priority: YouTube HD → iTunes HD → original
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

  // If the original URL is already high quality YouTube, use it
  if (originalUrl?.includes('maxresdefault') || originalUrl?.includes('sddefault')) {
    artworkCache.set(cacheKey, originalUrl);
    return originalUrl;
  }

  // Try to extract video ID from track ID
  const videoId = extractVideoId(trackId);
  
  if (videoId) {
    // Try YouTube thumbnails in quality order
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

  // Try iTunes Search API as fallback
  if (trackName && artistName) {
    const itunesUrl = await fetchITunesArtwork(trackName, artistName);
    if (itunesUrl) {
      // Probe to confirm it loads
      const result = await probeImage(itunesUrl, 400);
      if (result) {
        artworkCache.set(cacheKey, result.url);
        return result.url;
      }
    }
  }

  // Fallback to original URL
  const fallback = originalUrl || '';
  if (fallback) artworkCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Synchronous: get best known YouTube thumbnail URL without probing
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
