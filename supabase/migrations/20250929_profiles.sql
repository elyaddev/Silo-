-- PROFILES TABLE + RLS

-- 1) Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Trigger function to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) Trigger (idempotent)
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 4) Enable RLS
alter table public.profiles enable row level security;

-- 5) Policies
drop policy if exists "Public read access" on public.profiles;
create policy "Public read access" on public.profiles
  for select using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
