-- Adds fields needed for the Rating and Price filters, sourced directly
-- from Google Places. price_level uses 0-4 to match Places' five-level
-- enum (PRICE_LEVEL_FREE through PRICE_LEVEL_VERY_EXPENSIVE) rather than
-- the more common 1-4 "$ to $$$$" convention.
--
-- Written idempotently (DO blocks catching "already exists") because this
-- migration never successfully applied through CD — auth was failing the
-- whole time — but the columns exist on the live database anyway, likely
-- added directly via the SQL Editor at some point. This makes the file
-- safe to run regardless of that drift, without editing a migration that
-- actually succeeded (this one never did).

DO $$
BEGIN
  ALTER TABLE cafes ADD COLUMN rating numeric(2,1);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE cafes ADD COLUMN price_level smallint;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE cafes ADD CONSTRAINT cafes_rating_check CHECK (rating >= 0 AND rating <= 5);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE cafes ADD CONSTRAINT cafes_price_level_check CHECK (price_level BETWEEN 0 AND 4);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;