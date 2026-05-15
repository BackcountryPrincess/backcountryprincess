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
