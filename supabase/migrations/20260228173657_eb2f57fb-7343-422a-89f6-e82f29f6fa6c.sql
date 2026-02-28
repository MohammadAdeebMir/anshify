
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Replace with authenticated-only policy
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
