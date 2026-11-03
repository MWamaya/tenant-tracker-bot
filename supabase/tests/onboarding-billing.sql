-- Disposable local database only; fixtures roll back.
\set ON_ERROR_STOP on
begin;
create table public.onboarding_requests (plan text not null);
insert into public.onboarding_requests values ('Legacy');
\ir ../migrations/20261103120000_add_onboarding_billing_period.sql
do $$ begin
  if (select billing_period from public.onboarding_requests where plan='Legacy') <> 'monthly' then
    raise exception 'FAIL: legacy lead did not default monthly';
  end if;
  insert into public.onboarding_requests values ('Annual', 'annual');
  begin
    insert into public.onboarding_requests values ('Invalid', 'weekly');
    raise exception 'FAIL: invalid billing period accepted';
  exception when check_violation then null;
  end;
end $$;
rollback;
\echo 'PASS: legacy billing default and valid period constraint'
