-- UFP / Auth cleanup: see orphan profiles in admin UI; delete focal Auth users when university is removed.
-- Run in Supabase SQL Editor after other ub_admin migrations if DELETE FROM auth.users fails (permissions),
-- remove that block and delete users manually from Authentication → Users.

-- 1) U&B Admin can read ALL UFP rows (including university_id IS NULL after old unlink behavior).
DROP POLICY IF EXISTS "U&B Admin can read UFP profiles" ON public.profiles;

CREATE POLICY "U&B Admin can read UFP profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'UFP'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'U&B_ADMIN'
  )
);

-- 2) Replace cascade delete: parameter name target_uni_id (matches PostgREST / frontend RPC).
CREATE OR REPLACE FUNCTION public.delete_university_cascade(target_uni_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'U&B_ADMIN'
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete universities';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.universities WHERE id = target_uni_id) THEN
    RETURN;
  END IF;

  DELETE FROM public.staff
  WHERE university_id = target_uni_id;

  DELETE FROM public.meetings
  WHERE university_id = target_uni_id;

  DELETE FROM public.departments
  WHERE university_id = target_uni_id
     OR faculty_id IN (SELECT id FROM public.faculties WHERE university_id = target_uni_id);

  DELETE FROM public.faculties
  WHERE university_id = target_uni_id;

  DELETE FROM public.campuses
  WHERE university_id = target_uni_id;

  -- Remove focal-person Auth accounts (and linked profiles, per your FK/CASCADE setup).
  DELETE FROM auth.users
  WHERE id IN (
    SELECT p.id FROM public.profiles p
    WHERE p.university_id = target_uni_id AND p.role = 'UFP'
  );

  DELETE FROM public.universities
  WHERE id = target_uni_id;
END;
$$;

COMMENT ON FUNCTION public.delete_university_cascade(uuid) IS 'U&B Admin: deletes university data, removes UFP auth users for that university, then deletes the university row.';

GRANT EXECUTE ON FUNCTION public.delete_university_cascade(uuid) TO authenticated;
