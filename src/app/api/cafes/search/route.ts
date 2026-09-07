import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  matchScore,
  meetsHardConstraints,
  type CafeTags,
  type UserPreferences,
} from "@/lib/matching";

interface NearbyCafeRow {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distance_meters: number;
  rating: number | null;
  price_level: number | null;
  hours: unknown;
}

interface CafeTagsRow {
  cafe_id: string;
  noise_level: number | null;
  outlets: string | null;
  wifi_quality: string | null;
  seating_type: string[] | null;
  vibe_tags: string[] | null;
}

// GET /api/cafes/search?lat=...&lng=...&radius=5000&maxNoise=3&minOutlets=some&minWifi=ok&vibes=cozy,quiet
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const radiusMeters = parseInt(params.get("radius") ?? "5000", 10);

  // Missing filters default to "accept anything" — a filter the user never
  // set shouldn't silently exclude cafes.
  const preferences: UserPreferences = {
    maxNoiseLevel: parseInt(params.get("maxNoise") ?? "5", 10) as UserPreferences["maxNoiseLevel"],
    minOutlets: (params.get("minOutlets") as UserPreferences["minOutlets"]) ?? "none",
    minWifiQuality: (params.get("minWifi") as UserPreferences["minWifiQuality"]) ?? "none",
    preferredVibeTags: params.get("vibes")?.split(",").filter(Boolean) ?? [],
  };

  // Step 1 — PostGIS does the radius filter. This is the one thing worth
  // pushing into the database: an indexed geo query over the whole table.
  const { data: nearby, error: nearbyError } = await supabase.rpc("nearby_cafes", {
    lat,
    lng,
    radius_meters: radiusMeters,
  });

  if (nearbyError) {
    return NextResponse.json({ error: nearbyError.message }, { status: 500 });
  }

  const nearbyCafes = (nearby ?? []) as NearbyCafeRow[];
  if (nearbyCafes.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Step 2 — pull tags only for the already-geo-filtered set, not the
  // whole table.
  const cafeIds = nearbyCafes.map((c) => c.id);
  const { data: tagsData, error: tagsError } = await supabase
    .from("cafe_tags")
    .select("cafe_id, noise_level, outlets, wifi_quality, seating_type, vibe_tags")
    .in("cafe_id", cafeIds);

  if (tagsError) {
    return NextResponse.json({ error: tagsError.message }, { status: 500 });
  }

  const tagsByCafeId = new Map<string, CafeTagsRow>();
  for (const row of (tagsData ?? []) as CafeTagsRow[]) {
    tagsByCafeId.set(row.cafe_id, row);
  }

  // Step 3 — score and rank in TypeScript, reusing matching.ts exactly as
  // written and already unit tested, rather than a second SQL version that
  // could quietly drift from it over time.
  //
  // Missing/untagged fields default conservatively (noise=3/mid, no
  // outlets, no wifi) rather than optimistically — an untagged cafe
  // shouldn't automatically pass a filter it might not actually meet.
  const results = nearbyCafes
    .map((cafe) => {
      const tags = tagsByCafeId.get(cafe.id);

      const cafeTags: CafeTags = {
        noiseLevel: (tags?.noise_level ?? 3) as CafeTags["noiseLevel"],
        outlets: (tags?.outlets as CafeTags["outlets"]) ?? "none",
        wifiQuality: (tags?.wifi_quality as CafeTags["wifiQuality"]) ?? "none",
        vibeTags: tags?.vibe_tags ?? [],
      };

      return {
        id: cafe.id,
        name: cafe.name,
        address: cafe.address,
        latitude: cafe.latitude,
        longitude: cafe.longitude,
        distanceMeters: cafe.distance_meters,
        rating: cafe.rating,
        priceLevel: cafe.price_level,
        matchScore: matchScore(cafeTags, preferences),
        // Tracked separately from matchScore, not derived from it — a
        // cafe that passes constraints but has zero vibe tag overlap also
        // scores 0, which would be indistinguishable from failing
        // constraints if we filtered on score alone.
        meetsConstraints: meetsHardConstraints(cafeTags, preferences),
      };
    })
    .filter((r) => r.meetsConstraints)
    .sort((a, b) => b.matchScore - a.matchScore || a.distanceMeters - b.distanceMeters);

  return NextResponse.json({ results });
}