create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  subscription_status text not null default 'free',
  subscription_tier text not null default 'free'
);

create table if not exists public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  units text not null default 'metric',
  dark_mode boolean not null default true,
  notifications_enabled boolean not null default false
);

alter table public.profiles enable row level security;
alter table public.saved_locations enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "Users can manage own saved locations" on public.saved_locations;
create policy "Users can manage own saved locations"
on public.saved_locations for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can manage own preferences" on public.user_preferences;
create policy "Users can manage own preferences"
on public.user_preferences for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
