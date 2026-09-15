// Pure logic extracted from seed-cafes.ts for the same reason as
// scripts/lib/ai-tagging.ts — testable without triggering that script's
// top-level env-var checks / Supabase client creation on import.

export type GooglePriceLevel =
  | "PRICE_LEVEL_UNSPECIFIED"
  | "PRICE_LEVEL_FREE"
  | "PRICE_LEVEL_INEXPENSIVE"
  | "PRICE_LEVEL_MODERATE"
  | "PRICE_LEVEL_EXPENSIVE"
  | "PRICE_LEVEL_VERY_EXPENSIVE";

// Maps Places' enum to the 0-4 integer stored in cafes.price_level.
// Matches the check constraint in the schema migration.
export const PRICE_LEVEL_MAP: Record<GooglePriceLevel, number | null> = {
  PRICE_LEVEL_UNSPECIFIED: null,
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export function toPriceLevel(priceLevel: GooglePriceLevel | undefined): number | null {
  if (!priceLevel) return null;
  return PRICE_LEVEL_MAP[priceLevel] ?? null;
}
