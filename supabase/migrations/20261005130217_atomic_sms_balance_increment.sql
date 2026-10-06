-- Both useAllocateSmsTokens and useAssignSubscription currently update
-- profiles.sms_token_balance by reading the current value, adding to it in
-- JS, then writing the sum back — a classic read-then-write race. Two
-- concurrent allocations (or an allocation racing a landlord's own SMS send
-- debiting the same row elsewhere) can lose an update.
--
-- This RPC does the increment atomically in a single UPDATE statement.
-- No SECURITY DEFINER: it runs as the calling user, so it stays subject to
-- the "Super Admins can update all profiles" RLS policy and the
-- zz_protect_account_status_and_sms_balance trigger guard already in place
-- (migration 20260902120000) — only a super admin (or a service-role
-- backend operation) can actually move the balance.
create or replace function public.increment_sms_balance(p_landlord_id uuid, p_amount integer)
returns integer
language plpgsql
as $$
declare
  v_new_balance integer;
begin
  update public.profiles
  set sms_token_balance = sms_token_balance + p_amount
  where id = p_landlord_id
  returning sms_token_balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'Landlord profile % not found', p_landlord_id;
  end if;

  return v_new_balance;
end;
$$;
