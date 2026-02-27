-- Per-faculty summary counts for Smart Faculty Cards and hierarchy views.
-- No table changes; RLS on base tables applies when view is queried (security_invoker).

CREATE OR REPLACE VIEW public.faculty_summary
WITH (security_invoker = true)
AS
SELECT
  f.id AS faculty_id,
  COALESCE(dept_cnt.cnt, 0)::int AS departments_count,
  COALESCE(prog_cnt.cnt, 0)::int AS programs_count,
  COALESCE(teach_cnt.cnt, 0)::int AS teaching_staff_count,
  COALESCE(stud_cnt.students, 0)::int AS students_count
FROM public.faculties f
LEFT JOIN (
  SELECT faculty_id, COUNT(*) AS cnt
  FROM public.departments
  GROUP BY faculty_id
) dept_cnt ON dept_cnt.faculty_id = f.id
LEFT JOIN (
  SELECT d.faculty_id, COUNT(p.id) AS cnt
  FROM public.departments d
  JOIN public.programs p ON p.department_id = d.id
  GROUP BY d.faculty_id
) prog_cnt ON prog_cnt.faculty_id = f.id
LEFT JOIN (
  SELECT d.faculty_id, COUNT(s.id) AS cnt
  FROM public.departments d
  JOIN public.staff s ON s.department_id = d.id AND s.type = 'Teaching'
  GROUP BY d.faculty_id
) teach_cnt ON teach_cnt.faculty_id = f.id
LEFT JOIN (
  SELECT d.faculty_id,
    SUM(
      COALESCE(er.total_enrolled, (COALESCE(er.male_students, 0) + COALESCE(er.female_students, 0)))
    )::bigint AS students
  FROM public.departments d
  JOIN public.programs p ON p.department_id = d.id
  LEFT JOIN public.enrollment_reports er ON er.program_id = p.id
  GROUP BY d.faculty_id
) stud_cnt ON stud_cnt.faculty_id = f.id;

COMMENT ON VIEW public.faculty_summary IS 'Per-faculty counts: departments, programs, teaching staff, students (for Smart Faculty Cards and hierarchy).';
