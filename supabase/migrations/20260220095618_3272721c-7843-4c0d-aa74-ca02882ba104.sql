
-- Create broadcast notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can READ notifications
CREATE POLICY "Anyone can read notifications"
  ON public.notifications
  FOR SELECT
  USING (true);

-- Nobody can insert/update/delete via client (admin edge function only)
-- No INSERT/UPDATE/DELETE policies — only service role key (edge function) can write

-- Track which users have dismissed which notifications
CREATE TABLE public.notification_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_id)
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reads"
  ON public.notification_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reads"
  ON public.notification_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);
