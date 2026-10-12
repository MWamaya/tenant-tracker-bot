-- Super admins can currently view/update onboarding_requests but have no
-- way to delete one (e.g. spam, duplicate, or test submissions) — RLS had
-- no DELETE policy at all, so the row stayed forever even from the UI.
create policy "Super admins can delete onboarding requests"
  on public.onboarding_requests for delete
  using (public.has_role(auth.uid(), 'SUPER_ADMIN'));
