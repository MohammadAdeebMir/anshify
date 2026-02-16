import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Track, RepeatMode, PlayerState } from '@/types/music';

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
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    volume: parseFloat(localStorage.getItem('ph-volume') || '0.7'),
    progress: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off',
  });

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = state.volume;

    const audio = audioRef.current;
    const onTimeUpdate = () => setState(s => ({ ...s, progress: audio.currentTime }));
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrackEnd = useCallback(() => {
    setState(prev => {
      if (prev.repeat === 'one') {
        audioRef.current!.currentTime = 0;
        audioRef.current!.play();
        return prev;
      }
      let nextIndex = prev.queueIndex + 1;
      if (prev.shuffle) {
        nextIndex = Math.floor(Math.random() * prev.queue.length);
      }
      if (nextIndex >= prev.queue.length) {
        if (prev.repeat === 'all') nextIndex = 0;
        else return { ...prev, isPlaying: false };
      }
      const nextTrack = prev.queue[nextIndex];
      if (nextTrack && audioRef.current) {
        audioRef.current.src = nextTrack.audio;
        audioRef.current.play();
      }
      return { ...prev, currentTrack: nextTrack || null, queueIndex: nextIndex, isPlaying: !!nextTrack };
    });
  }, []);

  const play = useCallback((track: Track, queue?: Track[]) => {
    const q = queue || [track];
    const idx = q.findIndex(t => t.id === track.id);
    if (audioRef.current) {
      audioRef.current.src = track.audio;
      audioRef.current.play();
    }
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

  const toggleShuffle = useCallback(() => setState(s => ({ ...s, shuffle: !s.shuffle })), []);

  const toggleRepeat = useCallback(() => {
    setState(s => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const next = modes[(modes.indexOf(s.repeat) + 1) % 3];
      return { ...s, repeat: next };
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setState(s => ({ ...s, queue: [...s.queue, track] }));
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
    <PlayerContext.Provider value={{ ...state, play, pause, resume, next, previous, seek, setVolume, toggleShuffle, toggleRepeat, addToQueue }}>
      {children}
    </PlayerContext.Provider>
  );
};
