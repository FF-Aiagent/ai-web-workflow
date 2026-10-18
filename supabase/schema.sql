-- AI Web · 用户+余额 MVP (Supabase Auth + Postgres)
-- Run once in Supabase SQL Editor after creating the free project.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  balance integer not null default 10 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_id_idx on public.credit_ledger (user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, balance)
  values (new.id, new.email, 10)
  on conflict (id) do nothing;

  insert into public.credit_ledger (user_id, delta, reason)
  values (new.id, 10, 'signup_grant');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic deduct 1; returns new balance or null if insufficient.
create or replace function public.deduct_credit(p_user_id uuid, p_reason text default 'generate')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
  set balance = balance - 1,
      updated_at = now()
  where id = p_user_id
    and balance >= 1
  returning balance into new_balance;

  if new_balance is null then
    return null;
  end if;

  insert into public.credit_ledger (user_id, delta, reason)
  values (p_user_id, -1, coalesce(p_reason, 'generate'));

  return new_balance;
end;
$$;

alter table public.profiles enable row level security;
alter table public.credit_ledger enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "ledger_select_own" on public.credit_ledger;
create policy "ledger_select_own"
  on public.credit_ledger for select
  using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.credit_ledger to authenticated;
grant execute on function public.deduct_credit(uuid, text) to service_role;
