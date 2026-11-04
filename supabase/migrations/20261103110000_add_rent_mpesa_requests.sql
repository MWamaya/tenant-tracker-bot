-- Ownership is recorded when the authenticated landlord starts checkout.
create table public.rent_mpesa_requests (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  checkout_request_id text not null unique,
  account_reference text not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);
alter table public.rent_mpesa_requests enable row level security;
grant select on public.rent_mpesa_requests to authenticated;
grant all on public.rent_mpesa_requests to service_role;
revoke insert, update, delete on public.rent_mpesa_requests from anon, authenticated;
create policy "Landlords view their own rent checkout requests"
on public.rent_mpesa_requests for select to authenticated
using (landlord_id = auth.uid() or public.has_role(auth.uid(), 'SUPER_ADMIN'));
create index rent_mpesa_requests_landlord_idx on public.rent_mpesa_requests(landlord_id);
