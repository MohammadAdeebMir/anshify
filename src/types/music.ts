export interface Track {
  id: string;
  name: string;
  artist_name: string;
  artist_id: string;
  album_name: string;
  album_id: string;
  album_image: string;
  duration: number;
  audio: string;
  position: number;
}

export interface Album {
  id: string;
  name: string;
  artist_name: string;
  artist_id: string;
  image: string;
  releasedate: string;
  tracks: Track[];
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  joindate: string;
  website: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  tracks?: Track[];
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
}
