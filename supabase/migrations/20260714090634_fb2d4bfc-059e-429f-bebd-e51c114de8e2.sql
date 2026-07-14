ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS statement_start_month smallint,
  ADD COLUMN IF NOT EXISTS statement_start_year integer;