-- Extends ub_analytics_hub with per-university staff gender aggregates from public.staff.gender.
-- Run AFTER ub_analytics_hub_view.sql (this filename sorts later). Apply in Supabase SQL Editor or supabase db push.
-- Gender buckets use case-insensitive matching (male/m, female/f); NULL, blank, 'Prefer not to say', and any other value count toward staff_unknown.

CREATE OR REPLACE VIEW public.ub_analytics_hub AS
SELECT
  u.id AS university_id,
  u.name AS university_name,
  LEFT(u.name, 20) AS university_short_name,
  COALESCE(staff_counts.total_staff, 0)::int AS total_staff,
  COALESCE(faculty_counts.total_faculties, 0)::int AS total_faculties,
  COALESCE(dept_counts.total_departments, 0)::int AS total_departments,
  COALESCE(gender_agg.staff_male, 0)::int AS staff_male,
  COALESCE(gender_agg.staff_female, 0)::int AS staff_female,
  COALESCE(gender_agg.staff_unknown, 0)::int AS staff_unknown,
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
) dept_counts ON dept_counts.university_id = u.id
LEFT JOIN (
  SELECT
    university_id,
    COUNT(*) FILTER (
      WHERE LOWER(TRIM(COALESCE(gender, ''))) IN ('male', 'm')
    )::int AS staff_male,
    COUNT(*) FILTER (
      WHERE LOWER(TRIM(COALESCE(gender, ''))) IN ('female', 'f')
    )::int AS staff_female,
    COUNT(*) FILTER (
      WHERE gender IS NULL
         OR TRIM(COALESCE(gender, '')) = ''
         OR NOT (
           LOWER(TRIM(COALESCE(gender, ''))) IN ('male', 'm', 'female', 'f')
         )
    )::int AS staff_unknown
  FROM public.staff
  GROUP BY university_id
) gender_agg ON gender_agg.university_id = u.id;

COMMENT ON VIEW public.ub_analytics_hub IS 'Analytics: per-university staff/faculty/dept counts, staff gender breakdown (staff_male, staff_female, staff_unknown), UFP setup status.';
