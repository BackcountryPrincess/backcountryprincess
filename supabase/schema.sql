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

create table if not exists public.weather_days (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  station text,
  observation_date date,
  temp_min numeric,
  temp_max numeric,
  precipitation numeric,
  snow_depth numeric,
  solar_radiation numeric,
  freeze_thaw boolean,
  gdd numeric,
  sap_score numeric,
  notes text
);

create table if not exists public.seasons (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  year integer,
  region text,
  season_status text,
  start_date date,
  end_date date,
  summary text
);

create table if not exists public.user_feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  email text,
  region text,
  message text
);

create unique index if not exists weather_days_station_observation_date_idx
on public.weather_days (station, observation_date);

create index if not exists weather_days_observation_date_idx
on public.weather_days (observation_date);

create index if not exists seasons_year_region_idx
on public.seasons (year, region);

alter table public.weather_days enable row level security;
alter table public.seasons enable row level security;
alter table public.user_feedback enable row level security;

drop policy if exists "Public can read weather days" on public.weather_days;
create policy "Public can read weather days"
on public.weather_days for select
to anon, authenticated
using (true);

drop policy if exists "Public can read seasons" on public.seasons;
create policy "Public can read seasons"
on public.seasons for select
to anon, authenticated
using (true);

drop policy if exists "Public can insert feedback" on public.user_feedback;
create policy "Public can insert feedback"
on public.user_feedback for insert
to anon, authenticated
with check (message is not null and length(trim(message)) > 0);
