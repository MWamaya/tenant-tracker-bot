-- Public "Contact us" form submissions. No RLS policies are defined, so
-- with RLS enabled the table is inaccessible to anon/authenticated roles
-- entirely — all access goes through the contact-submit edge function,
-- which uses the service_role key and does its own input validation.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

comment on table public.contact_messages is 'Submissions from the public /contact form. Written only by the contact-submit edge function (service role).';
