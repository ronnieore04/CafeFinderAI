/**
 * Seed script: pulls candidate cafes for a given city from the Google Places
 * API (New) and inserts core cafe data into Supabase.
 *
 * Amenity tags (cafe_tags) are intentionally NOT filled in here — those get
 * added by hand for the first seed batch to validate the schema before any
 * automated/crowdsourced tagging exists.
 *
 * Uses the SUPABASE_SERVICE_ROLE_KEY, not the anon key, because the `cafes`
 * table only grants SELECT to anon/authenticated via RLS — writes are
 * intentionally restricted to this script, run manually by you.
 *ss
 * Usage: npm run seed -- --city "Philadelphia, PA"
 */

import { createClient } from "@supabase/supabase-js";

// ---- Config / env -----------------------------------------------------

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_PLACES_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars. Make sure .env.local has:\n" +
      "  GOOGLE_PLACES_API_KEY\n" +
      "  NEXT_PUBLIC_SUPABASE_URL\n" +
      "  SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

// Service role key bypasses RLS entirely — this client should only ever
// run in this script, never shipped to the browser or committed anywhere.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---- CLI args -----------------------------------------------------------

function getCityArg(): string {
  const cityFlagIndex = process.argv.indexOf("--city");
  if (cityFlagIndex === -1 || !process.argv[cityFlagIndex + 1]) {
    console.error('Usage: npm run seed -- --city "City, State"');
    process.exit(1);
  }
  return process.argv[cityFlagIndex + 1];
}

// ---- Google Places API (New) types (partial — only what we use) --------

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  regularOpeningHours?: unknown;
}

interface SearchTextResponse {
  places?: GooglePlace[];
}

// ---- Fetch from Google Places -------------------------------------------

async function fetchCafes(city: string): Promise<GooglePlace[]> {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY as string,
        // Field masks are required by the new Places API — you only pay
        // for and receive the fields you explicitly ask for.
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.regularOpeningHours",
      },
      body: JSON.stringify({
        textQuery: `coffee shops in ${city}`,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Places API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as SearchTextResponse;
  return data.places ?? [];
}

// ---- Insert into Supabase -------------------------------------------------

async function insertCafes(places: GooglePlace[]) {
  let inserted = 0;
  let skipped = 0;

  for (const place of places) {
    if (!place.location || !place.displayName) {
      skipped++;
      continue;
    }

    const { latitude, longitude } = place.location;

    // PostGIS geography columns accept EWKT text on insert via PostgREST,
    // which Postgres casts automatically. SRID=4326 is plain lat/lng
    // (the standard GPS coordinate system) — matches the column definition
    // in the schema migration.
    const location = `SRID=4326;POINT(${longitude} ${latitude})`;

    const { error } = await supabase.from("cafes").upsert(
      {
        name: place.displayName.text,
        address: place.formattedAddress ?? null,
        location,
        hours: place.regularOpeningHours ?? null,
        google_place_id: place.id,
      },
      { onConflict: "google_place_id" }
    );

    if (error) {
      console.error(`Failed to insert "${place.displayName.text}":`, error.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

// ---- Main -----------------------------------------------------------------

async function main() {
  const city = getCityArg();

  console.log(`Fetching cafes for "${city}" from Google Places...`);
  const places = await fetchCafes(city);
  console.log(`Found ${places.length} places.`);

  if (places.length === 0) {
    console.log("Nothing to insert. Done.");
    return;
  }

  console.log("Inserting into Supabase...");
  const { inserted, skipped } = await insertCafes(places);

  console.log(`Done. Inserted/updated: ${inserted}, skipped: ${skipped}.`);
  console.log(
    "Note: cafe_tags (noise, outlets, wifi, vibe) are NOT set yet — " +
      "add those by hand for this first batch via the Supabase Table Editor."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
