import { GoogleGenAI, type Content, type FunctionCall } from "@google/genai";
import type { SavedSpot } from "./store";
import {
  toolDeclarations,
  executeGetWalkingRoute,
  executeBuildReservationLink,
  type LatLng,
} from "./agent-tools";

const SYSTEM_INSTRUCTION = `You are a local-nightlife planner. Given a user's brief and their saved restaurants, build a 2-4 stop itinerary using ONLY those saved spots.
Rules:
- Respect walkability, the user's budget, and any free-form hours text.
- Prefer actual coordinate proximity over exact neighborhood-name matches. Adjacent neighborhoods can still count as walkable if the overall route stays compact.
- Unless the user gives an exact time, assume a dinner/night-out plan starts in the early evening. Do not reject a good nearby stop only because its neighborhood label differs slightly from the user's wording.
- When multiple spots are plausible, prefer creating a compact 2-stop or 3-stop plan over failing just because the perfect neighborhood match does not exist.
- Use tools: call get_walking_route ONCE on the final ordered stops, then build_reservation_link for the sit-down dinner stop if applicable.
- After tools return, produce a final plain-text summary with a one-sentence rationale per stop, prefixed by "1.", "2.", etc.
- If no valid plan exists, say so briefly and suggest how the user could change the brief. Do NOT call tools in that case.
- Never invent spots. Only reference savedIds from the provided list.`;

export type PlanEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; summary: string }
  | { type: "stops"; orderedSavedIds: string[] }
  | { type: "route"; polyline: LatLng[]; distance_m: number; duration_s: number; degraded?: boolean }
  | { type: "reservation"; savedId: string; url: string; provider: string }
  | { type: "final"; summary: string }
  | { type: "error"; message: string };

interface FallbackPlan {
  orderedSavedIds: string[];
  polyline: LatLng[];
  distance_m: number;
  duration_s: number;
  degraded?: boolean;
  reservation?: { savedId: string; url: string; provider: string };
  summary: string;
}

interface CompactSpot {
  savedId: string;
  restaurantName: string;
  cuisine: string;
  dishes: string[];
  priceLevel?: number;
  hours?: string;
  lat: number;
  lng: number;
  neighborhood: string;
  city: string;
  hasReservationSite: boolean;
}

function compact(spots: SavedSpot[]): CompactSpot[] {
  return spots
    .filter((s) => s.location.lat !== 0 || s.location.lng !== 0)
    .map((s) => ({
      savedId: s.savedId,
      restaurantName: s.restaurantName,
      cuisine: s.cuisine,
      dishes: s.dishes.slice(0, 3),
      priceLevel: s.priceLevel,
      hours: s.hours,
      lat: s.location.lat,
      lng: s.location.lng,
      neighborhood: s.location.neighborhood,
      city: s.location.city,
      hasReservationSite: /resy\.com|opentable\.com/i.test(s.websiteUrl ?? ""),
    }));
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

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  if (size === 1) return items.map((item) => [item]);

  const result: T[][] = [];
  items.forEach((item, index) => {
    const tails = combinations(items.slice(index + 1), size - 1);
    tails.forEach((tail) => result.push([item, ...tail]));
  });
  return result;
}

function isNightBrief(brief: string): boolean {
  return /night|date|dinner|drinks|dessert|evening|tonight/i.test(brief);
}

function closesLateEnough(hours?: string): boolean {
  if (!hours) return true;
  const match = hours.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*$/i);
  if (!match) return true;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2] ?? "0", 10);
  const suffix = match[3].toLowerCase();
  if (suffix === "pm" && hour !== 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return hour > 20 || (hour === 20 && minute >= 0) || hour < 4;
}

function includesDessert(spot: SavedSpot): boolean {
  return (
    /dessert|gelato|ice cream|bakery|sweet/i.test(spot.cuisine) ||
    spot.dishes.some((dish) => /dessert|gelato|ice cream|cake|tiramisu|pudding/i.test(dish))
  );
}

