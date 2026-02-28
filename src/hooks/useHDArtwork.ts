import { useState, useEffect } from 'react';
import { getHDArtwork, getQuickHDArtwork } from '@/utils/artworkUtils';

/**
 * Hook that resolves the best available HD artwork for a track
 * Returns quick result immediately, then upgrades to HD async (YouTube → iTunes → fallback)
 */
export function useHDArtwork(
  trackId?: string,
  originalUrl?: string,
  trackName?: string,
  artistName?: string,
): string {
  const quickUrl = getQuickHDArtwork(trackId || '', originalUrl);
  const [hdUrl, setHdUrl] = useState(quickUrl);

  useEffect(() => {
    if (!trackId && !originalUrl) return;
    
    setHdUrl(getQuickHDArtwork(trackId || '', originalUrl));
    
    let cancelled = false;
    getHDArtwork(trackId || '', originalUrl, trackName, artistName).then((url) => {
      if (!cancelled && url) setHdUrl(url);
    });
    
    return () => { cancelled = true; };
  }, [trackId, originalUrl, trackName, artistName]);

  return hdUrl;
}
