-- Optional: Run in Supabase SQL Editor if U&B Admin cannot see all staff/meetings.
-- Ensures role 'U&B_ADMIN' (or your admin role name) can SELECT all rows from staff and meetings.
-- Adjust the role name if your profiles.role uses a different value.

-- Allow U&B Admin to read all staff (cross-university)
CREATE POLICY "U&B Admin can read all staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'U&B_ADMIN'
  )
);

-- Allow U&B Admin to read all meetings (cross-university)
CREATE POLICY "U&B Admin can read all meetings"
ON public.meetings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'U&B_ADMIN'
  )
);

-- If RLS is enabled on staff/meetings and the above policies conflict with existing ones,
-- you may need to drop or alter existing policies. Check Supabase Dashboard > Authentication > Policies first.
