import { GoogleGenAI } from "@google/genai";

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

const EXTRACTION_SYSTEM = `You analyze photos from inside or outside a restaurant: storefronts, menu boards, dishes on the table, interiors, receipts, and packaging.

Extract a best-effort structured summary of the restaurant.

Rules:
- Read visible signage carefully, including storefront names, menu headers, addresses, receipts, branded cups, and window decals.
- Identify dishes from visible menu items or plated food. Keep the list short and concrete.
- "vibe_tags" should be short phrases capturing atmosphere, such as "cozy", "natural wine", "late-night", "counter seating", or "family-style".
- price_tier: 1=cheap/quick (under $15/person), 2=mid ($15-40), 3=upscale ($40+). Infer from decor, menu prices, and presentation.
- best_guess_address: only fill this if you can literally read an address or clearly infer a named restaurant plus city from the images. Otherwise return an empty string.
- confidence: number from 0.0 to 1.0 based on how certain you are about the restaurant identity and address.
- notes: one short sentence the user might want as a personal reminder.
- If something is unclear, prefer conservative guesses over hallucination.
- Return JSON only matching the requested schema.`;

const EXTRACTION_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "cuisine",
    "dishes",
    "vibe_tags",
    "price_tier",
    "best_guess_address",
    "confidence",
    "notes",
  ],
  properties: {
    name: { type: "string" },
    cuisine: { type: "string" },
    dishes: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 5,
    },
    vibe_tags: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 5,
    },
    price_tier: {
      type: "integer",
      enum: [1, 2, 3],
    },
    best_guess_address: { type: "string" },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    notes: { type: "string" },
  },
} as const;

function clampTier(value: unknown): 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 2;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function normalizeStringArray(value: unknown, maxItems = 5): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export async function extractSpotFromImages(
  images: { mediaType: string; base64: string }[],
): Promise<ExtractedSpot> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          ...images.map((img) => ({
            inlineData: {
              data: img.base64,
              mimeType: img.mediaType,
            },
          })),
          {
            text: "Extract the restaurant info as JSON matching the requested schema. Return JSON only.",
          },
        ],
      },
    ],
    config: {
      systemInstruction: EXTRACTION_SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: EXTRACTION_RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  });

  const cleaned = response.text?.trim();
  if (!cleaned) {
    throw new Error("No JSON response from Gemini");
  }

  let parsed: Partial<ExtractedSpot>;
  try {
    parsed = JSON.parse(cleaned) as Partial<ExtractedSpot>;
  } catch {
    throw new Error("Invalid JSON from Gemini: " + cleaned.slice(0, 200));
  }

  return {
    name: typeof parsed.name === "string" ? parsed.name.trim() : "",
    cuisine: typeof parsed.cuisine === "string" ? parsed.cuisine.trim() : "",
    dishes: normalizeStringArray(parsed.dishes),
    vibe_tags: normalizeStringArray(parsed.vibe_tags),
    price_tier: clampTier(parsed.price_tier),
    best_guess_address:
      typeof parsed.best_guess_address === "string" ? parsed.best_guess_address.trim() : "",
    confidence: clampConfidence(parsed.confidence),
    notes: typeof parsed.notes === "string" ? parsed.notes.trim() : "",
  };
}
