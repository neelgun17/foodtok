# Food Map — Final Demo Enhancement Plan

**Project:** `Tiktok/food-map` (Next.js 16 App Router + TypeScript + Tailwind + Zustand + Leaflet)
**Goal:** Ship 3 meaningful, state-of-the-art enhancements for the Pitch-to-Prototype Final Demo (due 2026-04-21, dry run 2026-04-17). Iteration is the heaviest-weighted rubric category (8/25).

## Current State (V1.4)

A working MVP with:
- Simulated TikTok-style feed (8 hardcoded mock food review cards)
- "Save to Food Map" button with idempotent saves + toast
- Interactive Leaflet map + sidebar list with bidirectional pin/list sync
- Search/filter by restaurant/dish/city (substring match)
- Detail modal with notes (localStorage-persisted), dish chips, hours, ordering links (DoorDash/Uber Eats/Website)
- Zustand store persisted to localStorage (no backend, no auth)

Known limitations to address: mock data only, no real input source, localStorage-only, keyword-only search.

## The 3 Enhancements

### Enhancement 1 — In-App Capture with Multimodal AI Extraction

**What changes:** Replace the "mock feed only" input with a real in-app capture flow. Add a center "+" button in the bottom nav that opens a capture sheet with two modes:
- **Record:** device camera via `getUserMedia` + `MediaRecorder` API, shoot a 5–30s clip of storefront / menu / dish.
- **Upload:** pick existing video or photos from the camera roll.

Pipeline:
1. Clip/photos uploaded to a Next.js route handler.
2. For video: extract keyframes (ffmpeg.wasm in-browser OR server-side ffmpeg) + transcribe audio with Whisper.
3. Send frames + transcript to Gemini with a structured-output prompt.
4. Gemini returns JSON: `{ name, dishes[], vibe_tags[], price_tier, best_guess_address, confidence }`.
5. Geocode address via Google Places API → lat/lng.
6. Show pre-filled confirmation card; user taps Save → pin drops on map.

