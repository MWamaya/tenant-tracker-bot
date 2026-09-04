-- Guard against direct/unauthorized writes to profiles.account_status and
-- profiles.sms_token_balance.
--
-- The "Users can update their own profile" RLS policy (UPDATE, USING only,
-- no WITH CHECK, no column restriction) lets any authenticated landlord
-- update any column on their own profile row via the client SDK. account_status
-- gates subscription/billing state and sms_token_balance is a purchasable
-- credit balance — both are meant to be written only by:
--   1. A SUPER_ADMIN (via the admin UI, e.g. activating/suspending a
--      landlord or crediting SMS tokens), or
--   2. Backend/service-role operations (edge functions, migrations), which
--      run with no authenticated user context.
--
-- Without this guard, a landlord can bypass subscription gating entirely
-- (PATCH account_status to 'active') or grant themselves free SMS credits
-- (PATCH sms_token_balance to any value) directly from the browser.
CREATE OR REPLACE FUNCTION public.protect_account_status_and_sms_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- No-op fast path: most updates to profiles don't touch these columns.
  IF NEW.account_status IS NOT DISTINCT FROM OLD.account_status
     AND NEW.sms_token_balance IS NOT DISTINCT FROM OLD.sms_token_balance THEN
    RETURN NEW;
  END IF;

  -- Case 1: acting user is a super admin.
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'SUPER_ADMIN') THEN
    RETURN NEW;
  END IF;

  -- Case 2: backend/service-role operations have no authenticated user.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'account_status and sms_token_balance can only be set by the system or a super admin';
END;
$$;

CREATE TRIGGER zz_protect_account_status_and_sms_balance_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_account_status_and_sms_balance();
