import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Track, RepeatMode, PlayerState } from '@/types/music';
import { getStreamUrl, needsStreamResolution, preBufferTrack } from '@/services/ytmusic';

export type CrossfadeMode = 0 | 3 | 5 | 8 | 12;

interface QueueHistoryEntry {
  queue: Track[];
  queueIndex: number;
  timestamp: number;
}

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
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  queueHistory: QueueHistoryEntry[];
  onTrackPlay: (cb: (track: Track) => void) => () => void;
  crossfadeDuration: CrossfadeMode;
  setCrossfadeDuration: (d: CrossfadeMode) => void;
  sleepTimer: number | null;
  setSleepTimer: (minutes: number | null) => void;
  sleepTimerEnd: number | null;
  volumeNormalization: boolean;
  setVolumeNormalization: (v: boolean) => void;
  // Visualizer
  analyserNode: AnalyserNode | null;
  visualizerEnabled: boolean;
  setVisualizerEnabled: (v: boolean) => void;
  // Workout
  workoutMode: boolean;
  setWorkoutMode: (v: boolean) => void;
  targetBPM: number;
  setTargetBPM: (bpm: number) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};

// Persist queue to localStorage
const QUEUE_KEY = 'ph-queue';
const QUEUE_INDEX_KEY = 'ph-queue-index';
const QUEUE_TRACK_KEY = 'ph-queue-track';

function saveQueue(queue: Track[], index: number, track: Track | null) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, 200)));
    localStorage.setItem(QUEUE_INDEX_KEY, String(index));
    if (track) localStorage.setItem(QUEUE_TRACK_KEY, JSON.stringify(track));
  } catch { /* quota exceeded */ }
}

