-- Enable PostGIS for geo queries
create extension if not exists postgis;

-- Core cafe data
create table cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  location geography(point, 4326) not null,
  hours jsonb,
  photos text[],
  google_place_id text unique,
  created_at timestamptz default now()
);

create index cafes_location_idx on cafes using gist (location);

-- Amenity / vibe data, kept separate from core cafe data so it can later
-- be crowdsourced or edited independently
create table cafe_tags (
  cafe_id uuid primary key references cafes(id) on delete cascade,
  noise_level int check (noise_level between 1 and 5),
  outlets text check (outlets in ('none', 'some', 'plenty')),
  seating_type text[],       -- e.g. {bar, tables, couches}
  wifi_quality text check (wifi_quality in ('none', 'slow', 'ok', 'fast')),
  vibe_tags text[],          -- e.g. {cozy, minimal, lively, artsy}
  updated_at timestamptz default now()
);

-- Users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  vibe_preferences jsonb,    -- answers from onboarding quiz
  created_at timestamptz default now()
);

-- Friend graph
create table friendships (
  user_id uuid references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete cascade,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

-- Check-ins: powers both "best for" labels and preference matching over time
create table checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  cafe_id uuid references cafes(id) on delete cascade,
  purpose text check (purpose in ('studying', 'working', 'date', 'hangout', 'other')),
  rating int check (rating between 1 and 5),
  note text,
  created_at timestamptz default now()
);

-- Example nearby-cafes query (cafes within 1.5km, sorted by distance):
-- select c.*, ct.*
-- from cafes c
-- join cafe_tags ct on ct.cafe_id = c.id
-- where st_dwithin(c.location, st_makepoint(:lng, :lat)::geography, 1500)
-- order by c.location <-> st_makepoint(:lng, :lat)::geography;
