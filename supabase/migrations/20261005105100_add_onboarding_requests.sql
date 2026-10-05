-- Lead-intake submissions from the public "Get started" form. Written only
-- by the onboarding-submit edge function (service role, bypasses RLS).
-- Super admins can read and update status as they triage the list.
create table if not exists public.onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  plan text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.onboarding_requests enable row level security;

create policy "Super admins can view onboarding requests"
  on public.onboarding_requests for select
  using (public.has_role(auth.uid(), 'SUPER_ADMIN'));

create policy "Super admins can update onboarding requests"
  on public.onboarding_requests for update
  using (public.has_role(auth.uid(), 'SUPER_ADMIN'));

comment on table public.onboarding_requests is 'Leads from the public /get-started form. Inserted only by the onboarding-submit edge function; visible/updatable only to SUPER_ADMIN.';