function loadQueue(): { queue: Track[]; queueIndex: number; currentTrack: Track | null } {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const idx = parseInt(localStorage.getItem(QUEUE_INDEX_KEY) || '-1');
    const t = JSON.parse(localStorage.getItem(QUEUE_TRACK_KEY) || 'null');
    return { queue: q, queueIndex: idx, currentTrack: t };
  } catch {
    return { queue: [], queueIndex: -1, currentTrack: null };
  }
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeAudioRef = useRef<HTMLAudioElement | null>(null);
  const trackPlayListeners = useRef<Set<(track: Track) => void>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [crossfadeDuration, setCrossfadeDurationState] = useState<CrossfadeMode>(
    () => (parseInt(localStorage.getItem('ph-crossfade') || '0') || 0) as CrossfadeMode
  );
  const [volumeNormalization, setVolumeNormalizationState] = useState(
    () => localStorage.getItem('ph-normalization') === 'true'
  );
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const [queueHistory, setQueueHistory] = useState<QueueHistoryEntry[]>([]);
  const [visualizerEnabled, setVisualizerEnabledState] = useState(false);
  const [workoutMode, setWorkoutModeState] = useState(false);
  const [targetBPM, setTargetBPMState] = useState(120);

  const savedQueue = loadQueue();

  const [state, setState] = useState<PlayerState>({
    currentTrack: savedQueue.currentTrack,
    queue: savedQueue.queue,
    queueIndex: savedQueue.queueIndex,
    isPlaying: false,
    volume: parseFloat(localStorage.getItem('ph-volume') || '0.7'),
    progress: 0,
    duration: 0,
    shuffle: localStorage.getItem('ph-shuffle') === 'true',
    repeat: (localStorage.getItem('ph-repeat') as RepeatMode) || 'off',
  });

  const recentArtistsRef = useRef<string[]>([]);

  // Setup audio + analyser
  useEffect(() => {
    const audio = new Audio();
    audio.volume = state.volume;
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    crossfadeAudioRef.current = new Audio();
    crossfadeAudioRef.current.volume = 0;

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
      crossfadeAudioRef.current?.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup analyser on demand
  useEffect(() => {
    if (!visualizerEnabled || !audioRef.current) {
      analyserRef.current = null;
      return;
    }
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioRef.current);
      }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      sourceRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    } catch {
      analyserRef.current = null;
    }
  }, [visualizerEnabled]);

  // Media Session API
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
    ms.setActionHandler('seekto', (details) => { if (details.seekTime != null) seek(details.seekTime); });
    return () => {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('previoustrack', null);
      ms.setActionHandler('nexttrack', null);
      ms.setActionHandler('seekto', null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sleep timer
  useEffect(() => {
    if (sleepTimerEnd === null) { setSleepTimerState(null); return; }
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60000));
      setSleepTimerState(remaining);
      if (remaining <= 0) { pause(); setSleepTimerEnd(null); setSleepTimerState(null); }
    }, 10000);
    setSleepTimerState(Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60000)));
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepTimerEnd]);

  // Save queue on change
  useEffect(() => {
    saveQueue(state.queue, state.queueIndex, state.currentTrack);
  }, [state.queue, state.queueIndex, state.currentTrack]);

  const getSmartShuffleIndex = useCallback((queue: Track[], currentIndex: number): number => {
    if (queue.length <= 1) return 0;
    const candidates = queue
      .map((t, i) => ({ track: t, index: i }))
      .filter(({ index }) => index !== currentIndex)
      .filter(({ track }) => !recentArtistsRef.current.includes(track.artist_id));
    if (candidates.length === 0) {
      const fallback = queue.map((_, i) => i).filter(i => i !== currentIndex);
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)].index;
  }, []);

  const resolveAndPlay = useCallback(async (track: Track, audio: HTMLAudioElement) => {
    try {
      let src = track.audio;
      if (needsStreamResolution(track)) {
        src = await getStreamUrl(track.id);
      }
      audio.src = src;
      await audio.play();
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
    } catch (err) {
      // Auto-retry once
      try {
        const src = await getStreamUrl(track.id);
        audio.src = src;
        await audio.play();
      } catch {
        console.error('Playback failed after retry', err);
        setState(s => ({ ...s, isPlaying: false }));
      }
    }
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
        recentArtistsRef.current = [...recentArtistsRef.current.slice(-4), nextTrack.artist_id];
        resolveAndPlay(nextTrack, audioRef.current);
        trackPlayListeners.current.forEach(cb => cb(nextTrack));
      }
      return { ...prev, currentTrack: nextTrack || null, queueIndex: nextIndex, isPlaying: !!nextTrack };
    });
  }, [getSmartShuffleIndex, resolveAndPlay]);

  const play = useCallback((track: Track, queue?: Track[]) => {
    const q = queue || [track];
    const idx = q.findIndex(t => t.id === track.id);
    recentArtistsRef.current = [...recentArtistsRef.current.slice(-4), track.artist_id];
    trackPlayListeners.current.forEach(cb => cb(track));
    setState(s => {
      if (s.queue.length > 0) {
        setQueueHistory(h => [...h.slice(-9), { queue: s.queue, queueIndex: s.queueIndex, timestamp: Date.now() }]);
      }
      return { ...s, currentTrack: track, queue: q, queueIndex: idx >= 0 ? idx : 0, isPlaying: true };
    });
    if (audioRef.current) {
      resolveAndPlay(track, audioRef.current);
    }
    // Pre-buffer next track
    const nextIdx = idx + 1;
    if (nextIdx < q.length && needsStreamResolution(q[nextIdx])) {
      preBufferTrack(q[nextIdx].id);
    }
  }, [resolveAndPlay]);

  const pause = useCallback(() => { audioRef.current?.pause(); setState(s => ({ ...s, isPlaying: false })); }, []);
  const resume = useCallback(() => {
    audioRef.current?.play();
    if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
    setState(s => ({ ...s, isPlaying: true }));
  }, []);
  const next = useCallback(() => handleTrackEnd(), [handleTrackEnd]);

  const previous = useCallback(() => {
    setState(prev => {
      let prevIndex = prev.queueIndex - 1;
      if (prevIndex < 0) prevIndex = prev.repeat === 'all' ? prev.queue.length - 1 : 0;
      const prevTrack = prev.queue[prevIndex];
      if (prevTrack && audioRef.current) {
        resolveAndPlay(prevTrack, audioRef.current);
        trackPlayListeners.current.forEach(cb => cb(prevTrack));
      }
      return { ...prev, currentTrack: prevTrack || null, queueIndex: prevIndex, isPlaying: !!prevTrack };
    });
  }, [resolveAndPlay]);

  const seek = useCallback((time: number) => { if (audioRef.current) audioRef.current.currentTime = time; setState(s => ({ ...s, progress: time })); }, []);
  const setVolume = useCallback((vol: number) => { if (audioRef.current) audioRef.current.volume = vol; localStorage.setItem('ph-volume', String(vol)); setState(s => ({ ...s, volume: vol })); }, []);
  const toggleShuffle = useCallback(() => { setState(s => { const next = !s.shuffle; localStorage.setItem('ph-shuffle', String(next)); return { ...s, shuffle: next }; }); }, []);
  const toggleRepeat = useCallback(() => { setState(s => { const modes: RepeatMode[] = ['off', 'all', 'one']; const next = modes[(modes.indexOf(s.repeat) + 1) % 3]; localStorage.setItem('ph-repeat', next); return { ...s, repeat: next }; }); }, []);

  const addToQueue = useCallback((track: Track) => {
    setState(s => ({ ...s, queue: [...s.queue, track] }));
  }, []);

  const playNext = useCallback((track: Track) => {
    setState(s => {
      const newQueue = [...s.queue];
      newQueue.splice(s.queueIndex + 1, 0, track);
      return { ...s, queue: newQueue };
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setState(s => {
      if (index === s.queueIndex) return s; // don't remove current
      const newQueue = s.queue.filter((_, i) => i !== index);
      const newIndex = index < s.queueIndex ? s.queueIndex - 1 : s.queueIndex;
      return { ...s, queue: newQueue, queueIndex: newIndex };
    });
  }, []);

  const reorderQueue = useCallback((from: number, to: number) => {
    setState(s => {
      const newQueue = [...s.queue];
      const [moved] = newQueue.splice(from, 1);
      newQueue.splice(to, 0, moved);
      let newIndex = s.queueIndex;
      if (from === s.queueIndex) newIndex = to;
      else if (from < s.queueIndex && to >= s.queueIndex) newIndex--;
      else if (from > s.queueIndex && to <= s.queueIndex) newIndex++;
      return { ...s, queue: newQueue, queueIndex: newIndex };
    });
  }, []);

  const clearQueue = useCallback(() => {
    setState(s => {
      const current = s.currentTrack;
      return { ...s, queue: current ? [current] : [], queueIndex: current ? 0 : -1 };
    });
  }, []);

  const onTrackPlay = useCallback((cb: (track: Track) => void) => { trackPlayListeners.current.add(cb); return () => { trackPlayListeners.current.delete(cb); }; }, []);
  const setCrossfadeDuration = useCallback((d: CrossfadeMode) => { localStorage.setItem('ph-crossfade', String(d)); setCrossfadeDurationState(d); }, []);
  const setVolumeNormalization = useCallback((v: boolean) => { localStorage.setItem('ph-normalization', String(v)); setVolumeNormalizationState(v); }, []);
  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) { setSleepTimerEnd(null); setSleepTimerState(null); }
    else { setSleepTimerEnd(Date.now() + minutes * 60000); setSleepTimerState(minutes); }
  }, []);

  const setVisualizerEnabled = useCallback((v: boolean) => setVisualizerEnabledState(v), []);
  const setWorkoutMode = useCallback((v: boolean) => setWorkoutModeState(v), []);
  const setTargetBPM = useCallback((bpm: number) => setTargetBPMState(bpm), []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); state.isPlaying ? pause() : resume(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.isPlaying, pause, resume]);

  return (
    <PlayerContext.Provider value={{
      ...state, play, pause, resume, next, previous, seek, setVolume,
      toggleShuffle, toggleRepeat, addToQueue, playNext, removeFromQueue, reorderQueue, clearQueue, queueHistory, onTrackPlay,
      crossfadeDuration, setCrossfadeDuration,
      sleepTimer, setSleepTimer, sleepTimerEnd,
      volumeNormalization, setVolumeNormalization,
      analyserNode: analyserRef.current,
      visualizerEnabled, setVisualizerEnabled,
      workoutMode, setWorkoutMode, targetBPM, setTargetBPM,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
