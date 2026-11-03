-- Lead preference only; this does not create a subscription or charge.
alter table public.onboarding_requests
  add column billing_period text not null default 'monthly'
  check (billing_period in ('monthly', 'annual'));
