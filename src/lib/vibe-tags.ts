/**
 * The fixed set of vibe tags cafes can be tagged with and users can
 * select as preferences. Centralized here so the matching logic, seed
 * script, and UI all stay in sync on what values are valid.
 */
export const VIBE_TAGS = [
  "cozy",
  "minimal",
  "lively",
  "artsy",
  "quiet",
  "industrial",
] as const;

export type VibeTag = (typeof VIBE_TAGS)[number];
