-- Notify a landlord by email when their account becomes active, with their
-- auto-generated forwarding address and setup steps. Without this, nothing
-- ever tells them account activation happened or what to do next — they'd
-- only discover it by going to Settings themselves.
--
-- Fires as an AFTER UPDATE trigger (so it sees the row after
-- generate_inbound_email_trigger has already populated inbound_email) via
-- pg_net, using the same Vault-stored service_role key as the existing
-- send-monthly-reports cron job.
CREATE OR REPLACE FUNCTION public.notify_landlord_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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

CREATE TRIGGER notify_landlord_activation_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (
  OLD.account_status IS DISTINCT FROM 'active'
  AND NEW.account_status = 'active'
  AND NEW.inbound_email IS NOT NULL
)
EXECUTE FUNCTION public.notify_landlord_activation();
