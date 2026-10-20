-- R1 fix: atomic refund of 1 credit after a failed generate.
-- Run once in Supabase SQL editor (idempotent).
create or replace function public.refund_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
  set balance = balance + 1,
      updated_at = now()
  where id = p_user_id
  returning balance into new_balance;

  if new_balance is null then
    return null;
  end if;

  insert into public.credit_ledger (user_id, delta, reason)
  values (p_user_id, 1, '失败退回');

  return new_balance;
end;
$$;

revoke all on function public.refund_credit(uuid) from public, anon, authenticated;
grant execute on function public.refund_credit(uuid) to service_role;
