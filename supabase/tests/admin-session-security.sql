-- Run only in a disposable local database. All fixtures roll back.
\set ON_ERROR_STOP on
begin;
create schema auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
create table auth.sessions (id uuid primary key, user_id uuid references auth.users(id));
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select (auth.jwt()->>'sub')::uuid
$$;
do $$ begin
  if not exists(select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists(select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists(select from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
\ir ../migrations/20260109105438_69b7d57b-bd78-40c6-9c7b-596db6f62256.sql
\ir ../migrations/20260109115647_a4c51f05-fb69-4b65-88a2-a1cd9402826b.sql
\ir ../migrations/20260112135442_b7b28ae5-d47c-4601-8031-909f830f98f8.sql
\ir ../migrations/20261006130305_super_admin_two_factor_auth.sql
\if :apply_hardening
\ir ../migrations/20261103100000_enforce_admin_session_verification.sql
\endif

insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN');
insert into auth.sessions values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'), ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
insert into public.super_admin_two_factor(user_id, enabled) values ('00000000-0000-0000-0000-000000000001', true);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","session_id":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';

do $$ begin
  if public.has_role(auth.uid(), 'SUPER_ADMIN') then raise exception 'FAIL: password session bypassed OTP'; end if;
end $$;

-- Exercise real RLS, not just the helper function.
grant usage on schema auth, public to authenticated;
grant select on public.profiles, public.user_roles to authenticated;
grant all on public.super_admin_two_factor, public.super_admin_verified_sessions to authenticated;
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: unverified admin read another profile'; end if;
  update public.super_admin_two_factor set enabled = false;
  if found then raise exception 'FAIL: unverified session disabled OTP'; end if;
  begin
    insert into public.super_admin_verified_sessions(session_id, user_id)
    values ('10000000-0000-0000-0000-000000000001', auth.uid());
    raise exception 'FAIL: user forged session verification';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.verify_super_admin_otp(auth.uid(), '10000000-0000-0000-0000-000000000001', 'correct');
    raise exception 'FAIL: user invoked service-only verification';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

insert into public.super_admin_otp_codes(user_id, session_id, code_hash, method, expires_at)
values ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'correct', 'email', now() + interval '10 minutes');
do $$ begin
  if public.verify_super_admin_otp(auth.uid(), '10000000-0000-0000-0000-000000000002', 'correct') then raise exception 'FAIL: code accepted for another session'; end if;
  if public.verify_super_admin_otp(auth.uid(), '10000000-0000-0000-0000-000000000001', 'wrong') then raise exception 'FAIL: wrong code accepted'; end if;
  if not public.verify_super_admin_otp(auth.uid(), '10000000-0000-0000-0000-000000000001', 'correct') then raise exception 'FAIL: valid code rejected'; end if;
  if not public.has_role(auth.uid(), 'SUPER_ADMIN') then raise exception 'FAIL: verified session denied'; end if;
  if public.verify_super_admin_otp(auth.uid(), '10000000-0000-0000-0000-000000000001', 'correct') then raise exception 'FAIL: code replay accepted'; end if;
end $$;
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles) <> 2 then raise exception 'FAIL: verified admin cannot read profiles'; end if;
end $$;
reset role;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","session_id":"10000000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$ begin
  if public.has_role(auth.uid(), 'SUPER_ADMIN') then raise exception 'FAIL: second session inherited verification'; end if;
end $$;
insert into public.super_admin_otp_codes(user_id, session_id, code_hash, method, expires_at)
values ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'correct', 'email', now() - interval '1 minute');
do $$ begin
  if public.verify_super_admin_otp(auth.uid(), '10000000-0000-0000-0000-000000000002', 'correct') then raise exception 'FAIL: expired code accepted'; end if;
end $$;
delete from public.super_admin_otp_codes where session_id = '10000000-0000-0000-0000-000000000002';
insert into public.super_admin_otp_codes(user_id, session_id, code_hash, method, expires_at, attempt_count)
values ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'correct', 'email', now() + interval '10 minutes', 4);
do $$ begin
  perform public.verify_super_admin_otp(auth.uid(), '10000000-0000-0000-0000-000000000002', 'wrong');
  if public.verify_super_admin_otp(auth.uid(), '10000000-0000-0000-0000-000000000002', 'correct') then raise exception 'FAIL: attempt limit bypassed'; end if;
end $$;
update public.super_admin_verified_sessions set expires_at = now() - interval '1 minute';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","session_id":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
do $$ begin
  if public.has_role(auth.uid(), 'SUPER_ADMIN') then raise exception 'FAIL: expired approval accepted'; end if;
end $$;
update public.super_admin_two_factor set enabled = false;
do $$ begin
  if not public.has_role(auth.uid(), 'SUPER_ADMIN') then raise exception 'FAIL: OTP-off admin denied'; end if;
end $$;
set local role authenticated;
update public.super_admin_two_factor set enabled = true, updated_at = '2000-01-01';
reset role;
do $$ begin
  if not (select enabled from public.super_admin_two_factor) then raise exception 'FAIL: admin cannot enable OTP'; end if;
  if public.has_role(auth.uid(), 'SUPER_ADMIN') then raise exception 'FAIL: enabling OTP preserved approval'; end if;
  if (select updated_at from public.super_admin_two_factor) < now() then raise exception 'FAIL: client backdated OTP setting'; end if;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","session_id":"10000000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$ begin
  if public.has_role(auth.uid(), 'SUPER_ADMIN') then raise exception 'FAIL: landlord gained admin'; end if;
  if not public.has_role(auth.uid(), 'LANDLORD_ADMIN') then raise exception 'FAIL: landlord role broken'; end if;
end $$;
rollback;
\echo 'PASS: admin session authorization, RLS, OTP isolation/replay/expiry/attempts'
