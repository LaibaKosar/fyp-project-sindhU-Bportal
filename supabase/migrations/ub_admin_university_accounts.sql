-- U&B Admin: University Accounts page
-- 1) RLS so U&B_ADMIN can read and update UFP profiles (for Lock).
-- 2) RPC delete_university_cascade for safe deletion in FK order.
-- If you have programs, university_boards, board_members, committees, enrollment_reports, etc.,
-- add DELETE statements in the function in the correct FK order (children before parents).

-- Allow U&B Admin to read UFP profiles (for University Accounts table)
CREATE POLICY "U&B Admin can read UFP profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (role = 'UFP' AND university_id IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'U&B_ADMIN'
  )
);

-- Allow U&B Admin to update UFP profiles (for Lock toggle)
CREATE POLICY "U&B Admin can update UFP profiles for lock"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  role = 'UFP' AND university_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'U&B_ADMIN'
  )
)
WITH CHECK (
  role = 'UFP' AND university_id IS NOT NULL
);

-- Allow U&B Admin to read ub_analytics_hub (for staff count in delete modal)
-- Views use the underlying table RLS; if the view is not security invoker, we may need:
GRANT SELECT ON public.ub_analytics_hub TO authenticated;

-- Cascade delete: only callable by U&B_ADMIN; deletes in FK-safe order.
CREATE OR REPLACE FUNCTION public.delete_university_cascade(p_university_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only U&B Admin may run this
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'U&B_ADMIN'
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete universities';
  END IF;

  -- Idempotent: if university already missing, no-op
  IF NOT EXISTS (SELECT 1 FROM public.universities WHERE id = p_university_id) THEN
    RETURN;
  END IF;

  -- Delete in child-before-parent order to avoid FK violations.
  -- Adjust or add tables to match your schema (e.g. programs, committees, board_members).

  DELETE FROM public.staff
  WHERE university_id = p_university_id;

  DELETE FROM public.meetings
  WHERE university_id = p_university_id;

  -- Departments may reference faculty_id; delete departments for this university's faculties
  DELETE FROM public.departments
  WHERE university_id = p_university_id
     OR faculty_id IN (SELECT id FROM public.faculties WHERE university_id = p_university_id);

  DELETE FROM public.faculties
  WHERE university_id = p_university_id;

  DELETE FROM public.campuses
  WHERE university_id = p_university_id;

  -- Unlink UFP profiles from this university (do not delete auth users)
  UPDATE public.profiles
  SET university_id = NULL
  WHERE university_id = p_university_id;

  DELETE FROM public.universities
  WHERE id = p_university_id;
END;
$$;

COMMENT ON FUNCTION public.delete_university_cascade(uuid) IS 'U&B Admin only: deletes a university and all related data in FK-safe order. Run from frontend after type-to-confirm.';

GRANT EXECUTE ON FUNCTION public.delete_university_cascade(uuid) TO authenticated;
