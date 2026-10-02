-- Distinguish deposit payments from rent payments so a tenant's move-in
-- deposit doesn't get pooled into rent arrears math and miscounted as
-- paying ahead on rent.
alter table public.payments
  add column payment_type text not null default 'rent'
  check (payment_type in ('rent', 'deposit'));
