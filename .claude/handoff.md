# Handoff

## Goal
Ship the three final-demo enhancements for `Tiktok/food-map` (Next.js 16 App Router + React 19 + Tailwind 4 + Zustand + Leaflet). Dry run 2026-04-17, due 2026-04-21.

- **Enhancement 1** — in-app capture (record or upload) → Claude vision extraction → Nominatim geocode → pin on map. **DONE, committed, pushed.**
- **Enhancement 3** — agentic "Plan My Night" itinerary builder with Gemini Flash tool-use + SSE streaming + polyline route on map. **DONE, committed, pushed.**
- **Enhancement 4 (share slice)** — public read-only map at `/s/[id]` via URL-hash snapshot (gzip + base64url). **NOT STARTED.**

(Original Enhancement 2 — semantic vector search — was cut in prior handoff; staying cut.)

## Progress
- `package.json` / `package-lock.json`: added `@anthropic-ai/sdk ^0.90.0` (Enh-1) and `@google/genai ^1.50.1` (Enh-3).
- `src/lib/ai.ts` (new): Anthropic client using `claude-opus-4-7` vision; extracts `{name, cuisine, dishes, vibe_tags, price_tier, best_guess_address, confidence, notes}` as JSON. Reads `ANTHROPIC_API_KEY` from env.
- `src/app/api/extract/route.ts` (new): multipart POST, ≤4 images, ≤8MB each, JPEG/PNG/WebP/GIF.
- `src/app/api/geocode/route.ts` (new): GET `?q=...`, hits Nominatim `search` endpoint with `User-Agent: food-map-demo/1.0`.
- `src/components/CaptureSheet.tsx` (new): two entry points (video record/upload, photo upload). Video branch extracts 3 keyframes via `HTMLVideoElement` + canvas. Stages: `pick → extracting → confirm → saving`. Confirmation form lets user edit all fields before save.
- `src/components/NavBar.tsx`: added a "Capture Spot" button that mounts `CaptureSheet`.
- `src/lib/store.ts`: added `addSpot` action (separate from legacy `saveSpot`) that returns the new `SavedSpot` and seeds default fields.
- `src/components/MapView.tsx`: Enh-1 filtered out zero-coord pins. Enh-3 extended it with an optional `route?: { stops, polyline }` prop — renders `<Polyline>` plus numbered `L.divIcon` markers; other saved pins dim to 40%. `FitBounds` takes a `signature` string so it only re-fits on meaningful changes, not every parent render.
- `src/lib/agent-tools.ts` (new): `FunctionDeclaration[]` for Gemini (`get_walking_route`, `build_reservation_link`) plus executors. Route executor calls OSRM public demo (`https://router.project-osrm.org/route/v1/foot/...`), 5 s timeout, swaps `[lng,lat]` → `[lat,lng]` for Leaflet; straight-line haversine fallback on any error. Reservation executor checks `websiteUrl` for `resy.com` / `opentable.com`, else returns a Google "reserve {name} {city}" search URL with `provider: "google"`.
- `src/lib/agent.ts` (new): `runPlanAgent(brief, spots)` async generator. `gemini-2.5-flash`, `maxOutputTokens: 1024`, bounded 4 turns. Emits typed `PlanEvent`s (`status | tool_call | tool_result | stops | route | reservation | final | error`). Compacts spots before sending (drops notes/rating/videoUrl/collection; adds `hasReservationSite`).
- `src/app/api/plan/route.ts` (new): POST, consumes `{brief, spots}`, wraps generator in a `ReadableStream` emitting SSE (`event: <type>\ndata: <json>\n\n`).
- `src/lib/sse.ts` (new): tiny client-side SSE reader (handles `event:`, `data:`, CRLF, multi-line data concat).
- `src/components/PlanPanel.tsx` (new): brief textarea, streaming agent trace list, final numbered-stops card with per-stop reservation CTA. Uses `useRef(0)` counter for trace keys. Holds an `AbortController` in a ref; aborts on unmount and on close button; swallows `AbortError`. Mounted as a fixed right-side 380px panel (full-width on mobile).
- `src/app/map/page.tsx`: added "🗓️ Plan Night" toolbar toggle; holds `plan: PlanResult | null`; passes `{ stops, polyline }` into `MapView.route`.

