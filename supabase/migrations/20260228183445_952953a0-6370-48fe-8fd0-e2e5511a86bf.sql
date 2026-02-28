-- Fix profiles: require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix user_follows: require authentication for SELECT
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can view follows" ON public.user_follows;
-- Find and replace any permissive select policy
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'user_follows' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_follows', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can view follows"
  ON public.user_follows FOR SELECT
  USING (auth.uid() IS NOT NULL);