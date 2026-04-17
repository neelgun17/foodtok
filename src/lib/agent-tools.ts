import type { SavedSpot } from "./store";
import { Type, type FunctionDeclaration } from "@google/genai";

export type LatLng = [number, number];

export interface RouteResult {
  polyline: LatLng[];
  distance_m: number;
  duration_s: number;
  degraded?: boolean;
}

export interface ReservationResult {
  url: string;
  provider: "resy" | "opentable" | "google" | "website";
}

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_walking_route",
    description:
      "Fetch a walking route through an ordered list of saved spots. Call this ONCE with the final ordered stops (2-4 items). Returns a polyline and total distance/duration.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        stops: {
          type: Type.ARRAY,
          description: "Ordered saved spot IDs to walk through.",
          items: {
            type: Type.OBJECT,
            properties: {
              savedId: { type: Type.STRING },
            },
            required: ["savedId"],
          },
        },
      },
      required: ["stops"],
    },
  },
  {
    name: "build_reservation_link",
    description:
      "Build a reservation URL for a dinner stop. Use for the sit-down meal stop only. Returns a deep link to Resy/OpenTable if the saved spot has one, else a Google search for reservations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        savedId: { type: Type.STRING },
        party_size: { type: Type.INTEGER },
        time_iso: {
          type: Type.STRING,
          description: "ISO-8601 datetime, e.g. 2026-04-20T19:30:00",
        },
      },
      required: ["savedId", "party_size", "time_iso"],
    },
  },
];

async function osrmRoute(coords: LatLng[]): Promise<RouteResult> {
  const coordStr = coords.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/foot/${coordStr}?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "food-map-demo/1.0" },
    });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = (await res.json()) as {
      routes?: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }[];
    };
    const route = data.routes?.[0];
    if (!route) throw new Error("No route found");
    return {
      polyline: route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng),
      distance_m: route.distance,
      duration_s: route.duration,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function straightLineFallback(coords: LatLng[]): RouteResult {
  let distance = 0;
  for (let i = 1; i < coords.length; i++) {
    distance += haversine(coords[i - 1], coords[i]);
  }
  return {
    polyline: coords,
    distance_m: distance,
    duration_s: distance / 1.4,
    degraded: true,
  };
}

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function executeGetWalkingRoute(
  args: { stops?: { savedId: string }[] },
  spots: SavedSpot[],
): Promise<{ result: RouteResult; orderedSavedIds: string[] }> {
  const ids = (args.stops ?? []).map((s) => s.savedId).filter(Boolean);
  const ordered = ids
    .map((id) => spots.find((s) => s.savedId === id))
    .filter((s): s is SavedSpot => !!s && (s.location.lat !== 0 || s.location.lng !== 0));
  if (ordered.length < 2) {
    throw new Error("Need at least 2 valid stops with coordinates");
  }
  const coords: LatLng[] = ordered.map((s) => [s.location.lat, s.location.lng]);
  try {
    const result = await osrmRoute(coords);
    return { result, orderedSavedIds: ordered.map((s) => s.savedId) };
  } catch {
    return { result: straightLineFallback(coords), orderedSavedIds: ordered.map((s) => s.savedId) };
  }
}

export function executeBuildReservationLink(
  args: { savedId?: string; party_size?: number; time_iso?: string },
  spots: SavedSpot[],
): ReservationResult {
  const spot = spots.find((s) => s.savedId === args.savedId);
  if (!spot) throw new Error(`Unknown savedId: ${args.savedId}`);
  const website = spot.websiteUrl ?? "";
  if (/resy\.com/i.test(website)) return { url: website, provider: "resy" };
  if (/opentable\.com/i.test(website)) return { url: website, provider: "opentable" };
  const city = spot.location.city || spot.location.neighborhood || "";
  const query = encodeURIComponent(`reserve ${spot.restaurantName} ${city}`.trim());
  return {
    url: `https://www.google.com/search?q=${query}`,
    provider: "google",
  };
}
