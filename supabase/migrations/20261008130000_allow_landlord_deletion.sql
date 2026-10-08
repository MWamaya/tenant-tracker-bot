-- Deleting a landlord (auth.users row) cascades through every landlord_id
-- FK already, except these two, which point at profiles with no ON DELETE
-- action and would RESTRICT the delete:
--   - audit_logs.admin_id (NOT NULL) — rows where the landlord acted on
--     their own account, e.g. SUBSCRIPTION_ACTIVATED_MPESA.
--   - webhooks_log.landlord_id — already nullable.
-- Nullify both on delete instead of cascading, so the audit/webhook trail
-- survives the landlord being removed.

ALTER TABLE public.audit_logs
  ALTER COLUMN admin_id DROP NOT NULL,
  DROP CONSTRAINT audit_logs_admin_id_fkey,
  ADD CONSTRAINT audit_logs_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.webhooks_log
  DROP CONSTRAINT webhooks_log_landlord_id_fkey,
  ADD CONSTRAINT webhooks_log_landlord_id_fkey
    FOREIGN KEY (landlord_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
