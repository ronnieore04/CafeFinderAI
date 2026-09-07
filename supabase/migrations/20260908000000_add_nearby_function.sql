-- Narrow PostGIS radius search: returns cafes within radius_meters of
-- (lat, lng), with distance. Deliberately does NOT do matching/scoring —
-- that logic stays in matching.ts (TypeScript), reused as-is and already
-- unit tested, rather than being reimplemented a second time in SQL.
create or replace function nearby_cafes(
  lat double precision,
  lng double precision,
  radius_meters int default 5000
)
returns table (
  id uuid,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision,
  rating numeric,
  price_level smallint,
  hours jsonb
)
language sql
stable
as $$
  select
    c.id,
    c.name,
    c.address,
    ST_Y(c.location::geometry) as latitude,
    ST_X(c.location::geometry) as longitude,
    ST_Distance(c.location, ST_MakePoint(lng, lat)::geography) as distance_meters,
    c.rating,
    c.price_level,
    c.hours
  from cafes c
  where ST_DWithin(c.location, ST_MakePoint(lng, lat)::geography, radius_meters)
  order by distance_meters;
$$;

-- Functions have their own privilege system, separate from table GRANTs —
-- learned this the hard way with service_role earlier. Explicitly needed
-- even though anon/authenticated can already SELECT from cafes directly.
grant execute on function nearby_cafes(double precision, double precision, int) to anon, authenticated;