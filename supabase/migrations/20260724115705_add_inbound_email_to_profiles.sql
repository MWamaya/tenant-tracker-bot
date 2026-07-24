ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS inbound_email TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_inbound_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  suffix INT := 1;
BEGIN
  base_slug := lower(regexp_replace(coalesce(NEW.full_name, ''), '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(trim(base_slug), '\s+', '.', 'g');

  IF base_slug = '' THEN
    base_slug := 'landlord';
  END IF;

  candidate := base_slug || '@kodipap.com';

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE inbound_email = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_slug || suffix::text || '@kodipap.com';
  END LOOP;

  NEW.inbound_email := candidate;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_inbound_email_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
WHEN (
  OLD.account_status IS DISTINCT FROM 'active'
  AND NEW.account_status = 'active'
  AND NEW.inbound_email IS NULL
)
EXECUTE FUNCTION public.generate_inbound_email();