function clusterScore(cluster: SavedSpot[], brief: string): number {
  let score = 0;
  for (let i = 0; i < cluster.length; i++) {
    for (let j = i + 1; j < cluster.length; j++) {
      score += haversine(
        [cluster[i].location.lat, cluster[i].location.lng],
        [cluster[j].location.lat, cluster[j].location.lng],
      );
    }
  }

  if (isNightBrief(brief)) {
    cluster.forEach((spot) => {
      if (!closesLateEnough(spot.hours)) score += 5000;
    });
  }

  if (/dessert/i.test(brief) && !cluster.some(includesDessert)) score += 1500;
  if (/date|dinner/i.test(brief) && !cluster.some((spot) => (spot.priceLevel ?? 1) >= 2)) {
    score += 800;
  }

  return score;
}

function orderCluster(cluster: SavedSpot[]): SavedSpot[] {
  if (cluster.length <= 2) {
    return [...cluster].sort((a, b) => a.location.lng - b.location.lng);
  }

  const remaining = [...cluster];
  remaining.sort((a, b) => a.location.lng - b.location.lng);
  const ordered = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    remaining.sort((a, b) => {
      const da = haversine([last.location.lat, last.location.lng], [a.location.lat, a.location.lng]);
      const db = haversine([last.location.lat, last.location.lng], [b.location.lat, b.location.lng]);
      return da - db;
    });
    ordered.push(remaining.shift()!);
  }

  return ordered;
}

function pickDinnerStop(cluster: SavedSpot[], brief: string): SavedSpot | null {
  const nonDessert = cluster.filter((spot) => !includesDessert(spot));
  const pool = nonDessert.length > 0 ? nonDessert : cluster;
  if (pool.length === 0) return null;

  const ranked = [...pool].sort((a, b) => {
    const aScore = (a.priceLevel ?? 1) + (a.websiteUrl ? 0.5 : 0);
    const bScore = (b.priceLevel ?? 1) + (b.websiteUrl ? 0.5 : 0);
    return bScore - aScore;
  });

  if (/ramen|taco|casual|cheap/i.test(brief) && ranked.length > 1) {
    return ranked[Math.min(1, ranked.length - 1)];
  }
  return ranked[0];
}

async function buildFallbackPlan(brief: string, spots: SavedSpot[]): Promise<FallbackPlan | null> {
  const candidates = spots.filter((s) => s.location.lat !== 0 || s.location.lng !== 0);
  if (candidates.length < 2) return null;

  const targetSizes = /2-3|2 or 3|two or three/i.test(brief)
    ? [3, 2]
    : /3|three/i.test(brief)
      ? [3, 2]
      : [2, 3];

  let best: SavedSpot[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const size of targetSizes) {
    for (const combo of combinations(candidates, Math.min(size, candidates.length))) {
      if (combo.length < 2) continue;
      const score = clusterScore(combo, brief);
      if (score < bestScore) {
        best = combo;
        bestScore = score;
      }
    }
    if (best) break;
  }

  if (!best) return null;

  const ordered = orderCluster(best);
  const { result, orderedSavedIds } = await executeGetWalkingRoute(
    { stops: ordered.map((spot) => ({ savedId: spot.savedId })) },
    spots,
  );

  const dinnerStop = pickDinnerStop(ordered, brief);
  const reservation = dinnerStop
    ? {
        savedId: dinnerStop.savedId,
        ...executeBuildReservationLink(
          {
            savedId: dinnerStop.savedId,
            party_size: 2,
            time_iso: new Date().toISOString(),
          },
          spots,
        ),
      }
    : undefined;

  const summary = ordered
    .map((spot, index) => {
      const reasons: string[] = [];
      if (index === 0) reasons.push("easy first stop");
      if (includesDessert(spot)) reasons.push("good dessert finish");
      if ((spot.priceLevel ?? 1) >= 3) reasons.push("strong date-night pick");
      if (spot.hours) reasons.push(`hours: ${spot.hours}`);
      return `${index + 1}. ${spot.restaurantName} for ${reasons.join(", ") || "a compact nearby stop"}.`;
    })
    .join("\n");

  return {
    orderedSavedIds,
    polyline: result.polyline,
    distance_m: result.distance_m,
    duration_s: result.duration_s,
    degraded: result.degraded,
    reservation,
    summary,
  };
}

