-- Lets a landlord permanently clear a Needs Review row that shouldn't be
-- auto-matched (e.g. a duplicate, a one-off they've handled outside the
-- app) without it having to become a payment first.
ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_status_check;
ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_status_check
  CHECK (status IN ('pending', 'processed', 'failed', 'dismissed'));

ALTER TABLE public.payments
  ADD COLUMN reconciliation_dismissed boolean NOT NULL DEFAULT false;
