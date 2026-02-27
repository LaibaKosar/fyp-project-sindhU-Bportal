-- Per-department summary counts for department cards (programs, teaching staff, students).
-- No table changes; RLS on base tables applies when view is queried (security_invoker).

CREATE OR REPLACE VIEW public.department_summary
WITH (security_invoker = true)
AS
SELECT
  d.id AS department_id,
  COALESCE(prog_cnt.cnt, 0)::int AS programs_count,
  COALESCE(teach_cnt.cnt, 0)::int AS teaching_staff_count,
  COALESCE(stud_cnt.students, 0)::bigint AS students_count
FROM public.departments d
LEFT JOIN (
  SELECT department_id, COUNT(*) AS cnt
  FROM public.programs
  GROUP BY department_id
) prog_cnt ON prog_cnt.department_id = d.id
LEFT JOIN (
  SELECT department_id, COUNT(*) AS cnt
  FROM public.staff
  WHERE type = 'Teaching'
  GROUP BY department_id
) teach_cnt ON teach_cnt.department_id = d.id
LEFT JOIN (
  SELECT p.department_id,
    SUM(COALESCE(er.total_enrolled, (COALESCE(er.male_students, 0) + COALESCE(er.female_students, 0))))::bigint AS students
  FROM public.programs p
  LEFT JOIN public.enrollment_reports er ON er.program_id = p.id
  GROUP BY p.department_id
) stud_cnt ON stud_cnt.department_id = d.id;

COMMENT ON VIEW public.department_summary IS 'Per-department counts: programs, teaching staff, students (for department cards in Faculty Detail).';
