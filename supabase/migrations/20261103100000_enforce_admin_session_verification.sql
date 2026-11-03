-- Email OTP authorizes one authenticated session, never an entire account.
alter table public.super_admin_otp_codes
  add column session_id uuid references auth.sessions(id) on delete cascade;

create table public.super_admin_verified_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
alter table public.super_admin_verified_sessions enable row level security;
-- No user policies: only service operations may issue an approval.
revoke all on public.super_admin_verified_sessions from anon, authenticated;
grant all on public.super_admin_verified_sessions to service_role;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  ) and (
    _role <> 'SUPER_ADMIN' or (
      _user_id = auth.uid() and (
        not exists (select 1 from public.super_admin_two_factor where user_id = _user_id and enabled)
        or exists (
          select 1 from public.super_admin_verified_sessions s
          join public.super_admin_two_factor f on f.user_id = s.user_id
          where s.user_id = _user_id
            and s.session_id::text = auth.jwt()->>'session_id'
            and s.expires_at > now()
            and s.verified_at >= f.updated_at
        )
      )
    )
  )
$$;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- A caller cannot preserve old approvals by supplying an old updated_at.
create function public.invalidate_admin_verification()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  delete from public.super_admin_verified_sessions where user_id = new.user_id;
  return new;
end
$$;
create trigger invalidate_admin_verification
before insert or update on public.super_admin_two_factor
for each row execute function public.invalidate_admin_verification();

-- Serialize guesses on the code row so concurrent attempts cannot bypass
-- the limit or consume a successful code twice. Return false (rather than
-- raising) on a bad guess so the increment is committed.
create function public.verify_super_admin_otp(p_user_id uuid, p_session_id uuid, p_code_hash text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  otp public.super_admin_otp_codes%rowtype;
begin
  if not exists (select 1 from public.user_roles where user_id = p_user_id and role = 'SUPER_ADMIN')
    or not exists (select 1 from public.super_admin_two_factor where user_id = p_user_id and enabled)
    or not exists (select 1 from auth.sessions where id = p_session_id and user_id = p_user_id) then
    return false;
  end if;

  select * into otp from public.super_admin_otp_codes
  where user_id = p_user_id and session_id = p_session_id
  order by created_at desc, id desc limit 1 for update;

  if not found or otp.consumed_at is not null or otp.expires_at <= now() or otp.attempt_count >= 5 then
    return false;
  end if;
  update public.super_admin_otp_codes set attempt_count = attempt_count + 1 where id = otp.id;
  if otp.code_hash is distinct from p_code_hash then return false; end if;

  update public.super_admin_otp_codes set consumed_at = now() where id = otp.id;
  insert into public.super_admin_verified_sessions(session_id, user_id)
    values (p_session_id, p_user_id)
    on conflict (session_id) do update set verified_at = now(), expires_at = now() + interval '24 hours';
  return true;
end
$$;
revoke all on function public.verify_super_admin_otp(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.verify_super_admin_otp(uuid, uuid, text) to service_role;
