
-- Liked songs table
CREATE TABLE public.liked_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  artist_id TEXT NOT NULL,
  album_name TEXT NOT NULL DEFAULT '',
  album_id TEXT NOT NULL DEFAULT '',
  album_image TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,
  audio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their liked songs"
  ON public.liked_songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can like songs"
  ON public.liked_songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike songs"
  ON public.liked_songs FOR DELETE
  USING (auth.uid() = user_id);

-- Playlists table
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their playlists"
  ON public.playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their playlists"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their playlists"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Playlist songs junction table
CREATE TABLE public.playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  artist_id TEXT NOT NULL,
  album_name TEXT NOT NULL DEFAULT '',
  album_id TEXT NOT NULL DEFAULT '',
  album_image TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,
  audio TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their playlist songs"
  ON public.playlist_songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add songs to playlists"
  ON public.playlist_songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove songs from playlists"
  ON public.playlist_songs FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update playlist song order"
  ON public.playlist_songs FOR UPDATE
  USING (auth.uid() = user_id);

-- Recently played table
CREATE TABLE public.recently_played (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  artist_id TEXT NOT NULL,
  album_name TEXT NOT NULL DEFAULT '',
  album_id TEXT NOT NULL DEFAULT '',
  album_image TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,
  audio TEXT NOT NULL DEFAULT '',
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recently_played ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their recently played"
  ON public.recently_played FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add recently played"
  ON public.recently_played FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their recently played"
  ON public.recently_played FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_liked_songs_user ON public.liked_songs(user_id);
CREATE INDEX idx_playlists_user ON public.playlists(user_id);
CREATE INDEX idx_playlist_songs_playlist ON public.playlist_songs(playlist_id);
CREATE INDEX idx_recently_played_user ON public.recently_played(user_id, played_at DESC);
