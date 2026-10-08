-- Lets a landlord prepay several billing cycles at once (3/6/12 months)
-- from the Billing tab, instead of paying every single month. The STK
-- request records how many months were paid for so mpesa-callback can
-- credit the right amount of plan-time and SMS tokens on activation.
ALTER TABLE public.subscription_mpesa_requests
  ADD COLUMN months integer NOT NULL DEFAULT 1 CHECK (months IN (1, 3, 6, 12));
