/**
 * Seed script: pulls candidate cafes for a given city from the Google Places
 * API and inserts core cafe data into Supabase. Amenity tags (cafe_tags)
 * are intentionally NOT filled in here — those get added by hand for the
 * first seed batch to validate the schema before any automated tagging.
 *
 * Usage: npm run seed -- --city "Philadelphia, PA"
 */

async function main() {
  console.log(
    "TODO: call Google Places Text Search / Nearby Search for the target city,",
    "then insert results into the `cafes` table via the Supabase client."
  );
}

main();
