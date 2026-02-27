import { useRef, useEffect, useCallback, useState } from 'react';

const DEBUG_PLAYER = false;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export type YTPlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued' | 'error';

interface UseYouTubePlayerReturn {
  loadVideo: (videoId: string) => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  getProgress: () => number;
  getDuration: () => number;
  playerState: YTPlayerState;
  isReady: boolean;
  errorCode: number | null;
}

let ytApiLoaded = false;
let ytApiLoading = false;
const ytReadyCallbacks: (() => void)[] = [];

function loadYTApi(): Promise<void> {
  if (ytApiLoaded && window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    if (ytApiLoading) {
      ytReadyCallbacks.push(resolve);
      return;
    }
    ytApiLoading = true;
    ytReadyCallbacks.push(resolve);

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      ytApiLoading = false;
      if (DEBUG_PLAYER) console.log('[YT] API Ready');
      ytReadyCallbacks.forEach((cb) => cb());
      ytReadyCallbacks.length = 0;
    };
  });
}

const YT_STATE_MAP: Record<number, YTPlayerState> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued',
};

export function useYouTubePlayer(containerId: string): UseYouTubePlayerReturn {
  const playerRef = useRef<any>(null);
  const [playerState, setPlayerState] = useState<YTPlayerState>('unstarted');
  const [isReady, setIsReady] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const pendingVideoRef = useRef<string | null>(null);

  useEffect(() => {
    let destroyed = false;

    loadYTApi().then(() => {
      if (destroyed) return;

      // Ensure container exists
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        document.body.appendChild(container);
      }

      playerRef.current = new window.YT.Player(containerId, {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            if (DEBUG_PLAYER) console.log('[YT] Player ready');
            setIsReady(true);
            if (pendingVideoRef.current) {
              playerRef.current?.loadVideoById(pendingVideoRef.current);
              pendingVideoRef.current = null;
            }
          },
          onStateChange: (event: any) => {
            if (destroyed) return;
            const state = YT_STATE_MAP[event.data] || 'unstarted';
            if (DEBUG_PLAYER) console.log('[YT] State:', state, event.data);
            setPlayerState(state);
            if (state !== 'error') setErrorCode(null);
          },
          onError: (event: any) => {
            if (destroyed) return;
            console.error('[YT] Error code:', event.data);
            setErrorCode(event.data);
            setPlayerState('error');
          },
        },
      });
    });

    return () => {
      destroyed = true;
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
    };
  }, [containerId]);

  const loadVideo = useCallback((videoId: string) => {
    setErrorCode(null);
    if (DEBUG_PLAYER) console.log('[YT] Loading video:', videoId);
    if (playerRef.current && isReady) {
      playerRef.current.loadVideoById(videoId);
    } else {
      pendingVideoRef.current = videoId;
    }
  }, [isReady]);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
  }, []);

  const setVolume = useCallback((vol: number) => {
    // YT volume is 0-100
    playerRef.current?.setVolume(Math.round(vol * 100));
  }, []);

  const getProgress = useCallback((): number => {
    try {
      return playerRef.current?.getCurrentTime?.() || 0;
    } catch {
      return 0;
    }
  }, []);

  const getDuration = useCallback((): number => {
    try {
      return playerRef.current?.getDuration?.() || 0;
    } catch {
      return 0;
    }
  }, []);

  return {
    loadVideo,
    play,
    pause,
    seekTo,
    setVolume,
    getProgress,
    getDuration,
    playerState,
    isReady,
    errorCode,
  };
}
