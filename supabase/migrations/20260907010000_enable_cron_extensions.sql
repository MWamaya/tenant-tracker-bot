-- Enables pg_cron and pg_net (both available on this project, not yet
-- turned on) and schedules the daily monthly-report check. No secret
-- value appears in this file: the cron job references a Vault secret by
-- name only. The secret itself (the service_role key, used so pg_net's
-- request is authorized to invoke the function) is created once via a
-- direct SQL statement run against the project, never committed — see
-- the plan's Task 7 for the exact one-time command.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'send-monthly-reports-daily',
  '0 6 * * *', -- 06:00 UTC = 09:00 EAT, comfortably clear of any day boundary
  $$
  SELECT net.http_post(
    url := 'https://nwhbkepmchszucccyjqy.supabase.co/functions/v1/send-monthly-reports',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'send_monthly_reports_service_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
