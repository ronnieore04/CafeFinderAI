/**
 * Auto-tags cafes using AI inference over their Google reviews.
 *
 * For each cafe already in `cafes`, this:
 *   1. Fetches reviews + editorial summary via Google Places Details (New)
 *   2. Asks Claude to infer noise/outlets/wifi/seating/vibe from that text
 *   3. Validates the response against the same constraints the DB enforces
 *   4. Upserts into `cafe_tags`
 *
 * This is fully automated — nothing here is reviewed by a human before
 * hitting the database. Confidence is inherently lower than hand-tagging:
 * reviews are sparse/dated/contradictory for a lot of places, and an LLM
 * asked for a field will sometimes produce a plausible guess even off weak
 * evidence. The prompt explicitly permits `null` for low-signal fields to
 * reduce (not eliminate) that risk — validation below enforces it strictly.
 *
 * Usage: npm run tag-cafes
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// ---- Config / env -----------------------------------------------------

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (
  !GOOGLE_PLACES_API_KEY ||
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  !ANTHROPIC_API_KEY
) {
  console.error(
    "Missing required env vars. Make sure .env.local has:\n" +
      "  GOOGLE_PLACES_API_KEY\n" +
      "  NEXT_PUBLIC_SUPABASE_URL\n" +
      "  SUPABASE_SERVICE_ROLE_KEY\n" +
      "  ANTHROPIC_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---- Types matching the cafe_tags schema --------------------------------

const VALID_OUTLETS = ["none", "some", "plenty"] as const;
const VALID_WIFI = ["none", "slow", "ok", "fast"] as const;
const VALID_SEATING = ["bar", "tables", "couches"] as const;
const VALID_VIBE = [
  "cozy",
  "minimal",
  "lively",
  "artsy",
  "quiet",
  "industrial",
] as const;

interface InferredTags {
  noise_level: number | null;
  outlets: string | null;
  wifi_quality: string | null;
  seating_type: string[] | null;
  vibe_tags: string[] | null;
}

interface CafeRow {
  id: string;
  name: string;
  google_place_id: string | null;
}

// ---- Fetch reviews from Google Places Details (New) ---------------------

async function fetchReviewText(placeId: string): Promise<string | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY as string,
        "X-Goog-FieldMask": "reviews,editorialSummary",
      },
    }
  );

  if (!response.ok) {
    console.error(`Place Details error (${response.status}) for ${placeId}`);
    return null;
  }

  const data = (await response.json()) as {
    reviews?: { text?: { text?: string } }[];
    editorialSummary?: { text?: string };
  };

  const reviewTexts = (data.reviews ?? [])
    .map((r) => r.text?.text)
    .filter((t): t is string => Boolean(t));

  const editorial = data.editorialSummary?.text;

  if (reviewTexts.length === 0 && !editorial) return null;

  return [editorial, ...reviewTexts].filter(Boolean).join("\n\n");
}

// ---- Ask Claude to infer tags from review text --------------------------

async function inferTags(
  cafeName: string,
  reviewText: string
): Promise<InferredTags | null> {
  const prompt = `Based on these reviews of "${cafeName}", estimate the following. Return ONLY valid JSON, no other text, matching exactly this shape:

{
  "noise_level": <integer 1-5, or null>,
  "outlets": <"none" | "some" | "plenty", or null>,
  "wifi_quality": <"none" | "slow" | "ok" | "fast", or null>,
  "seating_type": <array from ["bar","tables","couches"], or null>,
  "vibe_tags": <array from ["cozy","minimal","lively","artsy","quiet","industrial"], or null>
}

If the reviews don't give enough signal for a field, return null for that field rather than guessing.

Reviews:
${reviewText}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Anthropic API error (${response.status}):`, body);
    return null;
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };

  const textBlock = data.content?.find((block) => block.type === "text");
  if (!textBlock?.text) return null;

  try {
    return JSON.parse(extractJson(textBlock.text)) as InferredTags;
  } catch {
    console.error(`Failed to parse AI response for "${cafeName}":`, textBlock.text);
    return null;
  }
}

// Claude sometimes wraps JSON output in a markdown code fence (```json ... ```)
// even when explicitly told to return only JSON. Strip it before parsing
// rather than relying on the model to never do this.
function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

// ---- Validate before it ever reaches the database ------------------------

function isValidArraySubset(value: unknown, allowed: readonly string[]): boolean {
  return (
    Array.isArray(value) && value.every((v) => allowed.includes(v as string))
  );
}

function validateTags(tags: InferredTags): InferredTags {
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

// ---- Main -----------------------------------------------------------------

async function main() {
  const { data: cafes, error } = await supabase
    .from("cafes")
    .select("id, name, google_place_id")
    .returns<CafeRow[]>();

  if (error) {
    console.error("Failed to fetch cafes:", error.message);
    process.exit(1);
  }

  console.log(`Tagging ${cafes.length} cafes...`);

  // Human-tagged rows are never overwritten by this script. Fetched once,
  // up front, rather than querying per-cafe inside the loop.
  const { data: humanTagged, error: humanTaggedError } = await supabase
    .from("cafe_tags")
    .select("cafe_id")
    .eq("tag_source", "human");

  if (humanTaggedError) {
    console.error("Failed to check for human-tagged cafes:", humanTaggedError.message);
    process.exit(1);
  }

  const humanTaggedIds = new Set(
    ((humanTagged ?? []) as { cafe_id: string }[]).map((row) => row.cafe_id)
  );

  let tagged = 0;
  let skipped = 0;

  for (const cafe of cafes) {
    if (humanTaggedIds.has(cafe.id)) {
      console.log(`Skipping "${cafe.name}" — already human-tagged.`);
      skipped++;
      continue;
    }

    if (!cafe.google_place_id) {
      console.log(`Skipping "${cafe.name}" — no google_place_id.`);
      skipped++;
      continue;
    }

    const reviewText = await fetchReviewText(cafe.google_place_id);
    if (!reviewText) {
      console.log(`Skipping "${cafe.name}" — no reviews or summary found.`);
      skipped++;
      continue;
    }

    const inferred = await inferTags(cafe.name, reviewText);
    if (!inferred) {
      console.log(`Skipping "${cafe.name}" — AI response unusable.`);
      skipped++;
      continue;
    }

    const validated = validateTags(inferred);

    const { error: upsertError } = await supabase.from("cafe_tags").upsert(
      {
        cafe_id: cafe.id,
        ...validated,
        tag_source: "ai",
      },
      { onConflict: "cafe_id" }
    );

    if (upsertError) {
      console.error(`Failed to upsert tags for "${cafe.name}":`, upsertError.message);
      skipped++;
    } else {
      console.log(`Tagged "${cafe.name}".`);
      tagged++;
    }
  }

  console.log(`Done. Tagged: ${tagged}, skipped: ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});