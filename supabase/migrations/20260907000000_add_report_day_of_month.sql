-- The day of the month (1-28) a landlord's automated report for the
-- previous month is sent. Capped to 28 to avoid invalid dates in short
-- months (February). No guard trigger needed — unlike inbound_email or
-- account_status/sms_token_balance, this is meant to be freely
-- landlord-editable, same as full_name/phone/company_name already are
-- under the existing "Users can update their own profile" policy.
ALTER TABLE public.profiles
ADD COLUMN report_day_of_month smallint NOT NULL DEFAULT 5
  CHECK (report_day_of_month BETWEEN 1 AND 28);