export async function* runPlanAgent(
  brief: string,
  spots: SavedSpot[],
): AsyncGenerator<PlanEvent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    yield { type: "error", message: "GEMINI_API_KEY not set" };
    return;
  }

  const compactSpots = compact(spots);
  if (compactSpots.length < 2) {
    yield {
      type: "error",
      message: "You need at least 2 saved spots with locations to plan a night.",
    };
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents: Content[] = [
    {
      role: "user",
      parts: [
        {
          text: `User brief: ${brief}\n\nSaved spots (JSON):\n${JSON.stringify(compactSpots)}`,
        },
      ],
    },
  ];

  yield { type: "status", message: "Picking stops…" };

  const MAX_TURNS = 4;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          maxOutputTokens: 1024,
          tools: [{ functionDeclarations: toolDeclarations }],
        },
      });
    } catch (err) {
      yield { type: "error", message: err instanceof Error ? err.message : String(err) };
      return;
    }

    const calls: FunctionCall[] = response.functionCalls ?? [];
    const text = response.text ?? "";

    if (calls.length === 0) {
      const fallback = await buildFallbackPlan(brief, spots);
      if (fallback) {
        yield { type: "status", message: "Using local fallback planner…" };
        yield { type: "stops", orderedSavedIds: fallback.orderedSavedIds };
        yield {
          type: "route",
          polyline: fallback.polyline,
          distance_m: fallback.distance_m,
          duration_s: fallback.duration_s,
          degraded: fallback.degraded,
        };
        if (fallback.reservation) {
          yield {
            type: "reservation",
            savedId: fallback.reservation.savedId,
            url: fallback.reservation.url,
            provider: fallback.reservation.provider,
          };
        }
        yield { type: "final", summary: fallback.summary };
        return;
      }

      const finalText = text.trim() || "No plan produced.";
      yield { type: "final", summary: finalText };
      return;
    }

    contents.push({
      role: "model",
      parts: calls.map((c) => ({ functionCall: c })),
    });

    const responseParts: Content["parts"] = [];
    for (const call of calls) {
      const name = call.name ?? "";
      const args = (call.args ?? {}) as Record<string, unknown>;
      yield { type: "tool_call", name, args };

      try {
        if (name === "get_walking_route") {
          yield { type: "status", message: "Routing walking path…" };
          const { result, orderedSavedIds } = await executeGetWalkingRoute(
            args as { stops?: { savedId: string }[] },
            spots,
          );
          yield { type: "stops", orderedSavedIds };
          yield {
            type: "route",
            polyline: result.polyline,
            distance_m: result.distance_m,
            duration_s: result.duration_s,
            degraded: result.degraded,
          };
          yield {
            type: "tool_result",
            name,
            summary: `${orderedSavedIds.length} stops, ${(result.distance_m / 1000).toFixed(2)} km, ~${Math.round(result.duration_s / 60)} min walking${result.degraded ? " (fallback)" : ""}`,
          };
          responseParts!.push({
            functionResponse: {
              name,
              response: {
                result: {
                  orderedSavedIds,
                  distance_m: Math.round(result.distance_m),
                  duration_s: Math.round(result.duration_s),
                  degraded: !!result.degraded,
                },
              },
            },
          });
        } else if (name === "build_reservation_link") {
          yield { type: "status", message: "Building reservation link…" };
          const res = executeBuildReservationLink(
            args as { savedId?: string; party_size?: number; time_iso?: string },
            spots,
          );
          const savedId = (args as { savedId?: string }).savedId ?? "";
          yield {
            type: "reservation",
            savedId,
            url: res.url,
            provider: res.provider,
          };
          yield {
            type: "tool_result",
            name,
            summary: `Reservation link via ${res.provider}`,
          };
          responseParts!.push({
            functionResponse: {
              name,
              response: { result: { url: res.url, provider: res.provider } },
            },
          });
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        yield { type: "tool_result", name, summary: `error: ${msg}` };
        responseParts!.push({
          functionResponse: { name, response: { error: msg } },
        });
      }
    }

    contents.push({ role: "user", parts: responseParts });
  }

  yield {
    type: "error",
    message: "Agent hit max turns without a final plan.",
  };
}
