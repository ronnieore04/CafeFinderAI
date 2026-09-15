"use client";

import { useEffect, useState, useCallback } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface CafeResult {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  rating: number | null;
  priceLevel: number | null;
  matchScore: number;
  meetsConstraints: boolean;
}

const DEFAULT_CENTER = { latitude: 39.9526, longitude: -75.1652 }; // Philadelphia
const PRICE_LABELS = ["Free", "$", "$$", "$$$", "$$$$"];

// Marker color encodes match quality directly, rather than being purely
// decorative — a strong vibe-tag match looks different from a cafe that
// only cleared the hard constraints with no vibe overlap.
function markerColor(matchScore: number): string {
  if (matchScore >= 0.75) return "#2f6f4f"; // strong vibe match
  if (matchScore >= 0.4) return "#c17817"; // partial match
  return "#8a8a8a"; // meets constraints, little/no vibe overlap
}

function formatMeta(cafe: CafeResult): string {
  const parts = [`${(cafe.distanceMeters / 1000).toFixed(1)} km`];
  if (cafe.rating != null) parts.push(`${cafe.rating}★`);
  if (cafe.priceLevel != null) parts.push(PRICE_LABELS[cafe.priceLevel]);
  return parts.join(" · ");
}

export default function CafeMap() {
  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);
  const [cafes, setCafes] = useState<CafeResult[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<CafeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // Permission denied or unavailable — silently keep the default
        // center rather than blocking the page on a prompt the user
        // might dismiss.
      }
    );
  }, []);

  const fetchCafes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: String(userLocation.latitude),
        lng: String(userLocation.longitude),
        radius: "8000",
      });
      const response = await fetch(`/api/cafes/search?${params}`);
      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }
      const data = (await response.json()) as { results: CafeResult[] };
      setCafes(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    fetchCafes();
  }, [fetchCafes]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row">
      <div className="relative flex-1">
        <Map
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            zoom: 13,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/light-v11"
        >
          <NavigationControl position="top-right" />

          {cafes.map((cafe) => (
            <Marker
              key={cafe.id}
              latitude={cafe.latitude}
              longitude={cafe.longitude}
              color={markerColor(cafe.matchScore)}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedCafe(cafe);
              }}
            />
          ))}

          {selectedCafe && (
            <Popup
              latitude={selectedCafe.latitude}
              longitude={selectedCafe.longitude}
              onClose={() => setSelectedCafe(null)}
              closeOnClick={false}
              anchor="bottom"
            >
              <div className="max-w-[220px] space-y-1 text-sm">
                <p className="font-medium text-stone-900">{selectedCafe.name}</p>
                {selectedCafe.address && (
                  <p className="text-stone-600">{selectedCafe.address}</p>
                )}
                <p className="text-stone-600">{formatMeta(selectedCafe)}</p>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      <aside className="w-full overflow-y-auto border-t border-stone-200 bg-stone-50 md:w-80 md:border-l md:border-t-0">
        <div className="border-b border-stone-200 p-4">
          <h2 className="text-sm font-medium text-stone-900">
            {loading ? "Searching..." : `${cafes.length} cafes nearby`}
          </h2>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <ul>
          {cafes.map((cafe) => (
            <li key={cafe.id} className="border-b border-stone-200">
              <button
                onClick={() => setSelectedCafe(cafe)}
                className="flex w-full flex-col items-start gap-0.5 p-4 text-left hover:bg-stone-100"
              >
                <span className="font-medium text-stone-900">{cafe.name}</span>
                <span className="text-xs text-stone-500">{formatMeta(cafe)}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
