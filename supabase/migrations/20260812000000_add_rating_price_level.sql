-- Adds fields needed for the Rating and Price filters, sourced directly
-- from Google Places. price_level uses 0-4 to match Places' five-level
-- enum (PRICE_LEVEL_FREE through PRICE_LEVEL_VERY_EXPENSIVE) rather than
-- the more common 1-4 "$ to $$$$" convention.
alter table cafes
  add column rating numeric(2,1) check (rating >= 0 and rating <= 5),
  add column price_level smallint check (price_level between 0 and 4);
 