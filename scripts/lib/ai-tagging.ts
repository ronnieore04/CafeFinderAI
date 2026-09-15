// Pure logic extracted from tag-cafes.ts so it can be unit tested without
// triggering that script's top-level env-var checks / Supabase client
// creation, which would fire on import and aren't relevant here.

export const VALID_OUTLETS = ["none", "some", "plenty"] as const;
export const VALID_WIFI = ["none", "slow", "ok", "fast"] as const;
export const VALID_SEATING = ["bar", "tables", "couches"] as const;
export const VALID_VIBE = [
  "cozy",
  "minimal",
  "lively",
  "artsy",
  "quiet",
  "industrial",
] as const;

export interface InferredTags {
  noise_level: number | null;
  outlets: string | null;
  wifi_quality: string | null;
  seating_type: string[] | null;
  vibe_tags: string[] | null;
}

export function isValidArraySubset(value: unknown, allowed: readonly string[]): boolean {
  return (
    Array.isArray(value) && value.every((v) => allowed.includes(v as string))
  );
}

// Never trusts the AI's output directly — starts from all-null and only
// fills in a field if it passes the same checks the database's own check
// constraints enforce.
export function validateTags(tags: InferredTags): InferredTags {
  const validated: InferredTags = {
    noise_level: null,
    outlets: null,
    wifi_quality: null,
    seating_type: null,
    vibe_tags: null,
  };

  if (
    typeof tags.noise_level === "number" &&
    Number.isInteger(tags.noise_level) &&
    tags.noise_level >= 1 &&
    tags.noise_level <= 5
  ) {
    validated.noise_level = tags.noise_level;
  }

  if (
    typeof tags.outlets === "string" &&
    VALID_OUTLETS.includes(tags.outlets as (typeof VALID_OUTLETS)[number])
  ) {
    validated.outlets = tags.outlets;
  }

  if (
    typeof tags.wifi_quality === "string" &&
    VALID_WIFI.includes(tags.wifi_quality as (typeof VALID_WIFI)[number])
  ) {
    validated.wifi_quality = tags.wifi_quality;
  }

  if (isValidArraySubset(tags.seating_type, VALID_SEATING)) {
    validated.seating_type = tags.seating_type;
  }

  if (isValidArraySubset(tags.vibe_tags, VALID_VIBE)) {
    validated.vibe_tags = tags.vibe_tags;
  }

  return validated;
}

// Claude sometimes wraps JSON output in a markdown code fence (```json ... ```)
// even when explicitly told to return only JSON. Strip it before parsing
// rather than relying on the model to never do this — the bug that
// prompted this function existing in the first place.
export function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}