**Why:** The simulated feed is the biggest "this isn't real" tell in the MVP. Multimodal extraction from short video (OCR'ing menu boards, recognizing dishes from frames, fusing with audio narration) is genuinely state-of-the-art and demos Gemini vision capabilities. Entire loop stays in-app — no context switching.

**Critical constraint from user:** The user must NOT have to leave the app. No "paste a TikTok URL" flows. Capture/upload must happen inside the PWA.

**Acceptance criteria:**
- Tapping "+" opens a capture sheet without a page navigation.
- Recording or uploading a clip produces a populated confirmation card in <10s on a decent connection.
- Saved pin appears on `/map` with AI-extracted name + dishes + address.
- Graceful fallback when AI can't extract an address (let user type it).

**Key files likely to touch:** `src/app/layout.tsx` (bottom nav), new `src/app/api/extract/route.ts`, new `src/components/CaptureSheet.tsx`, Zustand store in `src/lib/` (add `addSpot` action), new `src/lib/ai.ts` for Gemini client.

**Env vars needed:** `GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`, optionally `OPENAI_API_KEY` for Whisper.

---

### Enhancement 2 — Semantic "Vibe" Search with Embeddings + Context-Aware Re-ranking

**What changes:** Replace the substring filter on `/map` with true vector search.

Pipeline:
1. On every save, embed the spot's combined text (name + dishes + user notes + AI vibe tags + transcript snippet) using `voyage-3-large` or OpenAI `text-embedding-3-small`. Store the vector alongside the spot.
2. On query, embed the user's natural-language query the same way, compute cosine similarity, return top-K.
3. Re-rank the top-K by:
   - Distance from current GPS location (browser `navigator.geolocation`)
   - Open-now filter based on stored hours + current local time
   - Optional price-tier filter if query mentions budget
4. Show ranked results in the sidebar + highlight pins on the map.

Example queries that should work:
- "cozy date night with natural wine"
- "quick lunch under $15 near me"
- "warm noodles for a rainy day"
- "somewhere to bring my parents"

**Why:** Goes from keyword matching to true natural-language retrieval — the pattern behind Perplexity, Arc Search, modern recsys. Combines embeddings + structured filters + geospatial ranking. Strong before/after demo: "ramen" returns 2 results today; "warm noodles for a rainy day" returns 5.

**Acceptance criteria:**
- A query that shares zero keywords with any saved spot still returns semantically relevant results.
- Results re-rank when the user moves (geo-change triggers refresh).
- Closed restaurants are visually de-emphasized or filtered based on a toggle.
- Latency <500ms for queries over ≤100 saved spots (in-memory cosine is fine at this scale; no need for a vector DB yet).

**Key files likely to touch:** `src/app/map/page.tsx` (search bar component), new `src/lib/embeddings.ts`, new `src/app/api/embed/route.ts`, Zustand store (add `vector` field to spot schema).

**Pairs with Enhancement 4 (Plan My Night)** — they share the retrieval layer, so build the embedding infra once.

---

### Enhancement 3 — Agentic "Plan My Night" Itinerary Builder

**What changes:** Add a "Plan" button on `/map` that opens a chat input. User describes a night in natural language; a Gemini-powered agent turns saved spots into a routed itinerary.

Example input: *"date night Saturday, drinks then dinner then dessert, walkable, under $120 total"*

Agent loop (Gemini with tool use):
1. **Tool: `filter_spots`** — filters saved spots by cuisine, price tier, hours (open during the target window), category.
2. **Tool: `sequence`** — orders the shortlisted spots into a logical flow (bar → dinner → dessert) respecting opening-hour windows.
3. **Tool: `route`** — calls Mapbox Directions or Google Directions for walking route; returns polyline + ETA + distance.
4. **Tool: `reserve`** — generates OpenTable/Resy deep links (pre-filled party size + time) for the dinner stop.
5. Streams reasoning to the UI ("Checking which bars are open at 7pm… Tartine closes at 8, swapping for Mr. Holmes…") via SSE.

UI: overlay a numbered (1, 2, 3) route on the existing Leaflet map, reasoning stream in a side panel, reservation CTA on the relevant stop.

**Why:** True agentic loop — tool use, multi-step planning, real-world constraints (hours, distance, budget). This is the pattern behind Operator, Manus, the current agent wave. It reuses every other feature (saved spots, hours, map, geocoding, embeddings from #2) and solves the actual user problem: *deciding where to go tonight* is harder than saving spots.

**Acceptance criteria:**
- Agent produces a 2–4 stop plan in <15s for a realistic query.
- Route renders on the existing map with numbered pins.
- Reasoning/tool-call stream is visible to the user during generation (do not hide the thinking).
- At least one stop includes a working reservation deep link.
- Handles "no valid plan" gracefully (e.g., nothing open at that time) by explaining why and suggesting changes.

**Key files likely to touch:** new `src/app/api/plan/route.ts` (SSE streaming endpoint), new `src/components/PlanPanel.tsx`, new `src/lib/agent-tools.ts` (tool definitions), map component additions for route polyline.

**Gemini SDK feature to use:** tool use + streaming.

---

---

### Enhancement 4 — Friend Maps + Collaborative Discovery Feed

**What changes:** Transform the single-player localStorage app into a social product.

- Real backend: Supabase or Convex (Postgres + auth + realtime in one). Migrate the Zustand store to sync through it.
- Auth: magic-link or Google OAuth.
- **Follow graph:** users can follow friends.
- **Friends' Map view:** a toggle on `/map` overlays every followed friend's saved spots on the same Leaflet map, color-coded per user, with avatars on the pins.
- **Proximity push notifications:** when a followed friend saves a spot within 1 mile of your current location, fire a web-push notification ("Sarah saved Joe's Pizza — 2 blocks away"). Use the Web Push API + a service worker.
- **Shareable public maps:** `/u/[username]` renders a read-only version of a user's map that anyone can open without an account.

**Why it's impressive:**
- Real network effect — the actual reason someone would pick this over Google Maps lists. Lean-Canvas–aligned business thinking (hits the rubric bullet on integrating business thinking).
- Hits multiple rubric categories at once: major architecture upgrade (Postgres + auth + realtime), live deployment implied, UX-driven workflow improvement.
- Web Push from a PWA is genuinely hard to get right and demos well on a phone.

**Acceptance criteria:**
- A second user account can follow the demo account and see their pins appear live on the friends' map without a refresh.
- Saving a spot on one device triggers a push notification on another device (when within proximity threshold).
- `/u/[username]` loads without login and renders the public map correctly.

**Key files likely to touch:** new `src/lib/db.ts` (Supabase/Convex client), new `src/app/api/auth/*`, new `src/app/u/[username]/page.tsx`, new `public/sw.js` service worker for push, Zustand store refactor to sync remote + local.

**Env vars needed:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or Convex equivalents), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` for web push.

---

## Build Order (Recommended)

1. **Enhancement 1 first.** It unblocks real data flowing into the system. Without it, #2 and #3 still operate on 8 mock cards and the demo feels hollow.
2. **Enhancement 2 second.** Share the embedding pipeline with #3. Lower-risk than #3.
3. **Enhancement 3 third.** Highest-risk / highest-reward. Depends on #1 (for real saved spots) and #2 (for retrieval) to be maximally impressive.
4. **Enhancement 4 last (optional 4th, not required for rubric).** Large surface area (auth + backend + realtime + push) — only tackle if #1–#3 are solid and there's time before the 4/17 dry run. Skip if schedule is tight.

## Demo Script Hooks (per rubric)

For each enhancement, the written submission and video must state:
- **What changed** (concrete before/after)
- **Why** (user problem or technical motivation)
- **Result** (better / worse / unchanged — failed attempts still earn credit)

Suggested demo moments:
- **#1:** On camera, tap "+", record a 6-second pan of a storefront, stop. ~5s later a card appears with name + address + dishes. Tap save → pin on map.
- **#2:** Type "warm noodles for a rainy day" → semantically matched spots appear that "ramen" wouldn't have found.
- **#3:** Type one sentence describing a night out → watch numbered route draw on map while reasoning streams in side panel → tap stop #2 → reservation link opens.
- **#4:** On a phone, follow a friend → friend saves a spot on their device → push notification arrives → open the friends' map and see their pin appear live.

## Non-Goals (explicitly skip to stay focused)

- Payment / monetization flows.
- Native mobile app (PWA is sufficient).
- Auth-as-enhancement on its own — auth only appears as infrastructure for #4, not as a headline feature.

## Reference

- Rubric: `/Users/neelgundlapally/Documents/Final Demo Day Student Guide.pdf`
- Current project: `/Users/neelgundlapally/Documents/Projects/demos/Tiktok/food-map`
- Changelog through V1.4: `Tiktok/food-map/CHANGELOG.md`
