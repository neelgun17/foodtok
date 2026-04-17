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
- Respect walkability (stops should be in the same city/neighborhood when possible), the user's budget, and any free-form hours text.
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
