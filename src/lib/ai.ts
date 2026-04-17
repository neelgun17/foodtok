import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedSpot {
  name: string;
  cuisine: string;
  dishes: string[];
  vibe_tags: string[];
  price_tier: 1 | 2 | 3;
  best_guess_address: string;
  confidence: number;
  notes: string;
}

const EXTRACTION_SYSTEM = `You analyze photos from inside or outside a restaurant — storefronts, menu boards, dishes on the table, interiors — and extract structured information about the spot.

Rules:
- Read any visible signage carefully (storefront names, menu headers, receipts, branded cups/napkins).
- Identify dishes from visible menu items or plated food.
- Vibe tags should be short adjectives/phrases capturing atmosphere (e.g. "cozy", "natural wine", "late-night", "counter seating").
- price_tier: 1=cheap/quick (under $15/person), 2=mid ($15-40), 3=upscale ($40+). Guess from decor, menu prices, presentation.
- best_guess_address: only fill if you can literally read an address or a clearly named business + city. Otherwise empty string.
- confidence: 0.0-1.0 on how sure you are about name/address.
- Return ONLY valid JSON matching the schema. No prose, no markdown code fences.`;

const SCHEMA_HINT = `{
  "name": string,                 // restaurant name, "" if unknown
  "cuisine": string,              // e.g. "Italian", "Ramen", "Cafe"
  "dishes": string[],             // up to 5 visible or likely dishes
  "vibe_tags": string[],          // up to 5 short tags
  "price_tier": 1 | 2 | 3,
  "best_guess_address": string,   // full address or "<name>, <city>" if partial; "" if unknown
  "confidence": number,           // 0.0-1.0
  "notes": string                 // one short sentence the user might want as their personal note
}`;

export async function extractSpotFromImages(
  images: { mediaType: string; base64: string }[],
): Promise<ExtractedSpot> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: EXTRACTION_SYSTEM + "\n\nSchema:\n" + SCHEMA_HINT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          ...images.map(
            (img) =>
              ({
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: img.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                  data: img.base64,
                },
              }),
          ),
          {
            type: "text",
            text: "Extract the restaurant info as JSON matching the schema. Return JSON only.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const cleaned = textBlock.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  let parsed: Partial<ExtractedSpot>;
  try {
    parsed = JSON.parse(cleaned) as Partial<ExtractedSpot>;
  } catch {
    throw new Error("Invalid JSON from model: " + cleaned.slice(0, 200));
  }

  const tier = parsed.price_tier;
  return {
    name: typeof parsed.name === "string" ? parsed.name : "",
    cuisine: typeof parsed.cuisine === "string" ? parsed.cuisine : "",
    dishes: Array.isArray(parsed.dishes) ? parsed.dishes.slice(0, 5) : [],
    vibe_tags: Array.isArray(parsed.vibe_tags) ? parsed.vibe_tags.slice(0, 5) : [],
    price_tier: tier === 1 || tier === 2 || tier === 3 ? tier : 2,
    best_guess_address: typeof parsed.best_guess_address === "string" ? parsed.best_guess_address : "",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    notes: typeof parsed.notes === "string" ? parsed.notes : "",
  };
}
