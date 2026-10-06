-- Per-super-admin 2FA preference (off by default) and the OTP codes issued
-- during login. Only email delivery is wired up today; 'sms' is a valid
-- method value so the column doesn't need to change later, but nothing
-- sends SMS yet — the UI keeps that option disabled until it is.

create table public.super_admin_two_factor (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  method text not null default 'email' check (method in ('email', 'sms')),
  updated_at timestamptz not null default now()
);

alter table public.super_admin_two_factor enable row level security;

create policy "Super admins manage their own 2FA setting"
  on public.super_admin_two_factor for all
  using (auth.uid() = user_id and public.has_role(auth.uid(), 'SUPER_ADMIN'))
  with check (auth.uid() = user_id and public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- OTP codes are only ever written/read by edge functions using the service
-- role (the login flow drops its session before the code is verified, so
-- there's no authenticated client to grant a policy to) — no client RLS
-- policies, so RLS defaults to deny-all for anon/authenticated.
create table public.super_admin_otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  method text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempt_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.super_admin_otp_codes enable row level security;

create index idx_super_admin_otp_codes_user_id on public.super_admin_otp_codes (user_id, created_at desc);
