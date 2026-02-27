-- Step 0: Run this in Supabase SQL Editor BEFORE building the frontend.
-- Refreshes ub_analytics_hub so Resource Comparison chart has total_staff, total_faculties, total_departments.
-- Prevents dashboard white-screen when frontend fetches from this view.

CREATE OR REPLACE VIEW public.ub_analytics_hub AS
SELECT
  u.id AS university_id,
  u.name AS university_name,
  LEFT(u.name, 20) AS university_short_name,
  COALESCE(staff_counts.total_staff, 0)::int AS total_staff,
  COALESCE(faculty_counts.total_faculties, 0)::int AS total_faculties,
  COALESCE(dept_counts.total_departments, 0)::int AS total_departments,
  (SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.university_id = u.id AND p.role = 'UFP'
  )) AS has_focal_person,
  CASE
    WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.university_id = u.id AND p.role = 'UFP')
    THEN 'Active'
    ELSE 'Setup Pending'
  END AS setup_status,
  0 AS active_boards,
  0 AS expired_boards
FROM public.universities u
LEFT JOIN (
  SELECT university_id, COUNT(*) AS total_staff
  FROM public.staff
  GROUP BY university_id
) staff_counts ON staff_counts.university_id = u.id
LEFT JOIN (
  SELECT university_id, COUNT(*) AS total_faculties
  FROM public.faculties
  GROUP BY university_id
) faculty_counts ON faculty_counts.university_id = u.id
LEFT JOIN (
  SELECT university_id, COUNT(*) AS total_departments
  FROM public.departments
  GROUP BY university_id
) dept_counts ON dept_counts.university_id = u.id;

COMMENT ON VIEW public.ub_analytics_hub IS 'Analytics view for UB Admin dashboard: per-university staff, faculty, department counts and setup status. Run this migration before deploying dashboard changes that depend on total_faculties/total_departments.';
