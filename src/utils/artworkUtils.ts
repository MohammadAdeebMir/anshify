/**
 * Ultra HD Artwork Utility
 * Smart artwork pipeline with YouTube thumbnail fallback chain
 */

const artworkCache = new Map<string, string>();
const failedUrls = new Set<string>();

/**
 * Extract video ID from various YouTube URL formats or raw ID
 */
function extractVideoId(input: string): string | null {
  if (!input) return null;
  // Already a plain video ID (11 chars, alphanumeric + dash/underscore)
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
      // YouTube returns a 120x90 gray placeholder for missing thumbnails
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
 * Get the best available artwork URL for a track
 * Tries YouTube HD thumbnails first, falls back to original
 */
export async function getHDArtwork(
  trackId: string,
  originalUrl?: string,
): Promise<string> {
  // Check cache
  const cacheKey = trackId || originalUrl || '';
  const cached = artworkCache.get(cacheKey);
  if (cached) return cached;

  // If the original URL is already high quality YouTube, use it
  if (originalUrl?.includes('maxresdefault') || originalUrl?.includes('sddefault')) {
    artworkCache.set(cacheKey, originalUrl);
    return originalUrl;
  }

  // Try to extract video ID from track ID (which is usually the YouTube video ID)
  const videoId = extractVideoId(trackId);
  
  if (videoId) {
    // Try YouTube thumbnails in quality order
    for (const quality of YT_THUMB_QUALITIES) {
      const url = getYouTubeThumbnailUrl(videoId, quality);
      const result = await probeImage(url, quality === 'maxresdefault' ? 400 : 200);
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
 * Use this for immediate rendering, then upgrade with getHDArtwork async
 */
export function getQuickHDArtwork(trackId: string, originalUrl?: string): string {
  const cacheKey = trackId || originalUrl || '';
  const cached = artworkCache.get(cacheKey);
  if (cached) return cached;

  // If original is already HD
  if (originalUrl?.includes('maxresdefault')) return originalUrl;

  // Try to construct HD URL from video ID
  const videoId = extractVideoId(trackId);
  if (videoId) {
    return getYouTubeThumbnailUrl(videoId, 'hqdefault');
  }
  
  return originalUrl || '';
}

/**
 * Preload artwork for upcoming tracks
 */
export function preloadArtwork(trackId: string, originalUrl?: string): void {
  getHDArtwork(trackId, originalUrl).then((url) => {
    if (url) {
      const img = new Image();
      img.src = url;
    }
  });
}
