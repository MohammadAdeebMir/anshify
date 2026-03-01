
-- Jam sessions table for real-time collaborative listening
CREATE TABLE public.jam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Jam Session',
  current_track_id text,
  current_track_data jsonb,
  is_playing boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jam_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active jam sessions (needed to join)
CREATE POLICY "Authenticated users can view active jams"
  ON public.jam_sessions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Host can create jam sessions
CREATE POLICY "Users can create jam sessions"
  ON public.jam_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Host can update their jam sessions
CREATE POLICY "Hosts can update their jams"
  ON public.jam_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id);

-- Host can delete their jam sessions
CREATE POLICY "Hosts can delete their jams"
  ON public.jam_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- Jam participants table
CREATE TABLE public.jam_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jam_id uuid NOT NULL REFERENCES public.jam_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(jam_id, user_id)
);

ALTER TABLE public.jam_participants ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view participants
CREATE POLICY "Authenticated users can view participants"
  ON public.jam_participants FOR SELECT
  TO authenticated
  USING (true);

-- Users can join jams
CREATE POLICY "Users can join jams"
  ON public.jam_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can leave jams
CREATE POLICY "Users can leave jams"
  ON public.jam_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Jam queue table for shared queue
CREATE TABLE public.jam_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jam_id uuid NOT NULL REFERENCES public.jam_sessions(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  track_data jsonb NOT NULL,
  added_by uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jam_queue ENABLE ROW LEVEL SECURITY;

-- Participants can view jam queue
CREATE POLICY "Authenticated users can view jam queue"
  ON public.jam_queue FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can add to jam queue
CREATE POLICY "Users can add to jam queue"
  ON public.jam_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = added_by);

-- Host can manage queue (update/delete)
CREATE POLICY "Host can update jam queue"
  ON public.jam_queue FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jam_sessions WHERE id = jam_queue.jam_id AND host_id = auth.uid()));

CREATE POLICY "Host can delete from jam queue"
  ON public.jam_queue FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jam_sessions WHERE id = jam_queue.jam_id AND host_id = auth.uid()));

-- Enable realtime for jam sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.jam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jam_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jam_participants;

-- Add trigger for updated_at on jam_sessions
CREATE TRIGGER update_jam_sessions_updated_at
  BEFORE UPDATE ON public.jam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
