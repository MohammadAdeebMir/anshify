import { useState, useEffect } from 'react';
import { getHDArtwork, getQuickHDArtwork } from '@/utils/artworkUtils';

/**
 * Hook that resolves the best available HD artwork for a track
 * Returns quick result immediately, then upgrades to HD async
 */
export function useHDArtwork(trackId?: string, originalUrl?: string): string {
  const quickUrl = getQuickHDArtwork(trackId || '', originalUrl);
  const [hdUrl, setHdUrl] = useState(quickUrl);

  useEffect(() => {
    if (!trackId && !originalUrl) return;
    
    // Set quick URL immediately
    setHdUrl(getQuickHDArtwork(trackId || '', originalUrl));
    
    // Then try to resolve HD
    let cancelled = false;
    getHDArtwork(trackId || '', originalUrl).then((url) => {
      if (!cancelled && url) setHdUrl(url);
    });
    
    return () => { cancelled = true; };
  }, [trackId, originalUrl]);

  return hdUrl;
}
