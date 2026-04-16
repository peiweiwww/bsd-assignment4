-- ============================================================
-- a. Extensions
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- b. Table: cities
--    user_id is a Clerk user id string (e.g. 'user_xxx'),
--    NOT a UUID, so the column type is text.
-- ============================================================

create table cities (
  id          uuid              primary key default gen_random_uuid(),
  user_id     text              not null,
  name        text              not null,
  latitude    double precision  not null,
  longitude   double precision  not null,
  created_at  timestamptz       not null default now(),

  constraint cities_user_location_unique unique (user_id, latitude, longitude)
);


-- ============================================================
-- c. Table: weather_readings
--    Shared across all users — same city gets one reading.
--    Worker writes via service_role key (bypasses RLS).
-- ============================================================

create table weather_readings (
  id            uuid              primary key default gen_random_uuid(),
  city_id       uuid              not null references cities(id) on delete cascade,
  temperature   double precision  not null,
  humidity      double precision  not null,
  wind_speed    double precision  not null,
  weather_code  integer           not null,
  recorded_at   timestamptz       not null default now()
);


-- ============================================================
-- d. Indexes
-- ============================================================

create index on cities (user_id);

create index on weather_readings (city_id, recorded_at desc);


-- ============================================================
-- e. Row Level Security
-- ============================================================

-- --- cities ---------------------------------------------------
-- Clerk JWT: the 'sub' claim contains the Clerk user id.
-- Supabase exposes it via:  auth.jwt() ->> 'sub'

alter table cities enable row level security;

create policy "cities: select own rows"
  on cities
  for select
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

create policy "cities: insert own rows"
  on cities
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "cities: update own rows"
  on cities
  for update
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "cities: delete own rows"
  on cities
  for delete
  to authenticated
  using ((auth.jwt() ->> 'sub') = user_id);

-- --- weather_readings -----------------------------------------
-- Weather data is shared: any authenticated user may read.
-- Insert/update/delete are intentionally omitted — the worker
-- connects with service_role key and bypasses RLS entirely.

alter table weather_readings enable row level security;

create policy "weather_readings: select for authenticated"
  on weather_readings
  for select
  to authenticated
  using (true);


-- ============================================================
-- f. Realtime
--    Add weather_readings to the supabase_realtime publication
--    so the frontend can subscribe to live updates.
--    cities is excluded — no realtime needed there.
-- ============================================================

alter publication supabase_realtime add table weather_readings;
