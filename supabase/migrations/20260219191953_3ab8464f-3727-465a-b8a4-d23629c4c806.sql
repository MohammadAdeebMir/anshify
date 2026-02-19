
-- Listening stats table for AI recommendations
CREATE TABLE public.listening_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  track_id text NOT NULL,
  track_name text NOT NULL,
  artist_name text NOT NULL,
  artist_id text NOT NULL,
  album_name text NOT NULL DEFAULT '',
  genre_tags text[] DEFAULT '{}',
  play_count integer NOT NULL DEFAULT 1,
  last_played_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

ALTER TABLE public.listening_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats" ON public.listening_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON public.listening_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.listening_stats FOR UPDATE USING (auth.uid() = user_id);

-- Shared playlists for social features
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.playlists ADD COLUMN IF NOT EXISTS cover_image text;

-- Allow public playlists to be viewed by anyone
CREATE POLICY "Anyone can view public playlists" ON public.playlists FOR SELECT USING (is_public = true);
CREATE POLICY "Anyone can view songs in public playlists" ON public.playlist_songs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND is_public = true));

-- User follows table
CREATE TABLE public.user_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);

-- Make profiles publicly viewable for social features
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);

-- Listening streaks
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_listen_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_listens integer NOT NULL DEFAULT 0;
