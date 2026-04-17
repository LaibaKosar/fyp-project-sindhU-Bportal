-- Department-level safe cascade delete for UFP workflow.
-- Deletes all rows scoped to one department only.

CREATE OR REPLACE FUNCTION public.delete_department_cascade(target_dept_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_university_id uuid;
  dept_university_id uuid;
  fk_child record;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Keep auth narrow to the FacultyDetail UFP flow.
  SELECT p.university_id
  INTO caller_university_id
  FROM public.profiles p
  WHERE p.id = caller_id
    AND p.role = 'UFP';

  IF caller_university_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized to delete departments';
  END IF;

  SELECT d.university_id
  INTO dept_university_id
  FROM public.departments d
  WHERE d.id = target_dept_id;

  IF dept_university_id IS NULL THEN
    RAISE EXCEPTION 'Department not found';
  END IF;

  IF caller_university_id <> dept_university_id THEN
    RAISE EXCEPTION 'Not authorized for this department';
  END IF;

  -- Indirect dependency: enrollment reports are linked through programs.
  DELETE FROM public.enrollment_reports er
  USING public.programs p
  WHERE er.program_id = p.id
    AND p.department_id = target_dept_id;

  -- Delete all direct FK children that point to departments.id in public schema.
  FOR fk_child IN
    SELECT n.nspname AS schema_name,
           c.relname AS table_name,
           a.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY AS keys(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = keys.attnum
    WHERE con.contype = 'f'
      AND con.confrelid = 'public.departments'::regclass
      AND n.nspname = 'public'
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I WHERE %I = $1',
      fk_child.schema_name,
      fk_child.table_name,
      fk_child.column_name
    )
    USING target_dept_id;
  END LOOP;

  -- Delete the department itself last.
  DELETE FROM public.departments d
  WHERE d.id = target_dept_id
    AND d.university_id = dept_university_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Department deletion failed';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_department_cascade(uuid) TO authenticated;
