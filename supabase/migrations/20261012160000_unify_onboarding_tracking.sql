-- Onboarding Requests becomes the single place to see the whole top-of-
-- funnel: leads from the public "Get started" form AND self-serve signups
-- (Auth page), both tracked as the same three statuses: pending, activated,
-- dismissed. Previously self-serve signups left no trace here at all — an
-- admin had to know to go filter the Landlords table by status=pending to
-- even notice someone signed up and never paid.

-- 1. Link a request to the landlord account it results in (nullable — a
-- fresh lead has no account yet). Self-serve signups get this set
-- immediately (see handle_new_user below); admin-created-from-request
-- accounts get it set by admin-create-landlord.
ALTER TABLE public.onboarding_requests ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. A self-serve signup doesn't choose a plan until the Subscribe step
-- that follows account creation, so this can no longer be NOT NULL.
ALTER TABLE public.onboarding_requests ALTER COLUMN plan DROP NOT NULL;

-- 3. Best-effort backfill: link any already-converted request to the
-- landlord account that shares its email.
UPDATE public.onboarding_requests r
SET landlord_id = p.id
FROM public.profiles p
WHERE r.landlord_id IS NULL AND r.email = p.email;

-- 4. Collapse 'new'/'contacted' -> 'pending', 'converted' -> 'activated'.
UPDATE public.onboarding_requests SET status = 'pending' WHERE status IN ('new', 'contacted');
UPDATE public.onboarding_requests SET status = 'activated' WHERE status = 'converted';

ALTER TABLE public.onboarding_requests ADD CONSTRAINT onboarding_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'activated'::text, 'dismissed'::text]));

-- 5. Self-serve signups (NOT admin invites — those have invited_at set)
-- get an onboarding_requests row too, so they show up here as 'pending'
-- instead of being invisible outside the Landlords table.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name, phone, account_status, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'phone',
    'pending',
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'LANDLORD_ADMIN');

  IF NEW.invited_at IS NULL THEN
    INSERT INTO public.onboarding_requests (full_name, email, phone, status, landlord_id)
    VALUES (
      coalesce(NEW.raw_user_meta_data ->> 'full_name', ''),
      NEW.email,
      coalesce(NEW.raw_user_meta_data ->> 'phone', ''),
      'pending',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 6. When a landlord activates (admin action or their own payment — see
-- notify_landlord_activation_trigger), sync their linked request to
-- 'activated' too, so the two views never disagree.
CREATE OR REPLACE FUNCTION public.notify_landlord_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.onboarding_requests
  SET status = 'activated'
  WHERE landlord_id = NEW.id AND status = 'pending';

  PERFORM net.http_post(
    url := 'https://nwhbkepmchszucccyjqy.supabase.co/functions/v1/send-activation-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'send_monthly_reports_service_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('landlordId', NEW.id)
  );
  RETURN NEW;
END;
$$;
