-- Run only against a disposable local database; fixtures roll back.
\set ON_ERROR_STOP on
begin;
create schema auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists(select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists(select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists(select from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
\ir ../migrations/20260109105438_69b7d57b-bd78-40c6-9c7b-596db6f62256.sql
\ir ../migrations/20260109115647_a4c51f05-fb69-4b65-88a2-a1cd9402826b.sql
\ir ../migrations/20261103110000_add_rent_mpesa_requests.sql
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into public.rent_mpesa_requests(landlord_id, checkout_request_id, account_reference, amount)
values ('00000000-0000-0000-0000-000000000001', 'checkout-1', 'A1', 10000);
grant usage on schema public, auth to authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$ begin
  if (select count(*) from public.rent_mpesa_requests) <> 0 then raise exception 'FAIL: another landlord can read checkout'; end if;
  begin
    insert into public.rent_mpesa_requests(landlord_id, checkout_request_id, account_reference, amount)
    values (auth.uid(), 'forged', 'A1', 10000);
    raise exception 'FAIL: landlord forged checkout ownership';
  exception when insufficient_privilege then null;
  end;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.rent_mpesa_requests) <> 1 then raise exception 'FAIL: owner cannot read checkout'; end if;
end $$;
reset role;
do $$ begin
  begin
    insert into public.rent_mpesa_requests(landlord_id, checkout_request_id, account_reference, amount)
    values ('00000000-0000-0000-0000-000000000002', 'checkout-1', 'B1', 10000);
    raise exception 'FAIL: duplicate checkout accepted';
  exception when unique_violation then null;
  end;
end $$;
rollback;
\echo 'PASS: rent checkout ownership RLS, write isolation, uniqueness'
