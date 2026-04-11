-- Activity feed for U&B Governance Command Center: UFP writes, U&B_ADMIN reads.

CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities (id) ON DELETE CASCADE,
  university_name text NOT NULL,
  action_type text NOT NULL,
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS system_logs_created_at_idx ON public.system_logs (created_at DESC);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UFP can insert system logs for own university"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'UFP'
      AND p.university_id = system_logs.university_id
  )
);

CREATE POLICY "U&B Admin can read all system logs"
ON public.system_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'U&B_ADMIN'
  )
);

COMMENT ON TABLE public.system_logs IS 'Append-only activity from UFP actions; consumed by U&B dashboard system logs.';

GRANT SELECT, INSERT ON public.system_logs TO authenticated;
