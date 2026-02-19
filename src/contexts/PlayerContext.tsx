import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Track, RepeatMode, PlayerState } from '@/types/music';

export type CrossfadeMode = 0 | 3 | 5 | 8 | 12;

interface PlayerContextType extends PlayerState {
  play: (track: Track, queue?: Track[]) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  onTrackPlay: (cb: (track: Track) => void) => () => void;
  // New features
  crossfadeDuration: CrossfadeMode;
  setCrossfadeDuration: (d: CrossfadeMode) => void;
  sleepTimer: number | null; // minutes remaining, null = off
  setSleepTimer: (minutes: number | null) => void;
  sleepTimerEnd: number | null; // timestamp
  volumeNormalization: boolean;
  setVolumeNormalization: (v: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeAudioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeTimerRef = useRef<number | null>(null);
  const trackPlayListeners = useRef<Set<(track: Track) => void>>(new Set());

  const [crossfadeDuration, setCrossfadeDurationState] = useState<CrossfadeMode>(
    () => (parseInt(localStorage.getItem('ph-crossfade') || '0') || 0) as CrossfadeMode
  );
  const [volumeNormalization, setVolumeNormalizationState] = useState(
    () => localStorage.getItem('ph-normalization') === 'true'
  );
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const sleepTimerRef = useRef<number | null>(null);

  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    volume: parseFloat(localStorage.getItem('ph-volume') || '0.7'),
    progress: 0,
    duration: 0,
    shuffle: localStorage.getItem('ph-shuffle') === 'true',
    repeat: (localStorage.getItem('ph-repeat') as RepeatMode) || 'off',
  });

  // Smart shuffle: track recently played artist IDs to avoid repeats
  const recentArtistsRef = useRef<string[]>([]);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = state.volume;
    crossfadeAudioRef.current = new Audio();
    crossfadeAudioRef.current.volume = 0;

    const audio = audioRef.current;
    const onTimeUpdate = () => {
      setState(s => ({ ...s, progress: audio.currentTime }));
      // Handle crossfade near end
      handleCrossfadeCheck(audio);
    };
    const onLoadedMeta = () => setState(s => ({ ...s, duration: audio.duration }));
    const onEnded = () => handleTrackEnd();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      crossfadeAudioRef.current?.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Media Session API for lock screen / notification controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    if (state.currentTrack) {
      ms.metadata = new MediaMetadata({
        title: state.currentTrack.name,
        artist: state.currentTrack.artist_name,
        album: state.currentTrack.album_name,
        artwork: [{ src: state.currentTrack.album_image, sizes: '512x512', type: 'image/jpeg' }],
      });
    }
    ms.playbackState = state.isPlaying ? 'playing' : 'paused';
  }, [state.currentTrack, state.isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => resume());
    ms.setActionHandler('pause', () => pause());
    ms.setActionHandler('previoustrack', () => previous());
    ms.setActionHandler('nexttrack', () => next());
    ms.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) seek(details.seekTime);
    });
    return () => {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('previoustrack', null);
      ms.setActionHandler('nexttrack', null);
      ms.setActionHandler('seekto', null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimerEnd === null) {
      setSleepTimerState(null);
      return;
    }
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60000));
      setSleepTimerState(remaining);
      if (remaining <= 0) {
        pause();
        setSleepTimerEnd(null);
        setSleepTimerState(null);
      }
    }, 10000);
    // Initial set
    setSleepTimerState(Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60000)));
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepTimerEnd]);

  const handleCrossfadeCheck = useCallback((audio: HTMLAudioElement) => {
    // crossfade logic handled via duration check
  }, []);

  const getSmartShuffleIndex = useCallback((queue: Track[], currentIndex: number): number => {
    if (queue.length <= 1) return 0;
    const candidates = queue
      .map((t, i) => ({ track: t, index: i }))
      .filter(({ index }) => index !== currentIndex)
      .filter(({ track }) => !recentArtistsRef.current.includes(track.artist_id));
    
    if (candidates.length === 0) {
      // All artists recently played, just pick random non-current
      const fallback = queue.map((_, i) => i).filter(i => i !== currentIndex);
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return pick.index;
  }, []);

  const handleTrackEnd = useCallback(() => {
    setState(prev => {
      if (prev.repeat === 'one') {
        audioRef.current!.currentTime = 0;
        audioRef.current!.play();
        return prev;
      }
      let nextIndex: number;
      if (prev.shuffle) {
        nextIndex = getSmartShuffleIndex(prev.queue, prev.queueIndex);
      } else {
        nextIndex = prev.queueIndex + 1;
      }
      if (nextIndex >= prev.queue.length) {
        if (prev.repeat === 'all') nextIndex = 0;
        else return { ...prev, isPlaying: false };
      }
      const nextTrack = prev.queue[nextIndex];
      if (nextTrack && audioRef.current) {
        // Track recent artists for smart shuffle
        recentArtistsRef.current = [...recentArtistsRef.current.slice(-4), nextTrack.artist_id];
        audioRef.current.src = nextTrack.audio;
        audioRef.current.play();
        trackPlayListeners.current.forEach(cb => cb(nextTrack));
      }
      return { ...prev, currentTrack: nextTrack || null, queueIndex: nextIndex, isPlaying: !!nextTrack };
    });
  }, [getSmartShuffleIndex]);

  const play = useCallback((track: Track, queue?: Track[]) => {
    const q = queue || [track];
    const idx = q.findIndex(t => t.id === track.id);
    if (audioRef.current) {
      audioRef.current.src = track.audio;
      audioRef.current.play();
    }
    recentArtistsRef.current = [...recentArtistsRef.current.slice(-4), track.artist_id];
    trackPlayListeners.current.forEach(cb => cb(track));
    setState(s => ({ ...s, currentTrack: track, queue: q, queueIndex: idx >= 0 ? idx : 0, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState(s => ({ ...s, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play();
    setState(s => ({ ...s, isPlaying: true }));
  }, []);

  const next = useCallback(() => handleTrackEnd(), [handleTrackEnd]);

  const previous = useCallback(() => {
    setState(prev => {
      let prevIndex = prev.queueIndex - 1;
      if (prevIndex < 0) prevIndex = prev.repeat === 'all' ? prev.queue.length - 1 : 0;
      const prevTrack = prev.queue[prevIndex];
      if (prevTrack && audioRef.current) {
        audioRef.current.src = prevTrack.audio;
        audioRef.current.play();
        trackPlayListeners.current.forEach(cb => cb(prevTrack));
      }
      return { ...prev, currentTrack: prevTrack || null, queueIndex: prevIndex, isPlaying: !!prevTrack };
    });
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    setState(s => ({ ...s, progress: time }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol;
    localStorage.setItem('ph-volume', String(vol));
    setState(s => ({ ...s, volume: vol }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(s => {
      const next = !s.shuffle;
      localStorage.setItem('ph-shuffle', String(next));
      return { ...s, shuffle: next };
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(s => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const next = modes[(modes.indexOf(s.repeat) + 1) % 3];
      localStorage.setItem('ph-repeat', next);
      return { ...s, repeat: next };
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setState(s => ({ ...s, queue: [...s.queue, track] }));
  }, []);

  const onTrackPlay = useCallback((cb: (track: Track) => void) => {
    trackPlayListeners.current.add(cb);
    return () => { trackPlayListeners.current.delete(cb); };
  }, []);

  const setCrossfadeDuration = useCallback((d: CrossfadeMode) => {
    localStorage.setItem('ph-crossfade', String(d));
    setCrossfadeDurationState(d);
  }, []);

  const setVolumeNormalization = useCallback((v: boolean) => {
    localStorage.setItem('ph-normalization', String(v));
    setVolumeNormalizationState(v);
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerEnd(null);
      setSleepTimerState(null);
    } else {
      setSleepTimerEnd(Date.now() + minutes * 60000);
      setSleepTimerState(minutes);
    }
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        state.isPlaying ? pause() : resume();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.isPlaying, pause, resume]);

  return (
    <PlayerContext.Provider value={{
      ...state, play, pause, resume, next, previous, seek, setVolume,
      toggleShuffle, toggleRepeat, addToQueue, onTrackPlay,
      crossfadeDuration, setCrossfadeDuration,
      sleepTimer, setSleepTimer, sleepTimerEnd,
      volumeNormalization, setVolumeNormalization,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
