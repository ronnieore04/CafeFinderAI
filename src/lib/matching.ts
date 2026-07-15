/**
 * Simple tag-overlap preference matching.
 *
 * Scores a cafe against a user's preferences by counting how many of the
 * cafe's vibe tags appear in the user's preferred tags, weighted by how
 * well hard constraints (noise, outlets, wifi) are satisfied.
 *
 * This is intentionally simple — a starting point, not a final algorithm.
 * It can be swapped for embeddings/ML later without changing its interface.
 */

export type NoiseLevel = 1 | 2 | 3 | 4 | 5;
export type OutletLevel = "none" | "some" | "plenty";
export type WifiQuality = "none" | "slow" | "ok" | "fast";

export interface CafeTags {
  noiseLevel: NoiseLevel;
  outlets: OutletLevel;
  wifiQuality: WifiQuality;
  vibeTags: string[];
}

export interface UserPreferences {
  maxNoiseLevel: NoiseLevel;
  minOutlets: OutletLevel;
  minWifiQuality: WifiQuality;
  preferredVibeTags: string[];
}

const outletRank: Record<OutletLevel, number> = { none: 0, some: 1, plenty: 2 };
const wifiRank: Record<WifiQuality, number> = { none: 0, slow: 1, ok: 2, fast: 3 };

/**
 * Returns true if a cafe satisfies a user's hard constraints.
 */
export function meetsHardConstraints(
  cafe: CafeTags,
  prefs: UserPreferences
): boolean {
  if (cafe.noiseLevel > prefs.maxNoiseLevel) return false;
  if (outletRank[cafe.outlets] < outletRank[prefs.minOutlets]) return false;
  if (wifiRank[cafe.wifiQuality] < wifiRank[prefs.minWifiQuality]) return false;
  return true;
}

/**
 * Scores a cafe from 0 to 1 based on vibe tag overlap with user preferences.
 * Returns 0 if hard constraints aren't met, regardless of vibe overlap.
 */
export function matchScore(cafe: CafeTags, prefs: UserPreferences): number {
  if (!meetsHardConstraints(cafe, prefs)) return 0;
  if (prefs.preferredVibeTags.length === 0) return 1;

  const overlap = cafe.vibeTags.filter((tag) =>
    prefs.preferredVibeTags.includes(tag)
  ).length;

  return overlap / prefs.preferredVibeTags.length;
}
