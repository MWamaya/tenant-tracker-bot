-- 20261012160000 collapsed the status vocabulary to pending/activated/
-- dismissed and added a CHECK constraint enforcing it, but never updated
-- the column's own DEFAULT — still 'new', which the new constraint
-- rejects. Every onboarding-submit insert (which relies on the default,
-- never sets status explicitly) has been failing since that migration.
ALTER TABLE public.onboarding_requests ALTER COLUMN status SET DEFAULT 'pending';