## Dead Ends
- **ffmpeg.wasm for keyframe extraction** (Enh-1): rejected pre-implementation. Using `HTMLVideoElement` + `canvas.toBlob('image/jpeg', 0.85)` instead — no wasm dep, no server CPU.
- **Whisper / audio transcription** (Enh-1): cut. Frames cover storefront/menu/dish equally well; skips a whole subsystem.
- **Anthropic Claude for the Enh-3 agent loop**: user directive — use Gemini Flash because they already pay for it and don't want to stack another paid key for this feature. Enh-1 stays on Anthropic because it was already built against it.
- **Mapbox Directions**: rejected in favor of OSRM to avoid adding `MAPBOX_ACCESS_TOKEN`.
- **Supabase/Convex + web push (full Enh-4)**: rejected — 4-day window, iOS PWA push is demo-hostile. Replaced with URL-hash shareable snapshot.
- **Semantic vector search (original Enh-2)**: cut. Low demo differentiation vs. effort.
- **Opus 4.7 for agent loop**: not picked — Gemini Flash chosen instead (user directive above). Sonnet 4.6 was the Anthropic fallback if we'd stayed on Claude.
- **Streaming Gemini tool calls**: cross-SDK behavior is underspecified. Using non-streaming `ai.models.generateContent` and emitting synthetic SSE events between turns so the UI still animates.
- **`filter_spots` / `sequence` as agent tools**: cut. Pass the compacted spots list in the user turn; let the model's reasoning do sequencing. Only two tools remain: `get_walking_route`, `build_reservation_link`.

## Current State
- `main` is at commit `ca70342`, pushed to `origin`. Two feat commits: Enh-1 (`feat: in-app capture with Claude multimodal extraction`) and Enh-3 (`feat: agentic Plan My Night itinerary builder`).
- `.env.local` exists locally with `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` (gitignored via Next's default pattern). **No `.env.example` committed yet** — if another teammate clones, they need to know the two keys.
- `npm run build` passes. `npm run lint` has one pre-existing warning only (`setCollection` unused in `src/app/map/page.tsx:16`).
- **Live smoke test passed** against Gemini 2.5 Flash: 2 Rainey-St spots → agent emitted `get_walking_route` (OSRM returned 1.49 km, ~4 min walk, 68-point polyline) → `build_reservation_link` (picked up Resy URL from `websiteUrl`) → clean final summary. "No plan" path also verified when spots are ~3 mi apart with a "walkable" brief.
- Untracked (intentionally excluded from all commits): `.claude/`, `plan.md`.

## Next Steps
1. Build the **Enhancement 4 share slice**:
   - `src/lib/share.ts` — CompressionStream gzip + base64url encode/decode of a minimal snapshot `{spots, optionalPlan?}`.
   - `src/app/s/[id]/page.tsx` — client-only route that reads `window.location.hash`, decodes, renders a read-only version of the map.
   - `src/components/PublicMapView.tsx` — thin wrapper over `MapView` with `interactive: false`-ish affordances (no edit, no remove, no plan).
   - `src/components/ShareButton.tsx` — button on `/map` that copies `/s/x#<payload>` to clipboard.
   - Add `interactive?: boolean` prop (or extract shared read-only logic) into `MapView.tsx` to disable the remove/plan/etc. actions — currently edit affordances live in `map/page.tsx`, so the public page can simply not render them; may not need a MapView prop after all.
   - Fallback for payloads > ~6 KB compressed: note a follow-up Upstash Redis REST shim (30-min add-on) but don't build it preemptively.
2. Add `.env.example` with `ANTHROPIC_API_KEY=` and `GEMINI_API_KEY=` as stubs. Commit separately as `chore:`.
3. Record demo video. Script hooks already outlined in `plan.md`.
4. Write the final rubric submission: call out the cuts (Enh-2 semantic search, Enh-4 full social, Whisper, ffmpeg.wasm) as explicit iteration decisions — the rubric credits documented trade-offs.

## Key Decisions
- **LLM split**: Enhancement 1 uses Anthropic `claude-opus-4-7`. Enhancement 3 uses Google `gemini-2.5-flash`. Do NOT migrate Enh-1 to Gemini without explicit user ask — the Anthropic dependency is already paid for in the demo and switching is a regression risk.
- **Agent bounds**: 4 tool round-trips, `maxOutputTokens: 1024` per turn, to stay under Vercel 30s hobby-plan timeout.
- **Tool schema source of truth**: `toolDeclarations` in `src/lib/agent-tools.ts` is typed `FunctionDeclaration[]` (from `@google/genai`). TypeScript needs the explicit cast or the heterogeneous object literal trips TS2322.
- **Leaflet coord order gotcha**: OSRM GeoJSON returns `[lng, lat]`. Always swap to `[lat, lng]` before passing to Leaflet.
- **FitBounds re-fit rule**: depend on a stable string signature (`route:<ids>:<len>` or `spots:<ids>`), NOT the raw coords array, or the map snaps back on every parent render.
- **Reservation provider label**: when the fallback Google search URL is used, `provider` must be `"google"` — not `"website"` — so the UI doesn't claim a direct website link that isn't one.
- **PlanPanel AbortController**: stored in a ref, aborted on unmount AND on the close button. Catch block must swallow `DOMException` with `name === "AbortError"` to avoid spurious toasts.
- **Spot compaction before sending to Gemini**: drops `note/tried/rating/videoUrl/collection` to save tokens; adds a derived `hasReservationSite: boolean` so the model knows when a real Resy/OpenTable URL exists without seeing the full URL.
- **`.env.local` is the only env file**. Next's default `.gitignore` already covers it via `.env*`.
- **API cost discipline (user directive)**: every paid call user-initiated; no background/polling; no API calls in tests or CI; use cheap-tier models only.
